import { normalize } from "../modules/normalize.js";
import {
  calculateDaily,
  calculateHourly,
  isBusy,
} from "../modules/busyness.js";
import { recommendForDetails } from "./candidates.js";
import { OFFSET_MINUTES } from "./dates.js";

export function buildSchedule(input, today, excludedDates = []) {
  const { events, stats } = normalize(input.events);
  if (stats.excluded) throw new Error("FIXTURE_INPUT_INVALID");
  const options = {
    dates: input.dates,
    offsetMinutes: OFFSET_MINUTES,
    activityWindow: input.activityWindow,
  };
  const daily = calculateDaily(events, options);
  const hourly = calculateHourly(events, options);
  const details = daily.map((day) =>
    detailFor(day, events, hourly, input.activityWindow),
  );
  return {
    ...recommendForDetails(
      daily,
      details,
      today,
      excludedDates,
      input.activityWindow,
    ),
    daily,
    details,
  };
}

function detailFor(day, events, hourly, window) {
  const midnight = Date.parse(day.date + "T00:00:00+09:00");
  const relevant = events.filter(isBusy);
  const allDayCount = relevant.filter(
    (e) =>
      e.isAllDay && e.startDate <= day.date && day.date < e.endDateExclusive,
  ).length;
  const periods = relevant
    .filter(
      (e) =>
        !e.isAllDay &&
        e.startsAtMs < midnight + window.endMinute * 60000 &&
        e.endsAtMs > midnight + window.startMinute * 60000,
    )
    .map((e) => ({
      startMinute: Math.max(
        window.startMinute,
        (e.startsAtMs - midnight) / 60000,
      ),
      endMinute: Math.min(window.endMinute, (e.endsAtMs - midnight) / 60000),
    }))
    .sort((a, b) => a.startMinute - b.startMinute);
  return {
    ...day,
    allDayCount,
    periods,
    slots: hourly.filter((h) => h.slotStart.startsWith(day.date + "T")),
  };
}
