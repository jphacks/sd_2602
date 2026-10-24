import { readFile, writeFile } from "node:fs/promises";
import { URL } from "node:url";
import console from "node:console";
import { readPersonalFixture } from "../src/lib/adapters/personal-mock.js";
import { buildSchedule } from "../src/domain/schedule/schedule.js";
import { dateInTokyo, dateLabel, clock } from "../src/domain/schedule/dates.js";
import { shortSchedule } from "../src/lib/pair/share.js";
const now = new Date(),
  today = dateInTokyo(now);
const seed = JSON.parse(
  await readFile(new URL("../src/mock/personal.json", import.meta.url), "utf8"),
);
const input = readPersonalFixture(seed, today),
  schedule = buildSchedule(input, today);
const data = {
  today,
  generatedAt: now.toISOString(),
  activityWindow:
    clock(input.activityWindow.startMinute) +
    "〜" +
    clock(input.activityWindow.endMinute),
  candidates: schedule.candidates.map((c) => {
    const day = schedule.details.find((d) => d.date === c.date);
    return {
      id: "demo-" + c.date,
      date: c.date,
      dateLabel: dateLabel(c.date),
      busy: shortSchedule({ ...day, allDay: day.allDayCount > 0 }),
    };
  }),
};
await writeFile(
  new URL(
    "../base44/functions/line-webhook/candidates-data.json",
    import.meta.url,
  ),
  JSON.stringify(data, null, 2) + "\n",
);
console.log(
  "Prepared personal test candidates:",
  data.candidates.map((c) => c.date).join(", "),
);
