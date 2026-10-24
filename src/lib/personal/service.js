import { readPersonalFixture } from "../adapters/personal-mock.js";
import { buildSchedule } from "../../domain/schedule/schedule.js";
import { dateInTokyo, TIMEZONE } from "../../domain/schedule/dates.js";

export function loadPersonalDemo({ seed, now, requestId, log }) {
  const emit = (event, extra = {}) =>
    log({ event, request_id: requestId, execution_mode: "mock", ...extra });
  try {
    emit("personal_demo_started");
    const today = dateInTokyo(now);
    const input = readPersonalFixture(seed, today);
    emit("fixture_loaded", {
      day_count: input.dates.length,
      event_count: input.events.length,
    });
    const schedule = buildSchedule(input, today);
    emit("personal_demo_completed", {
      candidate_count: schedule.candidates.length,
    });
    return {
      ...schedule,
      today,
      range: input.range,
      activityWindow: input.activityWindow,
      timezone: TIMEZONE,
      source: "test",
      googleStatus: "planned",
      generatedAt: now.toISOString(),
      calculationVersion: "daily-all-day-360-v1",
    };
  } catch {
    emit("personal_demo_failed", { error_code: "DEMO_LOAD_FAILED" });
    throw new Error("テストデータを読み込めませんでした。再試行してください。");
  }
}
