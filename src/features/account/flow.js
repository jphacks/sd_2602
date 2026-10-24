export const CALENDAR_FLOW_KEY = "risuke-calendar-connect";
const TTL = 10 * 60 * 1000;
export function pendingCalendar(storage, now = Date.now()) {
  try {
    const raw = storage.getItem(CALENDAR_FLOW_KEY);
    if (!raw) return false;
    const value = JSON.parse(raw);
    const valid =
      value?.target === "/account" &&
      Number.isFinite(value.startedAt) &&
      now >= value.startedAt &&
      now - value.startedAt < TTL;
    if (!valid) storage.removeItem(CALENDAR_FLOW_KEY);
    return valid;
  } catch {
    return false;
  }
}
export function clearCalendarFlow(storage) {
  try {
    storage.removeItem(CALENDAR_FLOW_KEY);
  } catch {
    /* Storage is optional, never authentication proof. */
  }
}
export async function startCalendarConnection({
  connectorId,
  connect,
  storage,
  redirect,
  now = Date.now(),
}) {
  const destination = await connect(connectorId);
  const url = new URL(destination);
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error("INVALID_OAUTH_URL");
  try {
    storage.setItem(
      CALENDAR_FLOW_KEY,
      JSON.stringify({ target: "/account", startedAt: now }),
    );
  } catch {
    /* Default provider return still works without storage. */
  }
  redirect(url.href);
}
