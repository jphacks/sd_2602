import test from "node:test";
import assert from "node:assert/strict";
import { selectPair, freeTime } from "../src/domain/schedule/pair-selection.js";
import {
  buildShare,
  shortSchedule,
  shareMessage,
} from "../src/features/pair/share.js";
const window = { startMinute: 540, endMinute: 1320 };
const day = (date, periods = [], allDayCount = 0) => ({
  date,
  periods: periods.map(([startMinute, endMinute]) => ({
    startMinute,
    endMinute,
  })),
  allDayCount,
  busyRatio: 0.3,
  privateTitle: "PRIVATE",
  slots: ["SECRET"],
});
const options = { today: "2026-10-18", window };
test("longest continuous free time beats a larger fragmented total; output is chronological", () => {
  const self = [
    day("2026-10-19", [
      [720, 780],
      [960, 1020],
    ]),
    day("2026-10-20", [[540, 840]]),
    day("2026-10-21", [[540, 780]]),
    day("2026-10-22", [[540, 660]]),
  ];
  // 19: longest300, total660; 20: longest480,total480 => 20 wins.
  const other = self.map((d) => day(d.date));
  assert.deepEqual(selectPair(self, other, { ...options, maxCandidates: 3 }), [
    "2026-10-20",
    "2026-10-21",
    "2026-10-22",
  ]);
});
test("total free time breaks equal longest gaps, then nearest date breaks ties", () => {
  const self = [
    day("2026-10-19", [[840, 1020]]),
    day("2026-10-20", [[840, 960]]),
    day("2026-10-21", [[840, 960]]),
  ];
  const other = self.map((d) => day(d.date));
  assert.deepEqual(selectPair(self, other, { ...options, maxCandidates: 1 }), [
    "2026-10-20",
  ]);
});
test("all-day on either side, today, exclusions and no common free time are ineligible", () => {
  const self = [
    day("2026-10-18"),
    day("2026-10-19", [], 1),
    day("2026-10-20"),
    day("2026-10-21", [[540, 900]]),
    day("2026-10-22"),
  ];
  const other = [
    day("2026-10-18"),
    day("2026-10-19"),
    day("2026-10-20", [], 2),
    day("2026-10-21", [[900, 1320]]),
    day("2026-10-22"),
  ];
  assert.deepEqual(
    selectPair(self, other, { ...options, excludedDates: ["2026-10-22"] }),
    [],
  );
});
test("busy union merges overlapping and adjacent events and clips to activity window", () => {
  assert.deepEqual(
    freeTime(
      [
        { startMinute: 400, endMinute: 600 },
        { startMinute: 590, endMinute: 700 },
        { startMinute: 700, endMinute: 800 },
        { startMinute: 1200, endMinute: 1440 },
      ],
      window,
    ),
    { longest: 400, total: 400 },
  );
});
test("shared DTO includes only daily ratios and selected candidate periods, never scores or private fields", () => {
  const self = [
    day("2026-10-19", [[600, 660]]),
    day("2026-10-20", [[700, 800]]),
  ];
  const share = buildShare(self, self, {
    ...options,
    dates: ["2026-10-20"],
    version: "v1",
    generatedAt: "2026-10-18T00:00:00Z",
  });
  assert.deepEqual(Object.keys(share.days[0].self), ["busyRatio"]);
  assert.deepEqual(
    share.candidates.map((c) => c.date),
    ["2026-10-20"],
  );
  assert.doesNotMatch(
    JSON.stringify(share),
    /PRIVATE|SECRET|longest|total|privateTitle|slots/,
  );
  assert.deepEqual(share.candidates[0].self.periods, [
    { startMinute: 700, endMinute: 800 },
  ]);
});
test("text shows one earliest event per person with etc only when more exist", () => {
  assert.equal(
    shortSchedule({
      periods: [
        { startMinute: 900, endMinute: 960 },
        { startMinute: 600, endMinute: 660 },
      ],
    }),
    "10:00〜11:00 予定あり、など",
  );
  assert.equal(
    shortSchedule({ periods: [{ startMinute: 600, endMinute: 660 }] }),
    "10:00〜11:00 予定あり",
  );
  assert.equal(shortSchedule({ periods: [] }), "活動時間内の予定なし");
  const share = {
    candidates: [
      {
        date: "2026-10-21",
        self: day("", [
          [600, 660],
          [900, 960],
        ]),
        other: day("", [[700, 800]]),
      },
      { date: "2026-10-20", self: day(""), other: day("") },
    ],
  };
  const message = shareMessage(share, [
    "2026-10-21",
    "2026-10-20",
    "2026-10-30",
  ]);
  assert.ok(message.indexOf("10月20日") < message.indexOf("10月21日"));
  assert.doesNotMatch(message, /15:00|10月30日/);
  assert.match(message, /自分：10:00〜11:00 予定あり、など/);
});
