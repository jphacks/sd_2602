import { candidateBubble, moreBubble } from "./presentation.js";
function label(date) {
  const formatted = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date(date + "T00:00:00+09:00"));
  return formatted.replace(/(\d+)\/(\d+)/, "$1月$2日");
}
function busy(day) {
  const periods = day.periods
    .slice()
    .sort((a, b) => a.startMinute - b.startMinute);
  if (!periods.length) return "活動時間内の予定なし";
  const clock = (m) =>
    String(Math.floor(m / 60)).padStart(2, "0") +
    ":" +
    String(m % 60).padStart(2, "0");
  return (
    clock(periods[0].startMinute) +
    "〜" +
    clock(periods[0].endMinute) +
    " 予定あり" +
    (periods.length > 1 ? "、など" : "")
  );
}
export function buildPreparedMessages(
  record,
  { imageUrl, webUrl, now = new Date() },
) {
  if (
    record?.state !== "ready" ||
    record.version !== record.share?.version ||
    record.image?.version !== record.version ||
    Date.parse(record.expiresAt) <= now.getTime() ||
    !Number.isFinite(Date.parse(record.expiresAt))
  )
    return [
      {
        type: "text",
        text: "【テスト】カードが未準備、または有効期限を過ぎています。更新が必要です。",
      },
    ];
  for (const value of [imageUrl, webUrl])
    if (new URL(value).protocol !== "https:")
      throw new Error("CARD_URL_INVALID");
  const candidates = record.share.candidates
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  if (candidates.length > 3) throw new Error("CARD_CANDIDATES_INVALID");
  if (!candidates.length)
    return [{ type: "text", text: "【テスト】条件に合う候補日がありません。" }];
  return [{type:'flex',altText:'日程候補'+candidates.length+'件（デモ・未確定）',contents:{type:'carousel',contents:[
    ...candidates.map(c=>candidateBubble({imageUrl,aspectRatio:record.image.width+':'+record.image.height,dateLabel:label(c.date),self:busy(c.self),other:busy(c.other)})),
    moreBubble(webUrl)
  ]}}];
}
