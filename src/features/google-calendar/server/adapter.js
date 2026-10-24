import { CalendarError } from "./events.js";
// Discard provider text and identity fields before entering the shared logic.
export function toCalendarEvents(items) {
  const result = [],
    seen = new Set();
  for (const item of items) {
    if (!item || typeof item !== "object")
      throw new CalendarError("GOOGLE_EVENT_INVALID");
    if (item.status === "cancelled") continue;
    if (
      typeof item.id !== "string" ||
      !item.id ||
      !["confirmed", "tentative"].includes(item.status)
    )
      throw new CalendarError("GOOGLE_EVENT_INVALID");
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const self = item.attendees?.find((a) => a.self === true);
    const common = {
      provider_event_id: item.id,
      status: item.status,
      participation_status: self
        ? (self.responseStatus ?? "needsAction")
        : item.organizer?.self === true
          ? "accepted"
          : "needsAction",
      event_type: item.eventType ?? "default",
      transparency: item.transparency ?? "opaque",
    };
    const start = item.start,
      end = item.end;
    if (
      validDate(start?.date) &&
      validDate(end?.date) &&
      start.date < end.date
    ) {
      result.push({
        ...common,
        kind: "all_day",
        start_date: start.date,
        end_date_exclusive: end.date,
      });
    } else if (
      validTime(start?.dateTime) &&
      validTime(end?.dateTime) &&
      Date.parse(start.dateTime) < Date.parse(end.dateTime)
    ) {
      result.push({
        ...common,
        kind: "timed",
        starts_at: start.dateTime,
        ends_at: end.dateTime,
      });
    } else throw new CalendarError("GOOGLE_EVENT_INVALID");
  }
  return result;
}
function validDate(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
function validTime(value) {
  return (
    typeof value === "string" &&
    /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}
