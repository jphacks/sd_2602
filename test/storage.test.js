import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  readSavedSchedule,
  saveSchedule,
  saveExclusions,
} from "../src/lib/storage/schedule.js";
import { loadGoogleSchedule } from "../src/lib/google/service.js";
const now = new Date("2026-10-18T03:00:00Z");
const raw = {
  id: "provider-private",
  status: "confirmed",
  organizer: { self: true },
  start: { dateTime: "2026-10-19T10:00:00+09:00" },
  end: { dateTime: "2026-10-19T11:00:00+09:00" },
  summary: "private title",
};
function db() {
  const tables = {
      UserProfile: [],
      CalendarSource: [],
      AvailabilitySnapshot: [],
    },
    calls = [];
  let sequence = 0,
    fail;
  const entities = Object.fromEntries(
    Object.keys(tables).map((name) => [
      name,
      {
        async filter(query) {
          calls.push([name, "filter", query]);
          return structuredClone(
            tables[name].filter((r) => r.owner_id === query.owner_id),
          );
        },
        async get(id) {
          calls.push([name, "get", id]);
          return structuredClone(tables[name].find((r) => r.id === id));
        },
        async create(data) {
          if (fail === name) throw Error("DB_DOWN");
          const row = { ...structuredClone(data), id: name + ++sequence };
          tables[name].push(row);
          return structuredClone(row);
        },
        async update(id, data) {
          if (fail === name) throw Error("DB_DOWN");
          const row = tables[name].find((r) => r.id === id);
          Object.assign(row, structuredClone(data));
          return structuredClone(row);
        },
      },
    ]),
  );
  return {
    entities,
    tables,
    calls,
    breakAt: (name) => {
      fail = name;
    },
  };
}
async function save(database, owner = "A", items = [raw]) {
  return loadGoogleSchedule({
    connectorId: "connector",
    getConnection: async () => ({ accessToken: "never-save-this-token" }),
    now,
    fetcher: async () => ({ ok: true, json: async () => ({ items }) }),
    persist: (input) => saveSchedule({ ...input, ...database, owner, now }),
  });
}
test("full Google read saves private source and complete view; a later read needs no Google", async () => {
  const database = db();
  const saved = await save(database);
  assert.equal(saved.state, "ready");
  const again = await readSavedSchedule({ ...database, owner: "A", now });
  assert.deepEqual(again, saved);
  assert.equal(database.tables.CalendarSource.length, 1);
  assert.equal(saved.data.details[1].busyMinutes, 60);
  const serialized = JSON.stringify({ tables: database.tables, result: saved });
  assert.ok(!serialized.includes("never-save-this-token"));
  assert.ok(!serialized.includes("private title"));
  assert.ok(!JSON.stringify(saved).includes("provider-private"));
});
test("save failures never change the prior complete reference; temporary results are not success", async () => {
  for (const stage of [
    "CalendarSource",
    "AvailabilitySnapshot",
    "UserProfile",
  ]) {
    const database = db();
    const before = await save(database);
    const pointer = database.tables.UserProfile[0].latest_snapshot_id;
    database.breakAt(stage);
    const failed = await save(database, "A", []);
    assert.equal(failed.code, "SCHEDULE_SAVE_FAILED");
    assert.equal(database.tables.UserProfile[0].latest_snapshot_id, pointer);
    assert.deepEqual(
      await readSavedSchedule({ ...database, owner: "A", now }),
      before,
    );
  }
});
test("empty successful calendar is saved while provider failure creates no records", async () => {
  const database = db();
  const zero = await save(database, "A", []);
  assert.equal(zero.state, "ready");
  assert.ok(zero.data.daily.every((d) => d.busyMinutes === 0));
  const clean = db();
  const failed = await loadGoogleSchedule({
    connectorId: "connector",
    getConnection: async () => ({ accessToken: "x" }),
    now,
    fetcher: async () => ({ ok: false, status: 503 }),
    persist: (input) => saveSchedule({ ...input, ...clean, owner: "A", now }),
  });
  assert.equal(failed.state, "failed");
  assert.equal(clean.tables.UserProfile.length, 0);
  assert.equal(clean.tables.CalendarSource.length, 0);
});
test("owners cannot read one another and mismatched private references fail closed", async () => {
  const database = db();
  await save(database);
  assert.deepEqual(await readSavedSchedule({ ...database, owner: "B", now }), {
    state: "empty",
  });
  database.tables.UserProfile.push({
    id: "B-profile",
    owner_id: "B",
    latest_snapshot_id: database.tables.UserProfile[0].latest_snapshot_id,
  });
  await assert.rejects(
    readSavedSchedule({ ...database, owner: "B", now }),
    /SAVED_DATA_INVALID/,
  );
  await assert.rejects(
    readSavedSchedule({ ...database, owner: "", now }),
    /UNAUTHORIZED/,
  );
});
test("exclusions survive reload, recalculate candidates, and cannot change arbitrary fields", async () => {
  const database = db();
  const saved = await save(database);
  const day = saved.data.candidates[0].date;
  const changed = await saveExclusions({
    ...database,
    owner: "A",
    excludedDates: [day],
    now,
  });
  assert.deepEqual(changed.data.excludedDates, [day]);
  assert.ok(!changed.data.candidates.some((c) => c.date === day));
  assert.equal(changed.data.snapshotId, saved.data.snapshotId);
  assert.equal(database.tables.AvailabilitySnapshot.length, 1);
  assert.deepEqual(
    await readSavedSchedule({ ...database, owner: "A", now }),
    changed,
  );
  await assert.rejects(
    saveExclusions({
      ...database,
      owner: "A",
      excludedDates: ["2030-01-01"],
      now,
    }),
    /EXCLUSION_OUT_OF_RANGE/,
  );
});
test("ambiguous profiles and unsupported settings stop rather than choosing an owner row", async () => {
  const database = db();
  await save(database);
  database.tables.UserProfile.push({
    ...database.tables.UserProfile[0],
    id: "duplicate",
  });
  await assert.rejects(
    readSavedSchedule({ ...database, owner: "A", now }),
    /PROFILE_DUPLICATE/,
  );
  database.tables.UserProfile.pop();
  database.tables.UserProfile[0].timezone = "Europe/London";
  await assert.rejects(
    readSavedSchedule({ ...database, owner: "A", now }),
    /SETTINGS_UNSUPPORTED/,
  );
});
test("saved data keeps its fetched range but past dates never remain candidates", async () => {
  const database = db();
  await save(database);
  const later = await readSavedSchedule({
    ...database,
    owner: "A",
    now: new Date("2026-11-20T00:00:00Z"),
  });
  assert.equal(later.data.candidates.length, 0);
  assert.equal(later.data.range.startDate, "2026-10-18");
});
test("private entity definitions deny all direct CRUD access", async () => {
  for (const name of [
    "UserProfile",
    "CalendarSource",
    "AvailabilitySnapshot",
  ]) {
    const schema = JSON.parse(
      await readFile(
        new URL("../base44/entities/" + name + ".jsonc", import.meta.url),
        "utf8",
      ),
    );
    assert.deepEqual(schema.rls, {
      create: false,
      read: false,
      update: false,
      delete: false,
    });
  }
});
