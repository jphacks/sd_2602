export const TIMEZONE = "Asia/Tokyo";
export const OFFSET_MINUTES = 540;
export const DAYS = 31;

export function dateInTokyo(now) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type) => parts.find((p) => p.type === type).value;
  return value("year") + "-" + value("month") + "-" + value("day");
}

export function addDays(date, offset) {
  const value = new Date(date + "T00:00:00Z");
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

export function dateLabel(date) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: TIMEZONE,
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(date + "T00:00:00+09:00"));
}

export function clock(minute) {
  return (
    String(Math.floor(minute / 60)).padStart(2, "0") +
    ":" +
    String(minute % 60).padStart(2, "0")
  );
}
