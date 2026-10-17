const labels = { yes: '○', maybe: '△', no: '×' };
export const text = value => ({ type: 'text', text: value });
const action = (session, op, extra = {}) => new URLSearchParams({ s: session.id, op, ...extra }).toString();
const button = (label, data) => ({
  type: 'button', height: 'sm', action: { type: 'postback', label, data }
});
const paragraph = (value, extra = {}) => ({ type: 'text', text: value, wrap: true, size: 'sm', ...extra });

export function summary(session) {
  return session.dates.map(date => {
    const answers = session.members.map((id, i) => `参加者${i + 1}:${labels[session.votes[id]?.[date]] ?? '未回答'}`);
    return `${date}\n${answers.join(' / ')}`;
  }).join('\n\n');
}

export function card(session, userId) {
  const member = session.members.indexOf(userId);
  const closed = session.status !== 'open';
  const contents = [
    paragraph(({ confirmed: '日程が確定しました', cancelled: '終了した調整です', expired: '期限切れの調整です' })[session.status] || '候補日を相談しましょう', { weight: 'bold', size: 'lg' }),
    paragraph(`調整ID: ${session.id.slice(0, 8)}・登録参加者${session.members.length}/4人`),
    paragraph('動作検証用の候補です。カレンダーの空き状況とは連携していません。', { color: '#777777' }),
    paragraph(member >= 0 ? `今回の操作：参加者${member + 1}（この表示はグループ共有）` : '「参加する」を押すと回答できます。'),
    paragraph('回答と集計はグループ全員に共有されます。古いカードの表示は更新されません。')
  ];
  if (session.status === 'confirmed') contents.push(paragraph(`確定日：${session.confirmedDate}`, { weight: 'bold' }));
  for (const date of session.dates) {
    contents.push({ type: 'separator', margin: 'md' });
    contents.push(paragraph(date, { weight: 'bold' }));
    contents.push(paragraph(session.members.map((id, i) => `参加者${i + 1} ${labels[session.votes[id]?.[date]] ?? '未回答'}`).join(' / ')));
    if (!closed) {
      contents.push({ type: 'box', layout: 'horizontal', contents: Object.entries(labels).map(([value, label]) =>
        button(label, action(session, 'vote', { date, value }))
      ) });
      if (userId === session.ownerId) contents.push(button('この日の確定内容を確認', action(session, 'preview', { date })));
    }
  }
  if (!closed) {
    contents.push(button('参加する', action(session, 'join')));
    contents.push(button('最新の集計を表示', action(session, 'summary')));
    if (userId === session.ownerId) contents.push(button('この調整を終了する', action(session, 'cancel')));
  }
  return {
    type: 'flex', altText: `${session.status === 'confirmed' ? '確定日：' + session.confirmedDate : '候補日と回答状況'}\n${summary(session)}`,
    contents: { type: 'bubble', size: 'mega', body: { type: 'box', layout: 'vertical', spacing: 'sm', contents } }
  };
}

export function confirmCard(session, date) {
  return {
    type: 'flex', altText: `確定前の確認：${date}`,
    contents: { type: 'bubble', body: { type: 'box', layout: 'vertical', spacing: 'md', contents: [
      paragraph('まだ確定していません', { weight: 'bold', size: 'lg' }),
      paragraph(`${date}で確定しますか？\n対象は登録参加者${session.members.length}人です。未参加のグループメンバーは含みません。`),
      paragraph(summary(session)),
      button('この日で確定する', action(session, 'confirm', { date, rev: String(session.revision) })),
      button('戻って集計を表示', action(session, 'summary'))
    ] } }
  };
}
