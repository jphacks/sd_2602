import { addDays, DAYS, TIMEZONE } from "../../domain/schedule/dates.js";

// Fixed relative input, anchored by the caller's clock. No Google/API/DB access.
export function readPersonalFixture(seed, today) {
  if (seed.days.length !== DAYS) throw new Error("FIXTURE_RANGE_INVALID");
  const dates = Array.from({ length: DAYS }, (_, i) => addDays(today, i));
  const events = seed.days.flatMap((day, index) => {
    const date = dates[index];
    const common = {
      status: "confirmed",
      participation_status: "accepted",
      transparency: "opaque",
      event_type: "default",
    };
    const timed = (day.periods ?? []).map(([start, end], i) => ({
      ...common,
      kind: "timed",
      provider_event_id: "demo-" + index + "-" + i,
      starts_at: at(date, start),
      ends_at: at(date, end),
    }));
    return day.allDay
      ? [
          ...timed,
          {
            ...common,
            kind: "all_day",
            provider_event_id: "demo-all-" + index,
            start_date: date,
            end_date_exclusive: addDays(date, 1),
          },
        ]
      : timed;
  });
  return {
    dates,
    events,
    timezone: TIMEZONE,
    activityWindow: seed.activityWindow,
    range: { startDate: today, endDateExclusive: addDays(today, DAYS) },
  };
}

function at(date, minute) {
  return new Date(
    Date.parse(date + "T00:00:00+09:00") + minute * 60000,
  ).toISOString();
}
