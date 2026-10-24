import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { connectionStatus } from "@/features/account/service";

const privateResponse = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    setResponseHeader("Cache-Control", "no-store");
    return next();
  },
);

// ---------- 同期ダッシュボード ----------

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([privateResponse, requireUser])
  .handler(async ({ context }) => {
    const base44 = context.getBase44();
    const query = { owner_id: context.user.id };
    const [runs, counts, profiles] = await Promise.all([
      base44.entities.OperationRun.filter(query, {
        sort: "-created_date",
        limit: 15,
        fields: [
          "run_id",
          "trigger",
          "state",
          "stage",
          "delivery_state",
          "error_code",
          "started_at",
          "finished_at",
        ],
      }),
      base44.entities.OperationRun.aggregate({ query, groupBy: "state" }),
      base44.entities.UserProfile.filter(query, {
        limit: 1,
        fields: [
          "current_run_id",
          "candidate_state",
          "google_status",
          "settings_version",
          "edit_version",
        ],
      }),
    ]);
    const stateCounts = Object.fromEntries(
      counts.rows.map((row) => [row.state, row.count]),
    );
    return {
      runs: runs.items,
      stateCounts,
      profile: profiles.items[0] ?? null,
    };
  });

// ---------- カレンダーソース管理 ----------

export const getCalendarSources = createServerFn({ method: "GET" })
  .middleware([privateResponse, requireUser])
  .handler(async ({ context }) => {
    const base44 = context.getBase44();
    const query = { owner_id: context.user.id };
    const [sources, profiles] = await Promise.all([
      base44.entities.CalendarSource.filter(query, {
        sort: "-fetched_at",
        limit: 50,
        fields: [
          "calendar_id",
          "fetched_at",
          "timezone",
          "source_revision",
          "run_id",
          "range",
          "schema_version",
        ],
      }),
      base44.entities.UserProfile.filter(query, {
        limit: 1,
        fields: ["current_run_id"],
      }),
    ]);
    return {
      sources: sources.items,
      currentRunId: profiles.items[0]?.current_run_id ?? null,
    };
  });

// ---------- 調整ルール設定（ManualAdjustment） ----------

const adjustmentData = z.object({
  start_at: z.string().min(1).max(40),
  end_at: z.string().min(1).max(40),
  adjustment_value: z.number().int().optional(),
  active: z.boolean(),
});

export const listAdjustments = createServerFn({ method: "GET" })
  .middleware([privateResponse, requireUser])
  .handler(async ({ context }) => {
    const page = await context
      .getBase44()
      .entities.ManualAdjustment.filter(
        { owner_id: context.user.id },
        { sort: "-created_date", limit: 100 },
      );
    return page.items;
  });

export const createAdjustment = createServerFn({ method: "POST" })
  .middleware([privateResponse, requireUser])
  .validator(adjustmentData)
  .handler(async ({ data, context }) =>
    context.getBase44().entities.ManualAdjustment.create({
      ...data,
      owner_id: context.user.id,
      adjustment_revision: crypto.randomUUID(),
    }),
  );

async function ownedAdjustment(base44, ownerId, id) {
  const page = await base44.entities.ManualAdjustment.filter(
    { id, owner_id: ownerId },
    { limit: 1, fields: ["id"] },
  );
  const record = page.items[0];
  if (!record)
    throw Object.assign(new Error("Adjustment not found"), { status: 404 });
  return record;
}

export const updateAdjustment = createServerFn({ method: "POST" })
  .middleware([privateResponse, requireUser])
  .validator(adjustmentData.partial().extend({ id: z.string().min(1) }))
  .handler(async ({ data: { id, ...patch }, context }) => {
    const base44 = context.getBase44();
    await ownedAdjustment(base44, context.user.id, id);
    return base44.entities.ManualAdjustment.update(id, {
      ...patch,
      adjustment_revision: crypto.randomUUID(),
    });
  });

export const deleteAdjustment = createServerFn({ method: "POST" })
  .middleware([privateResponse, requireUser])
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    await ownedAdjustment(base44, context.user.id, data.id);
    await base44.entities.ManualAdjustment.delete(data.id);
    return { deleted: true };
  });

// ---------- 連携設定（UserProfile + Google Calendar接続） ----------

export const getSettingsData = createServerFn({ method: "GET" })
  .middleware([privateResponse, requireUser])
  .handler(async ({ context }) => {
    const base44 = context.getBase44();
    const { secrets } = await import("base44:runtime");
    let connectorId;
    try {
      connectorId = await secrets.get("GOOGLE_CALENDAR_CONNECTOR_ID");
    } catch {
      connectorId = undefined;
    }
    let connection = { state: "configuration_missing" };
    if (connectorId) {
      connection = await connectionStatus({
        connectorId,
        connectors: {
          getCurrentAppUserConnection: (id) =>
            base44.asServiceRole.connectors.getCurrentAppUserConnection(id),
        },
      }).catch(() => ({ state: "unavailable" }));
    }
    const page = await base44.entities.UserProfile.filter(
      { owner_id: context.user.id },
      { limit: 1 },
    );
    return { profile: page.items[0] ?? null, connection };
  });

const settingsData = z.object({
  timezone: z.string().min(1).max(64),
  google_status: z.enum(["unlinked", "linked", "auth_required"]).optional(),
  google_connection_ref: z.string().max(200).optional(),
  line_user_id: z.string().max(64).optional(),
  line_display_name: z.string().max(120).optional(),
});

const clean = (value) => (value === "" ? null : value);

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([privateResponse, requireUser])
  .validator(settingsData)
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const patch = { timezone: data.timezone, settings_version: crypto.randomUUID() };
    if (data.google_status) patch.google_status = data.google_status;
    if (data.google_connection_ref !== undefined)
      patch.google_connection_ref = clean(data.google_connection_ref);
    if (data.line_user_id !== undefined)
      patch.line_user_id = clean(data.line_user_id);
    if (data.line_display_name !== undefined)
      patch.line_display_name = clean(data.line_display_name);
    const page = await base44.entities.UserProfile.filter(
      { owner_id: context.user.id },
      { limit: 1, fields: ["id"] },
    );
    const existing = page.items[0];
    if (existing)
      return base44.entities.UserProfile.update(existing.id, patch);
    return base44.entities.UserProfile.create({
      owner_id: context.user.id,
      ...patch,
    });
  });