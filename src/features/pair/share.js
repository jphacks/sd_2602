import { clock, dateLabel } from "../../domain/schedule/dates.js";
// This is the only DTO exposed by the pair fixture endpoint.
export function buildShare(
  self,
  other,
  { today, window, dates, version, generatedAt },
) {
  const allowed = new Set(dates);
  const summary = (day) => ({ busyRatio: day.busyRatio });
  const detail = (day) => ({
    periods: day.periods.map((p) => ({
      startMinute: p.startMinute,
      endMinute: p.endMinute,
    })),
    allDay: day.allDayCount > 0,
  });
  return {
    version,
    generatedAt,
    today,
    source: "test",
    activityWindow: window,
    days: self.map((day) => ({
      date: day.date,
      self: summary(day),
      other: summary(other.find((d) => d.date === day.date)),
    })),
    candidates: self
      .filter((day) => allowed.has(day.date))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((day) => ({
        date: day.date,
        self: detail(day),
        other: detail(other.find((d) => d.date === day.date)),
      })),
  };
}
export function shortSchedule(day) {
  const periods = day.periods
    .slice()
    .sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);
  if (day.allDay) return "終日予定あり" + (periods.length ? "、など" : "");
  if (!periods.length) return "活動時間内の予定なし";
  const first = periods[0];
  return (
    clock(first.startMinute) +
    "〜" +
    clock(first.endMinute) +
    " 予定あり" +
    (periods.length > 1 ? "、など" : "")
  );
}
export function shareMessage(
  share,
  selectedDates = share.candidates.map((c) => c.date),
) {
  const selected = new Set(selectedDates);
  const days = share.candidates
    .filter((c) => selected.has(c.date))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  return [
    "日程の調整をお願いします。以下の候補日はいかがでしょうか。",
    "※候補の提案であり、確定ではありません。",
    "",
    ...days.flatMap((c) => [
      dateLabel(c.date),
      "自分：" + shortSchedule(c.self),
      "相手：" + shortSchedule(c.other),
      "",
    ]),
  ]
    .join("\n")
    .trim();
}

// A selection is a subset of the server-approved candidates, never arbitrary dates.
export function selectShare(share, dates) {
  const selected = new Set(dates);
  return {
    ...share,
    candidates: share.candidates
      .filter((c) => selected.has(c.date))
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}
