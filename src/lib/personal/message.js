import { dateLabel } from "./dates.js";

export function candidateMessage(dates) {
  return [
    "日程の調整をお願いできますでしょうか。以下の候補日でご都合の良い時間帯をお知らせください。",
    "※候補の提案であり、確定ではありません。終日予定のある日は時間帯の確認が必要です。",
    "",
    "【候補日】",
    ...dates
      .slice()
      .sort()
      .map((date) => "・" + dateLabel(date)),
  ].join(String.fromCharCode(10));
}
