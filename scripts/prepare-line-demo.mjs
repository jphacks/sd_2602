import { URL } from "node:url";
import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import process from "node:process";
import console from "node:console";
import { readFile, writeFile } from "node:fs/promises";
import { readPersonalFixture } from "../src/lib/adapters/personal-mock.js";
import { buildSchedule } from "../src/lib/personal/schedule.js";
import { dateInTokyo } from "../src/lib/personal/dates.js";
import { prepareCard } from "../src/lib/line-card/prepare.js";
const now = new Date(),
  today = dateInTokyo(now),
  seed = JSON.parse(
    await readFile(
      new URL("../src/mock/personal.json", import.meta.url),
      "utf8",
    ),
  );
const selfInput = readPersonalFixture(seed, today),
  otherInput = readPersonalFixture(
    {
      ...seed,
      days: seed.days.map((_, i) => seed.days[(i + 7) % seed.days.length]),
    },
    today,
  );
const self = buildSchedule(selfInput, today),
  other = buildSchedule(otherInput, today);
let bytes, record;
await prepareCard({
  self: self.details,
  other: other.details,
  today,
  window: selfInput.activityWindow,
  version: crypto.randomUUID(),
  generatedAt: now.toISOString(),
  selfFetchedAt: now.toISOString(),
  otherFetchedAt: now.toISOString(),
  store: {
    saveImage: async ({ version, png }) => {
      bytes = png;
      return { key: "fixture/" + version + ".png" };
    },
    saveResult: async (result) => {
      record = result;
    },
  },
});
record.image.height = new DataView(
  bytes.buffer,
  bytes.byteOffset,
  bytes.byteLength,
).getUint32(20);
const supplied =
    process.argv[2] ?? "https://sync-engine-copy-49e423a5.base44.app",
  origin = new URL(supplied);
if (
  origin.protocol !== "https:" ||
  origin.username ||
  origin.password ||
  origin.pathname !== "/" ||
  origin.search ||
  origin.hash
)
  throw Error("Expected HTTPS web origin");
const bundle = {
  record,
  imageBase64: Buffer.from(bytes).toString("base64"),
  webOrigin: origin.origin,
};
// Only fixed synthetic input can reach this script. Runtime DB adapter comes later.
await writeFile(
  new URL("../base44/functions/line-card-demo/prepared.json", import.meta.url),
  JSON.stringify(bundle, null, 2) + "\n",
);
console.log(
  "Prepared fixed demo:",
  record.version,
  "candidates:",
  record.share.candidates.length,
  "image bytes:",
  bytes.length,
);
