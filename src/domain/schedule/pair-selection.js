// Server-side ranking. Only the date list crosses the display boundary.
export function mergePeriods(periods, window) {
  const sorted = periods
    .map((p) => ({
      startMinute: Math.max(window.startMinute, p.startMinute),
      endMinute: Math.min(window.endMinute, p.endMinute),
    }))
    .filter((p) => p.endMinute > p.startMinute)
    .sort((a, b) => a.startMinute - b.startMinute);
  return sorted.reduce((merged, p) => {
    const last = merged.at(-1);
    if (last && p.startMinute <= last.endMinute)
      last.endMinute = Math.max(last.endMinute, p.endMinute);
    else merged.push({ ...p });
    return merged;
  }, []);
}
export function freeTime(periods, window) {
  let cursor = window.startMinute,
    longest = 0,
    total = 0;
  for (const p of mergePeriods(periods, window)) {
    const gap = p.startMinute - cursor;
    longest = Math.max(longest, gap);
    total += gap;
    cursor = p.endMinute;
  }
  const tail = window.endMinute - cursor;
  return { longest: Math.max(longest, tail), total: total + tail };
}
export function selectPair(
  self,
  other,
  { today, window, maxCandidates = 3, excludedDates = [] },
) {
  const excluded = new Set(excludedDates);
  return self
    .flatMap((day) => {
      const partner = other.find((d) => d.date === day.date);
      if (
        !partner ||
        day.date <= today ||
        excluded.has(day.date) ||
        day.allDayCount ||
        partner.allDayCount
      )
        return [];
      const score = freeTime([...day.periods, ...partner.periods], window);
      return score.longest > 0 ? [{ date: day.date, ...score }] : [];
    })
    .sort(
      (a, b) =>
        b.longest - a.longest ||
        b.total - a.total ||
        a.date.localeCompare(b.date),
    )
    .slice(0, maxCandidates)
    .map((d) => d.date)
    .sort();
}
