import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireUser } from "@/lib/auth-middleware";
import { connectionStatus } from "./service.js";
const privateResponse = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    setResponseHeader("Cache-Control", "no-store");
    return next();
  },
);
export const getConnectionStatus = createServerFn({ method: "GET" })
  .middleware([privateResponse, requireUser])
  .handler(async ({ context }) => {
    const { secrets } = await import("base44:runtime");
    const connectorId = await secrets.get("GOOGLE_CALENDAR_CONNECTOR_ID");
    return connectionStatus({
      connectorId,
      connectors: {
        getCurrentAppUserConnection: (id) =>
          context
            .getBase44()
            .asServiceRole.connectors.getCurrentAppUserConnection(id),
      },
    });
  });

// Explicit user action; no owner/calendar/URL input is accepted.
export const readGoogleSchedule = createServerFn({ method: "POST" })
  .middleware([privateResponse, requireUser])
  .handler(async ({ context }) => {
    const { secrets } = await import("base44:runtime");
    const { loadGoogleSchedule } = await import("../google/service.js");
    try {
      return await loadGoogleSchedule({
        connectorId: await secrets.get("GOOGLE_CALENDAR_CONNECTOR_ID"),
        getConnection: (id) =>
          context
            .getBase44()
            .asServiceRole.connectors.getCurrentAppUserConnection(id),
        requestId: crypto.randomUUID(),
        log: (entry) => console.info(JSON.stringify(entry)),
      });
    } catch {
      return { state: "failed", code: "CALENDAR_LOAD_FAILED" };
    }
  });
