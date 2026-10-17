// M06 Recommender（recommend stage）
// 純関数：今日と除外日を候補から除き、多忙度が低い順、同点は近い日順で最大3件。

export const DEFAULT_MAX_CANDIDATES = 3;

export function select(daily, { today, excludedDates = [], maxCandidates = DEFAULT_MAX_CANDIDATES }) {
  const excluded = new Set(excludedDates);
  const eligible = daily
    .filter((d) => d.date > today && !excluded.has(d.date))
    .sort(byCalmnessThenCloseness);
  const candidates = eligible.slice(0, maxCandidates).map(toCandidate);
  return {
    candidateState: candidates.length > 0 ? "valid" : "empty",
    candidates,
  };
}

function byCalmnessThenCloseness(a, b) {
  if (a.busyRatio !== b.busyRatio) return a.busyRatio - b.busyRatio;
  return a.date < b.date ? -1 : 1;
}

function toCandidate(d) {
  const freeMinutes = d.activeMinutes - d.busyMinutes;
  return {
    date: d.date,
    busyRatio: d.busyRatio,
    reasons: [
      `多忙度${Math.round(d.busyRatio * 100)}%`,
      `活動時間内の空き${Math.floor(freeMinutes / 60)}時間${freeMinutes % 60}分`,
    ],
  };
}