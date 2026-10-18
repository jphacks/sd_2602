import { z } from "zod";
import { recommendForDetails } from "../personal/candidates.js";
import { dateInTokyo, TIMEZONE } from "../personal/dates.js";

const minute = z.number().min(0).max(1440);
const date = z.iso.date();
const row = z.object({
  date,
  activeMinutes: minute,
  busyMinutes: minute,
  busyRatio: z.number().min(0).max(1),
});
const slot = z.object({
  slotStart: z.string().max(40),
  activeMinutes: minute,
  busyMinutes: minute,
  busyRatio: z.number().min(0).max(1),
});
const period = z.object({ startMinute: minute, endMinute: minute });
const candidate = z.object({
  date,
  busyRatio: z.number().min(0).max(1),
  reasons: z.array(z.string().max(100)).max(4),
});
// A whitelist: provider IDs, titles, credentials and unexpected fields cannot enter the saved view.
export const scheduleSchema = z.object({
  daily: z.array(row).length(31),
  details: z
    .array(
      row.extend({
        allDayCount: z.number().int().min(0),
        periods: z.array(period).max(50000),
        slots: z.array(slot).max(24),
      }),
    )
    .length(31),
  candidates: z.array(candidate).max(3),
  candidateState: z.enum(["valid", "empty"]),
  today: date,
  range: z.object({ startDate: date, endDateExclusive: date }),
  activityWindow: z.object({ startMinute: minute, endMinute: minute }),
  timezone: z.literal(TIMEZONE),
  source: z.literal("google"),
  googleStatus: z.literal("connected"),
  generatedAt: z.iso.datetime(),
  calculationVersion: z.string().max(100),
});
const common = {
  provider_event_id: z.string().max(1024),
  status: z.enum(["confirmed", "tentative"]),
  transparency: z.string().max(40),
  event_type: z.string().max(40),
  participation_status: z.string().max(40),
};
const eventSchema = z.discriminatedUnion("kind", [
  z.object({
    ...common,
    kind: z.literal("timed"),
    starts_at: z.iso.datetime({ offset: true }),
    ends_at: z.iso.datetime({ offset: true }),
  }),
  z.object({
    ...common,
    kind: z.literal("all_day"),
    start_date: date,
    end_date_exclusive: date,
  }),
]);
export const exclusionsSchema = z.object({
  excludedDates: z.array(date).max(31),
});
const deny = (code) => {
  throw new Error(code);
};
const owned = (record, owner) => {
  if (!record || record.owner_id !== owner) deny("SAVED_DATA_INVALID");
  return record;
};
export async function findProfile(entities, owner) {
  if (!owner) deny("UNAUTHORIZED");
  const rows = await entities.UserProfile.filter(
    { owner_id: owner },
    "-created_date",
    2,
  );
  if (rows.length > 1) deny("PROFILE_DUPLICATE");
  return rows.length ? owned(rows[0], owner) : null;
}
const defaults = (owner) => ({
  owner_id: owner,
  timezone: TIMEZONE,
  activity_windows: [{ start_minute: 540, end_minute: 1320 }],
  search_days: 31,
  excluded_dates: [],
  settings_version: "fixed-09-22-v1",
});
const settings = (profile) => {
  // Additional editable activity windows are outside this minimal implementation.
  if (
    profile.timezone !== TIMEZONE ||
    profile.search_days !== 31 ||
    profile.activity_windows?.length !== 1 ||
    profile.activity_windows[0].start_minute !== 540 ||
    profile.activity_windows[0].end_minute !== 1320
  )
    deny("SETTINGS_UNSUPPORTED");
  return exclusionsSchema.parse({ excludedDates: profile.excluded_dates ?? [] })
    .excludedDates;
};
function present(snapshot, profile, now) {
  const view = scheduleSchema.parse(snapshot.view);
  const today = dateInTokyo(now),
    excludedDates = settings(profile);
  return {
    ...view,
    ...recommendForDetails(
      view.daily,
      view.details,
      today,
      excludedDates,
      view.activityWindow,
    ),
    today,
    excludedDates,
    snapshotId: snapshot.id,
    settingsVersion: profile.settings_version,
    stored: true,
    fetchedAt: snapshot.fetched_at ?? view.generatedAt,
  };
}
export async function readSavedSchedule({ entities, owner, now = new Date() }) {
  const profile = await findProfile(entities, owner);
  if (!profile?.latest_snapshot_id) return { state: "empty" };
  const snapshot = owned(
    await entities.AvailabilitySnapshot.get(profile.latest_snapshot_id),
    owner,
  );
  if (snapshot.schema_version !== "personal-save-v1")
    deny("SAVED_DATA_INVALID");
  return { state: "ready", data: present(snapshot, profile, now) };
}
export async function saveSchedule({
  entities,
  owner,
  events,
  data,
  now = new Date(),
  revision = crypto.randomUUID(),
}) {
  const profile = (await findProfile(entities, owner)) ?? defaults(owner);
  const excludedDates = settings(profile);
  const view = scheduleSchema.parse(data);
  const cleanEvents = z.array(eventSchema).max(50000).parse(events);
  const recommendation = recommendForDetails(
    view.daily,
    view.details,
    view.today,
    excludedDates,
    view.activityWindow,
  );
  Object.assign(view, recommendation);
  const source = await entities.CalendarSource.create({
    owner_id: owner,
    source_revision: revision,
    calendar_id: "primary",
    fetched_at: view.generatedAt,
    timezone: TIMEZONE,
    range: {
      start_date: view.range.startDate,
      end_date_exclusive: view.range.endDateExclusive,
    },
    events: cleanEvents,
    schema_version: "personal-save-v1",
  });
  owned(source, owner);
  const daily = view.daily.map((d) => ({
    date: d.date,
    active_minutes: d.activeMinutes,
    busy_minutes: d.busyMinutes,
    busy_ratio: d.busyRatio,
  }));
  const snapshot = await entities.AvailabilitySnapshot.create({
    owner_id: owner,
    run_id: revision,
    source_id: source.id,
    settings_version: profile.settings_version,
    calculation_version: view.calculationVersion,
    timezone: TIMEZONE,
    generated_at: now.toISOString(),
    fetched_at: view.generatedAt,
    range: {
      start_date: view.range.startDate,
      end_date_exclusive: view.range.endDateExclusive,
    },
    daily,
    candidates: view.candidates.map((c) => ({
      date: c.date,
      busy_ratio: c.busyRatio,
      reasons: c.reasons,
    })),
    candidate_state: view.candidateState,
    schema_version: "personal-save-v1",
    view,
  });
  owned(snapshot, owner);
  // The only completion boundary. Failed source/snapshot writes never replace the old reference.
  const patch = {
    latest_snapshot_id: snapshot.id,
    candidate_state: view.candidateState,
  };
  const saved = profile.id
    ? await entities.UserProfile.update(profile.id, patch)
    : await entities.UserProfile.create({ ...profile, ...patch });
  owned(saved, owner);
  return { state: "ready", data: present(snapshot, saved, now) };
}
export async function saveExclusions({
  entities,
  owner,
  excludedDates,
  now = new Date(),
}) {
  const input = exclusionsSchema.parse({ excludedDates });
  const profile = await findProfile(entities, owner);
  if (!profile?.latest_snapshot_id) deny("SAVED_DATA_MISSING");
  const snapshot = owned(
    await entities.AvailabilitySnapshot.get(profile.latest_snapshot_id),
    owner,
  );
  const view = scheduleSchema.parse(snapshot.view);
  if (
    input.excludedDates.some((d) => !view.daily.some((row) => row.date === d))
  )
    deny("EXCLUSION_OUT_OF_RANGE");
  await entities.UserProfile.update(profile.id, {
    excluded_dates: [...new Set(input.excludedDates)],
    settings_version: crypto.randomUUID(),
  });
  return readSavedSchedule({ entities, owner, now });
}
