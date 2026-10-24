import test from "node:test";
import assert from "node:assert/strict";
import {
  connectorConfig,
  connectionStatus,
} from "../src/features/account/service.js";
import { selectShare } from "../src/features/pair/share.js";
import { recommendForDetails } from "../src/domain/schedule/candidates.js";
import { checkPage } from "../src/lib/site/check.js";
test("missing/wrong Google client ID never invokes a connector", async () => {
  for (const id of [undefined, "123.apps.googleusercontent.com", "../x"]) {
    let calls = 0;
    const result = await connectionStatus({
      connectorId: id,
      connectors: {
        getCurrentAppUserConnection: () => {
          calls++;
        },
      },
    });
    assert.match(result.state, /configuration_/);
    assert.equal(calls, 0);
  }
  assert.deepEqual(connectorConfig("connector_123"), {
    state: "configured",
    connectorId: "connector_123",
  });
});
test("connection status never returns tokens; provider outage is not a disconnected user", async () => {
  const connected = await connectionStatus({
    connectorId: "abc",
    connectors: {
      getCurrentAppUserConnection: async () => ({
        accessToken: "SECRET",
        connectionConfig: { secret: "SECRET" },
      }),
    },
  });
  assert.deepEqual(connected, { state: "connected", connectorId: "abc" });
  for (const status of [403, 429, 503])
    assert.deepEqual(
      await connectionStatus({
        connectorId: "abc",
        connectors: {
          getCurrentAppUserConnection: async () => {
            throw { status };
          },
        },
      }),
      { state: "unavailable" },
    );
  const missing = await connectionStatus({
    connectorId: "abc",
    connectors: {
      getCurrentAppUserConnection: async () => {
        throw { status: 404 };
      },
    },
  });
  assert.equal(missing.state, "connection_unconfirmed");
});
test("selected card and stars are limited to server-selected dates and retain the source version", () => {
  const share = {
    version: "v1",
    days: [{ date: "2026-10-19" }],
    candidates: [{ date: "2026-10-19" }, { date: "2026-10-20" }],
  };
  const selected = selectShare(share, ["2026-10-20", "2026-11-01"]);
  assert.deepEqual(selected.candidates, [{ date: "2026-10-20" }]);
  assert.equal(selected.version, "v1");
  assert.equal(selected.days, share.days);
  assert.equal(share.candidates.length, 2);
  assert.deepEqual(selectShare(share, []).candidates, []);
});
test("solo prefers longest continuous free time, excludes all-day and emits chronological dates", () => {
  const dates = [
    "2026-10-19",
    "2026-10-20",
    "2026-10-21",
    "2026-10-22",
    "2026-10-23",
  ];
  const ranges = [
    [
      [720, 780],
      [960, 1020],
    ],
    [[540, 840]],
    [[540, 780]],
    [[540, 660]],
    [],
  ];
  const details = dates.map((date, i) => ({
    date,
    allDayCount: i === 4 ? 1 : 0,
    periods: ranges[i].map(([startMinute, endMinute]) => ({
      startMinute,
      endMinute,
    })),
  }));
  const daily = dates.map((date) => ({ date, busyRatio: 0.5 }));
  assert.deepEqual(
    recommendForDetails(daily, details, "2026-10-18").candidates.map(
      (c) => c.date,
    ),
    ["2026-10-20", "2026-10-21", "2026-10-22"],
  );
});
test("HTTP200 generic platform shell cannot pass site verification", () => {
  assert.equal(checkPage(200, "<html>準備中</html>").ok, false);
  assert.equal(
    checkPage(404, '<meta name="risuke-renderer" content="tanstack-start-v1">')
      .ok,
    false,
  );
  assert.equal(
    checkPage(200, '<meta name="risuke-renderer" content="tanstack-start-v1"/>')
      .ok,
    true,
  );
});
