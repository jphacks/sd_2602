import { randomUUID } from 'node:crypto';
import { card, confirmCard, text } from './cards.js';

export const emptyState = () => ({ schemaVersion: 1, sessions: {}, active: {}, events: {} });
const commands = new Set(['日程調整', '集計', '使い方']);
export function relevant(event) {
  return event?.type === 'join' || event?.type === 'follow' ||
    (event?.type === 'postback' && typeof event.postback?.data === 'string') ||
    (event?.type === 'message' && event.message?.type === 'text' && commands.has(event.message.text?.trim()));
}

export function demoDates(now, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now).map(p => [p.type, p.value]));
  const date = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
  return [1, 2, 3].map(offset => new Date(date.getTime() + offset * 86400000).toISOString().slice(0, 10));
}

const help = () => [text('グループで「日程調整」と送ると、検証用の候補3日を表示します。\n作成者は参加者1として登録されます。他の人は「参加する」→各日の○△×で回答してください。\n「集計」で最新状態を確認できます。回答はグループに共有されます。最大4人・1グループ1調整です。\nカレンダー連携は未実装です。')];
function eligible(session, date) {
  return session.members.length >= 2 && session.members.every(id => ['yes', 'maybe'].includes(session.votes[id]?.[date]));
}
function expire(session, now) {
  if (session.status === 'open' && Date.parse(session.expiresAt) <= now.getTime()) session.status = 'expired';
}

/** Pure synchronous state transition; storage and LINE delivery live outside this module. */
export function transition(state, event, { now = new Date(), timeZone = 'Asia/Tokyo', id = randomUUID } = {}) {
  if (event.type === 'join' || event.type === 'follow') return help();
  if (event.source?.type !== 'group') return [text('この検証版はグループ用です。Botを検証用グループへ招待し、「日程調整」と送ってください。')];
  const groupId = event.source.groupId;
  const userId = event.source.userId;
  if (!groupId || !userId) return [text('操作した人を識別できないため、回答を保存できません。')];
  const command = event.message?.type === 'text' ? event.message.text.trim() : null;
  if (command === '使い方') return help();
  if (command === '日程調整' || command === '集計') {
    let session = state.sessions[state.active[groupId]];
    if (session) expire(session, now);
    if (command === '集計') return session ? [card(session, userId)] : [text('調整はまだありません。「日程調整」と送ってください。')];
    if (session?.status === 'open') return [text('進行中の調整があります。続けて回答してください。'), card(session, userId)];
    session = {
      id: id(), groupId, ownerId: userId, members: [userId], dates: demoDates(now, timeZone),
      votes: {}, status: 'open', revision: 0, createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 24 * 3600000).toISOString()
    };
    state.sessions[session.id] = session;
    state.active[groupId] = session.id;
    return [card(session, userId)];
  }
  if (event.type !== 'postback') return [];
  const params = new URLSearchParams(event.postback.data);
  const session = state.sessions[params.get('s')];
  if (!session || session.groupId !== groupId) return [text('このグループの調整として確認できません。')];
  expire(session, now);
  if (session.status !== 'open') return [text(`この調整は${{ confirmed: '確定済み', cancelled: '終了済み', expired: '期限切れ' }[session.status]}です。「日程調整」で新しく始められます。`)];
  const op = params.get('op');
  const date = params.get('date');
  if (op === 'summary') return [card(session, userId)];
  if (op === 'join') {
    if (!session.members.includes(userId)) {
      if (session.members.length >= 4) return [text('この検証版は登録参加者4人までです。')];
      session.members.push(userId);
      session.revision++;
    }
    return [card(session, userId)];
  }
  if (op === 'vote') {
    if (!session.members.includes(userId)) return [text('先に「参加する」を押してください。')];
    const value = params.get('value');
    if (!session.dates.includes(date) || !['yes', 'maybe', 'no'].includes(value)) return [text('回答の内容が無効です。「集計」から操作し直してください。')];
    session.votes[userId] ??= {};
    if (session.votes[userId][date] !== value) {
      session.votes[userId][date] = value;
      session.revision++;
    }
    return [text('回答を保存しました。以下が最新の集計です。'), card(session, userId)];
  }
  if (!['preview', 'confirm', 'cancel'].includes(op)) return [text('この操作には対応していません。')];
  if (userId !== session.ownerId) return [text('確定・終了できるのは調整の作成者だけです。')];
  if (op === 'cancel') {
    session.status = 'cancelled';
    session.revision++;
    return [text('この調整を終了しました。「日程調整」で新しく始められます。')];
  }
  if (!session.dates.includes(date)) return [text('候補にない日付です。')];
  if (!eligible(session, date)) return [text('確定には登録参加者が2人以上で、その日の全登録参加者の回答が○または△である必要があります。'), card(session, userId)];
  if (op === 'preview') return [confirmCard(session, date)];
  if (params.get('rev') !== String(session.revision)) return [text('確認後に参加者か回答が変わりました。最新の集計から確定内容を確認し直してください。'), card(session, userId)];
  session.status = 'confirmed';
  session.confirmedDate = date;
  session.revision++;
  return [card(session, userId)];
}
