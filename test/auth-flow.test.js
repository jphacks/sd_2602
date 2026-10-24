import test from "node:test";
import assert from "node:assert/strict";
import {
  CALENDAR_FLOW_KEY,
  pendingCalendar,
  clearCalendarFlow,
  startCalendarConnection,
} from "../src/features/account/flow.js";
function storage() {
  const values = new Map();
  return {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
  };
}
test("Calendar start uses connector ID and stores only expiring navigation metadata", async () => {
  const store = storage();
  let redirected;
  await startCalendarConnection({
    connectorId: "connector-id",
    connect: async (id) => {
      assert.equal(id, "connector-id");
      return "https://connectors.base44.com/authorize";
    },
    storage: store,
    redirect: (u) => {
      redirected = u;
    },
    now: 1000,
  });
  assert.equal(redirected, "https://connectors.base44.com/authorize");
  assert.equal(pendingCalendar(store, 1001), true);
  assert.deepEqual(JSON.parse(store.getItem(CALENDAR_FLOW_KEY)), {
    target: "/account",
    startedAt: 1000,
  });
  clearCalendarFlow(store);
  assert.equal(pendingCalendar(store, 1001), false);
});
test("invalid redirects and failed initiation never mark a successful flow", async () => {
  for (const url of [
    "http://example.com",
    "javascript:alert(1)",
    "https://user:password@example.com",
  ]) {
    const store = storage();
    await assert.rejects(
      startCalendarConnection({
        connect: async () => url,
        storage: store,
        redirect: () => assert.fail(),
      }),
    );
    assert.equal(store.getItem(CALENDAR_FLOW_KEY), null);
  }
  await assert.rejects(
    startCalendarConnection({
      connect: async () => {
        throw Error("failure");
      },
      storage: storage(),
      redirect: () => assert.fail(),
    }),
  );
});
test("stale, future, malformed or arbitrary target markers cannot resume", () => {
  const store = storage();
  for (const value of [
    { target: "/account", startedAt: 1 },
    { target: "/account", startedAt: 900000 },
    { target: "https://example.com", startedAt: 699999 },
  ]) {
    store.setItem(CALENDAR_FLOW_KEY, JSON.stringify(value));
    assert.equal(pendingCalendar(store, 700000), false);
  }
  store.setItem(CALENDAR_FLOW_KEY, "broken");
  assert.equal(pendingCalendar(store, 1), false);
});
test("disabled storage does not prevent provider navigation", async () => {
  let redirected = false;
  await startCalendarConnection({
    connect: async () => "https://connectors.base44.com/authorize",
    storage: {
      setItem() {
        throw Error("disabled");
      },
    },
    redirect: () => {
      redirected = true;
    },
  });
  assert.equal(redirected, true);
});
