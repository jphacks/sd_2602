// M03 CalendarSource モック実装（fetch stage）
// Git管理の固定JSON（src/mock/seed.json）から取得相当のデータを返す。
// 本体は純関数側と同じ契約でGoogleアダプターに差し替え可能。

import seed from "@/mock/seed.json";

export const MOCK_TIMEZONE = seed.timezone;
export const MOCK_OFFSET_MINUTES = seed.offsetMinutes;
export const DEFAULT_ACTIVITY_WINDOW = seed.activityWindow;

export function listFixtures() {
  return seed.fixtures.map((f) => ({ name: f.name, description: f.description }));
}

export function fetchFixture(name = "normal") {
  const fixture = seed.fixtures.find((f) => f.name === name);
  if (!fixture) {
    throw new Error(`fixture_not_found: ${name}`);
  }
  return {
    sourceRevision: `mock-${fixture.name}-001`,
    timezone: seed.timezone,
    offsetMinutes: seed.offsetMinutes,
    range: fixture.range,
    events: fixture.events,
  };
}