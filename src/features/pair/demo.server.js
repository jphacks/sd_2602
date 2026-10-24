import seed from "../../mock/personal.json";
import { readPersonalFixture } from "../../lib/adapters/personal-mock.js";
import { buildSchedule } from "../../domain/schedule/schedule.js";
import { dateInTokyo } from "../../domain/schedule/dates.js";
import { selectPair } from "../../domain/schedule/pair-selection.js";
import { buildShare } from "./share.js";

export function readPairDemo({
  now = new Date(),
  version = crypto.randomUUID(),
  log = (entry) => console.info(JSON.stringify(entry)),
} = {}) {
  try {
    const today = dateInTokyo(now);
    const input = readPersonalFixture(seed, today);
    // A second fixed fixture, never a remote user's records.
    const partnerInput = readPersonalFixture(
      {
        ...seed,
        days: seed.days.map((_, i) => seed.days[(i + 7) % seed.days.length]),
      },
      today,
    );
    const self = buildSchedule(input, today),
      other = buildSchedule(partnerInput, today);
    const dates = selectPair(self.details, other.details, {
      today,
      window: input.activityWindow,
    });
    const share = buildShare(self.details, other.details, {
      today,
      window: input.activityWindow,
      dates,
      version,
      generatedAt: now.toISOString(),
    });
    log({
      event: "pair_demo_completed",
      version,
      candidate_count: dates.length,
      execution_mode: "mock",
    });
    return share;
  } catch {
    log({ event: "pair_demo_failed", version, error_code: "PAIR_DEMO_FAILED" });
    throw new Error(
      "比較用のテストデータを読み込めませんでした。再試行してください。",
    );
  }
}
