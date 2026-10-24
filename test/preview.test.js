import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadGooglePreview } from "../src/features/google-calendar/server/preview.js";
import { loadPersonalDemo } from "../src/features/personal/server/service.js";
const seed = JSON.parse(
  await readFile(new URL("../src/mock/personal.json", import.meta.url)),
);
const now = new Date("2026-10-18T03:00:00Z");
test("Google-format preview and existing fixture produce identical schedule data", async () => {
  const result = await loadGooglePreview({ seed, scenario: "success", now });
  const original = loadPersonalDemo({ seed, now, log: () => {} });
  assert.equal(result.state, "ready");
  assert.equal(result.data.source, "google-preview");
  assert.equal(result.data.googleStatus, "simulated");
  for (const key of [
    "daily",
    "details",
    "candidates",
    "range",
    "activityWindow",
  ])
    assert.deepEqual(result.data[key], original[key]);
});
test("empty is successful availability; failed second page returns no schedule", async () => {
  const empty = await loadGooglePreview({ seed, scenario: "empty", now });
  assert.equal(empty.state, "ready");
  assert.equal(empty.data.daily.length, 31);
  assert.ok(empty.data.daily.every((d) => d.busyMinutes === 0));
  assert.equal(empty.data.candidates.length, 3);
  const failed = await loadGooglePreview({ seed, scenario: "failure", now });
  assert.deepEqual(failed, { state: "failed", code: "GOOGLE_UNAVAILABLE" });
  await assert.rejects(
    loadGooglePreview({ seed, scenario: "remote", now }),
    /PREVIEW_SCENARIO_INVALID/,
  );
});
