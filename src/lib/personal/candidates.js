import { select } from "../modules/recommend.js";

export function recommendForDetails(daily, details, today, excludedDates = []) {
  const result = select(daily, { today, excludedDates, maxCandidates: 3 });
  return {
    ...result,
    candidates: result.candidates.map((candidate) => ({
      ...candidate,
      reasons: details.find((day) => day.date === candidate.date).allDayCount
        ? [
            "多忙度" + Math.round(candidate.busyRatio * 100) + "%",
            "終日予定あり・空き時間は要確認",
          ]
        : candidate.reasons,
    })),
  };
}
