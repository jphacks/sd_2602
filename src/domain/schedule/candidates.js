import { selectPair } from "./pair-selection.js";
// Solo and pair use the same union/gap ranking; never expose the numeric score.
export function recommendForDetails(
  daily,
  details,
  today,
  excludedDates = [],
  window = { startMinute: 540, endMinute: 1320 },
) {
  const empty = details.map((d) => ({ ...d, allDayCount: 0, periods: [] }));
  const dates = selectPair(details, empty, { today, excludedDates, window });
  const candidates = dates.map((date) => ({
    date,
    busyRatio: daily.find((d) => d.date === date).busyRatio,
    reasons: ["活動時間内に連続した空きあり"],
  }));
  return { candidateState: candidates.length ? "valid" : "empty", candidates };
}
