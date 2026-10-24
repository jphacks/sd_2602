import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  calculateDaily,
  calculateHourly,
} from "../src/domain/schedule/busyness.js";
import { normalize } from "../src/domain/schedule/normalize.js";
import { select } from "../src/domain/schedule/recommend.js";
import { readPersonalFixture } from "../src/lib/adapters/personal-mock.js";
import { buildSchedule } from "../src/domain/schedule/schedule.js";
import { dateInTokyo, addDays, DAYS } from "../src/domain/schedule/dates.js";
import { candidateMessage } from "../src/domain/schedule/message.js";
import { loadPersonalDemo } from "../src/features/personal/server/service.js";

const seed = JSON.parse(
  readFileSync(new URL("../src/mock/personal.json", import.meta.url), "utf8"),
);
const today = "2026-10-18";
const window = { startMinute: 540, endMinute: 1320 };
const options = { dates: [today], offsetMinutes: 540, activityWindow: window };
const common = { status: "confirmed", participation_status: "accepted" };
const allDay = (id = "all") => ({
  ...common,
  kind: "all_day",
  provider_event_id: id,
  start_date: today,
  end_date_exclusive: "2026-10-19",
});
const timed = (start, end, id = "timed") => ({
  ...common,
  kind: "timed",
  provider_event_id: id,
  starts_at: start,
  ends_at: end,
});
const normalized = (raw) => normalize(raw).events;

test("Tokyo date, leap day and the 31-day exclusive range are deterministic", () => {
  assert.equal(dateInTokyo(new Date("2026-10-17T15:01:00Z")), today);
  assert.equal(dateInTokyo(new Date("2026-10-17T14:59:00Z")), "2026-10-17");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  const fixture = readPersonalFixture(seed, "2026-12-20");
  assert.equal(fixture.dates.length, DAYS);
  assert.equal(new Set(fixture.dates).size, DAYS);
  assert.equal(fixture.dates.at(-1), "2027-01-19");
  assert.equal(fixture.range.endDateExclusive, "2027-01-20");
});

test("multiple all-day events count once as six hours and do not occupy hourly slots", () => {
  const events = normalized([allDay("a"), allDay("b")]);
  assert.equal(calculateDaily(events, options)[0].busyMinutes, 360);
  assert.ok(
    calculateHourly(events, options).every((row) => row.busyMinutes === 0),
  );
});

test("all-day equivalent plus merged timed intervals is capped by activity minutes", () => {
  const events = normalized([
    allDay(),
    timed(today + "T10:00:00+09:00", today + "T13:00:00+09:00"),
    timed(today + "T12:00:00+09:00", today + "T14:00:00+09:00", "overlap"),
  ]);
  assert.equal(calculateDaily(events, options)[0].busyMinutes, 600);
  assert.equal(
    calculateDaily(events, {
      ...options,
      activityWindow: { startMinute: 600, endMinute: 720 },
    })[0].busyMinutes,
    120,
  );
  assert.equal(
    calculateDaily(normalized([allDay()]), {
      ...options,
      dates: ["2026-10-19"],
    })[0].busyMinutes,
    0,
  );
});

test("cancelled, transparent, declined and working-location events do not consume time", () => {
  const raw = ["cancelled", "transparent", "declined", "workingLocation"].map(
    (kind, i) => ({
      ...allDay("ignored-" + i),
      ...(kind === "cancelled"
        ? { status: kind }
        : kind === "transparent"
          ? { transparency: kind }
          : kind === "declined"
            ? { participation_status: kind }
            : { event_type: kind }),
    }),
  );
  assert.equal(calculateDaily(normalized(raw), options)[0].busyMinutes, 0);
});

test("cross-midnight events are clipped and midnight end does not leak into next day", () => {
  const events = normalized([
    timed("2026-10-17T23:00:00+09:00", today + "T10:00:00+09:00"),
  ]);
  assert.equal(calculateDaily(events, options)[0].busyMinutes, 60);
  const ended = normalized([
    timed("2026-10-17T23:00:00+09:00", today + "T00:00:00+09:00"),
  ]);
  assert.equal(calculateDaily(ended, options)[0].busyMinutes, 0);
});

test("recommendation excludes today, past, explicit exclusions and fully busy days; ties use nearer dates", () => {
  const rows = [
    "2026-10-17",
    today,
    "2026-10-19",
    "2026-10-20",
    "2026-10-21",
    "2026-10-22",
    "2026-10-23",
    "2026-10-24",
  ].map((date) => ({
    date,
    activeMinutes: 780,
    busyMinutes: date === "2026-10-20" ? 780 : 0,
    busyRatio: date === "2026-10-20" ? 1 : 0,
  }));
  const result = select(rows.reverse(), {
    today,
    excludedDates: ["2026-10-19"],
  });
  assert.deepEqual(
    result.candidates.map((c) => c.date),
    ["2026-10-21", "2026-10-22", "2026-10-23"],
  );
  assert.equal(
    select(rows, { today, excludedDates: rows.map((r) => r.date) })
      .candidateState,
    "empty",
  );
});

test("monthly summary, daily detail and hourly data are computed from the same events", () => {
  const fixture = readPersonalFixture(seed, today);
  const result = buildSchedule(fixture, today);
  assert.equal(result.daily.length, 31);
  for (const day of result.details) {
    const summary = result.daily.find((d) => d.date === day.date);
    assert.equal(summary.busyMinutes, day.busyMinutes);
    assert.equal(day.slots.length, 13);
    const timedMinutes = day.slots.reduce(
      (total, slot) => total + slot.busyMinutes,
      0,
    );
    assert.equal(
      day.busyMinutes,
      Math.min(day.activeMinutes, timedMinutes + (day.allDayCount ? 360 : 0)),
    );
  }
});

test("solo excludes all-day dates from candidates without changing daily busyness", () => {
  const fixture = readPersonalFixture(seed, today);
  const input = {
    ...fixture,
    events: [
      {
        ...allDay(),
        start_date: "2026-10-19",
        end_date_exclusive: "2026-10-20",
      },
    ],
    dates: ["2026-10-19"],
  };
  const result = buildSchedule(input, today);
  assert.deepEqual(result.candidates, []);
  assert.equal(result.daily[0].busyMinutes, 360);
});

test("demo reports its source honestly and logs only bounded metadata, without writing or fetching", () => {
  const entries = [];
  const result = loadPersonalDemo({
    seed,
    now: new Date("2026-10-18T03:00:00Z"),
    requestId: "test-id",
    log: (entry) => entries.push(entry),
  });
  assert.equal(result.source, "test");
  assert.equal(result.googleStatus, "planned");
  assert.equal(result.today, today);
  assert.equal(result.details.length, 31);
  assert.ok(
    entries.every(
      (entry) =>
        entry.request_id === "test-id" && entry.execution_mode === "mock",
    ),
  );
  assert.ok(
    entries.every(
      (entry) =>
        !("events" in entry) && !("owner_id" in entry) && !("token" in entry),
    ),
  );
});

test("fixture failure is not returned as an empty successful calendar", () => {
  const entries = [];
  assert.throws(
    () =>
      loadPersonalDemo({
        seed: { days: [] },
        now: new Date(),
        requestId: "bad",
        log: (entry) => entries.push(entry),
      }),
    /再試行/,
  );
  assert.equal(entries.at(-1).error_code, "DEMO_LOAD_FAILED");
  assert.ok(
    !entries.some((entry) => entry.event === "personal_demo_completed"),
  );
});

test("proposal is ordered without mutating selection and states it is not confirmed", () => {
  const selected = ["2026-10-23", "2026-10-20"];
  const message = candidateMessage(selected);
  assert.ok(message.indexOf("10月20日") < message.indexOf("10月23日"));
  assert.match(message, /確定ではありません/);
  assert.deepEqual(selected, ["2026-10-23", "2026-10-20"]);
});
