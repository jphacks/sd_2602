function label(date) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date(date + "T00:00:00+09:00"));
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
function text(value, size = "sm") {
  return { type: "text", text: value, size, wrap: true };
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
  const contents = candidates.map((c) => ({
    type: "box",
    layout: "vertical",
    spacing: "xs",
    contents: [
      text(label(c.date), "md"),
      text("A：" + busy(c.self)),
      text("B：" + busy(c.other)),
    ],
  }));
  const stamp = (v) =>
    new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(v));
  return [
    {
      type: "text",
      text:
        "【架空データの動作デモ】予定取得時刻（日本時間） A：" +
        stamp(record.selfFetchedAt) +
        "／B：" +
        stamp(record.otherFetchedAt),
    },
    {
      type: "flex",
      altText: "【テスト】日程候補" + candidates.length + "件",
      contents: {
        type: "bubble",
        size: "mega",
        hero: {
          type: "image",
          url: imageUrl,
          size: "full",
          aspectRatio: "732:" + record.image.height,
          aspectMode: "fit",
        },
        body: { type: "box", layout: "vertical", spacing: "md", contents },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              style: "primary",
              color: "#317747",
              action: {
                type: "uri",
                label: "同じ結果をWebで見る",
                uri: webUrl,
              },
            },
          ],
        },
      },
    },
  ];
}
