import { loadGoogleSchedule } from "./service.js";
import { readPersonalFixture } from "../adapters/personal-mock.js";
import { dateInTokyo } from "../../domain/schedule/dates.js";

// Fixed fixture only. This module has no real connector, secret, fetch or DB call.
export async function loadGooglePreview({
  seed,
  scenario,
  now,
  log = () => {},
  requestId,
}) {
  if (!["success", "empty", "failure"].includes(scenario))
    throw new Error("PREVIEW_SCENARIO_INVALID");
  const input = readPersonalFixture(seed, dateInTokyo(now));
  const items = input.events.map((e) => ({
    id: e.provider_event_id,
    status: e.status,
    eventType: e.event_type,
    transparency: e.transparency,
    organizer: { self: true },
    start:
      e.kind === "all_day" ? { date: e.start_date } : { dateTime: e.starts_at },
    end:
      e.kind === "all_day"
        ? { date: e.end_date_exclusive }
        : { dateTime: e.ends_at },
  }));
  const result = await loadGoogleSchedule({
    connectorId: "fixed-preview",
    getConnection: async () => ({ accessToken: "fixed-preview-not-a-token" }),
    now,
    log,
    requestId,
    fetcher: async (url) => {
      const second = url.searchParams.get("pageToken") === "second";
      if (second && scenario === "failure") return { ok: false, status: 503 };
      const body =
        scenario === "empty"
          ? { items: [] }
          : second
            ? { items: items.slice(10) }
            : { items: items.slice(0, 10), nextPageToken: "second" };
      return { ok: true, json: async () => body };
    },
  });
  return result.state === "ready"
    ? {
        ...result,
        data: {
          ...result.data,
          source: "google-preview",
          googleStatus: "simulated",
        },
      }
    : result;
}
