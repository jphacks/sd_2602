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
