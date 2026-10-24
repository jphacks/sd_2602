import { connectorConfig } from "../../account/service.js";
import { fetchEvents, CalendarError } from "./events.js";
import { toCalendarEvents } from "./adapter.js";
import { buildSchedule } from "../../../domain/schedule/schedule.js";
import { addDays, dateInTokyo, DAYS, TIMEZONE } from "../../../domain/schedule/dates.js";
import { DEFAULT_ACTIVITY_WINDOW } from "../../../domain/schedule/busyness.js";

export async function loadGoogleSchedule({
  connectorId,
  getConnection,
  now = new Date(),
  fetcher,
  log = () => {},
  requestId,
}) {
  const started = Date.now();
  const emit = (stage, extra = {}) =>
    log({ event: "google_schedule", request_id: requestId, stage, ...extra });
  try {
    const config = connectorConfig(connectorId);
    if (config.state !== "configured") return { state: config.state };
    emit("connection");
    let connection;
    try {
      connection = await getConnection(config.connectorId);
    } catch (error) {
      throw new CalendarError(
        error?.status === 404
          ? "CONNECTION_UNCONFIRMED"
          : "CONNECTOR_UNAVAILABLE",
      );
    }
    if (!connection?.accessToken)
      throw new CalendarError("CONNECTION_UNCONFIRMED");
    const today = dateInTokyo(now);
    const range = { startDate: today, endDateExclusive: addDays(today, DAYS) };
    const raw = await fetchEvents({
      accessToken: connection.accessToken,
      range,
      fetcher,
    });
    emit("fetched", { event_count: raw.length });
    const events = toCalendarEvents(raw);
    const input = {
      events,
      dates: Array.from({ length: DAYS }, (_, i) => addDays(today, i)),
      activityWindow: DEFAULT_ACTIVITY_WINDOW,
    };
    const schedule = buildSchedule(input, today);
    emit("completed", {
      event_count: events.length,
      candidate_count: schedule.candidates.length,
      duration_ms: Date.now() - started,
    });
    return {
      state: "ready",
      data: {
        ...schedule,
        today,
        range,
        activityWindow: DEFAULT_ACTIVITY_WINDOW,
        timezone: TIMEZONE,
        source: "google",
        googleStatus: "connected",
        generatedAt: now.toISOString(),
        calculationVersion: "daily-all-day-360-v1",
      },
    };
  } catch (error) {
    const code =
      error instanceof CalendarError ? error.code : "CALENDAR_LOAD_FAILED";
    emit("failed", { error_code: code, duration_ms: Date.now() - started });
    return { state: "failed", code };
  }
}
