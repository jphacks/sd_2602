import test from "node:test";
import assert from "node:assert/strict";
import { fetchEvents } from "../src/lib/google/events.js";
import { toCalendarEvents } from "../src/lib/google/adapter.js";
import { loadGoogleSchedule } from "../src/lib/google/service.js";
const range = { startDate: "2026-10-18", endDateExclusive: "2026-11-18" };
const now = new Date("2026-10-18T03:00:00Z");
const timed = (id, extra = {}) => ({
  id,
  status: "confirmed",
  organizer: { self: true },
  start: { dateTime: "2026-10-19T10:00:00+09:00" },
  end: { dateTime: "2026-10-19T11:00:00+09:00" },
  ...extra,
});
const ok = (body) => ({ ok: true, json: async () => body });
test("Google transport follows all pages and requests only needed fields", async () => {
  const calls = [];
  const result = await fetchEvents({
    accessToken: "private-token",
    range,
    fetcher: async (url, options) => {
      calls.push(url);
      assert.equal(options.headers.Authorization, "Bearer private-token");
      assert.equal(url.origin, "https://www.googleapis.com");
      assert.equal(url.searchParams.get("singleEvents"), "true");
      assert.equal(
        url.searchParams.get("timeMax"),
        "2026-11-18T00:00:00+09:00",
      );
      assert.ok(!url.searchParams.get("fields").includes("summary"));
      return ok(
        calls.length === 1
          ? { items: [], nextPageToken: "second" }
          : { items: [timed("x")] },
      );
    },
  });
  assert.equal(calls[1].searchParams.get("pageToken"), "second");
  assert.equal(result.length, 1);
});
test("transport rejects errors, loops, malformed pages and exhausted limits", async () => {
  for (const [status, code] of [
    [401, "GOOGLE_RECONNECT"],
    [403, "GOOGLE_FORBIDDEN"],
    [429, "GOOGLE_RATE_LIMIT"],
    [500, "GOOGLE_UNAVAILABLE"],
  ]) {
    await assert.rejects(
      fetchEvents({
        accessToken: "x",
        range,
        fetcher: async () => ({ ok: false, status }),
      }),
      { code },
    );
  }
  await assert.rejects(
    fetchEvents({
      range,
      fetcher: async () => {
        throw Error("secret");
      },
    }),
    { code: "GOOGLE_NETWORK" },
  );
  await assert.rejects(
    fetchEvents({ range, fetcher: async () => ok({ items: {} }) }),
    { code: "GOOGLE_RESPONSE_INVALID" },
  );
  await assert.rejects(
    fetchEvents({ range, fetcher: async () => ok({ nextPageToken: "same" }) }),
    { code: "GOOGLE_RESPONSE_INVALID" },
  );
  let n = 0;
  await assert.rejects(
    fetchEvents({
      range,
      fetcher: async () => ok({ nextPageToken: String(++n) }),
    }),
    { code: "GOOGLE_READ_LIMIT" },
  );
});
test("adapter handles cancellations, duplicates, all-day and attendance without retaining text", () => {
  const events = toCalendarEvents([
    timed("a", { summary: "private" }),
    timed("a"),
    { id: "cancel", status: "cancelled" },
    timed("b", { attendees: [{ self: true, responseStatus: "declined" }] }),
    timed("c", { organizer: { self: false } }),
    timed("d", { start: { date: "2026-10-20" }, end: { date: "2026-10-22" } }),
  ]);
  assert.equal(events.length, 4);
  assert.equal(events[0].participation_status, "accepted");
  assert.equal(events[1].participation_status, "declined");
  assert.equal(events[2].participation_status, "needsAction");
  assert.equal(events[3].end_date_exclusive, "2026-10-22");
  assert.ok(!JSON.stringify(events).includes("private"));
  for (const item of [
    timed("x", { start: { dateTime: "2026-10-19T10:00:00" } }),
    timed("x", { start: { date: "2026-02-30" }, end: { date: "2026-03-03" } }),
  ])
    assert.throws(() => toCalendarEvents([item]), {
      code: "GOOGLE_EVENT_INVALID",
    });
});
test("service passes Google events into shared daily, detail and candidate calculations", async () => {
  const logs = [];
  const result = await loadGoogleSchedule({
    connectorId: "connector",
    getConnection: async () => ({ accessToken: "private-token" }),
    now,
    log: (e) => logs.push(e),
    fetcher: async () =>
      ok({
        items: [
          timed("a"),
          timed("declined", {
            attendees: [{ self: true, responseStatus: "declined" }],
          }),
          timed("all", {
            start: { date: "2026-10-20" },
            end: { date: "2026-10-21" },
          }),
          timed("midnight", {
            start: { dateTime: "2026-10-20T21:00:00Z" },
            end: { dateTime: "2026-10-21T01:00:00Z" },
          }),
        ],
      }),
  });
  assert.equal(result.state, "ready");
  assert.equal(result.data.daily.length, 31);
  assert.equal(
    result.data.daily.find((d) => d.date === "2026-10-19").busyMinutes,
    60,
  );
  assert.equal(
    result.data.daily.find((d) => d.date === "2026-10-20").busyMinutes,
    360,
  );
  assert.equal(
    result.data.daily.find((d) => d.date === "2026-10-21").busyMinutes,
    60,
  );
  assert.ok(!result.data.candidates.some((d) => d.date === "2026-10-20"));
  assert.equal(
    result.data.details.find((d) => d.date === "2026-10-19").periods.length,
    1,
  );
  assert.ok(!JSON.stringify({ result, logs }).includes("private-token"));
});
test("configuration prevents calls; page failure yields no partial schedule", async () => {
  let called = false;
  assert.deepEqual(
    await loadGoogleSchedule({
      getConnection: () => {
        called = true;
      },
    }),
    { state: "configuration_missing" },
  );
  assert.equal(called, false);
  let page = 0;
  const result = await loadGoogleSchedule({
    connectorId: "connector",
    getConnection: async () => ({ accessToken: "x" }),
    now,
    fetcher: async () =>
      ++page === 1
        ? ok({ items: [timed("a")], nextPageToken: "p" })
        : { ok: false, status: 503 },
  });
  assert.deepEqual(result, { state: "failed", code: "GOOGLE_UNAVAILABLE" });
  assert.deepEqual(
    await loadGoogleSchedule({
      connectorId: "connector",
      getConnection: async () => {
        throw { status: 404 };
      },
    }),
    { state: "failed", code: "CONNECTION_UNCONFIRMED" },
  );
});
