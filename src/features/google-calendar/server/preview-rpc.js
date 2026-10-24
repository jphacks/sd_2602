import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
const noStore = createMiddleware({ type: "function" }).server(({ next }) => {
  setResponseHeader("Cache-Control", "no-store");
  return next();
});
// Public fixed scenarios only. No caller-supplied calendar, user, events or URLs.
export const getGooglePreview = createServerFn({ method: "GET" })
  .middleware([noStore])
  .validator(
    z.object({ scenario: z.enum(["success", "empty", "failure"]) }).strict(),
  )
  .handler(async ({ data }) => {
    const { loadGooglePreview } = await import("./preview.js");
    const { default: seed } = await import("../../../mock/personal.json");
    return loadGooglePreview({
      seed,
      scenario: data.scenario,
      now: new Date(),
      requestId: crypto.randomUUID(),
      log: (entry) =>
        console.info(
          JSON.stringify({ ...entry, execution_mode: "google-preview" }),
        ),
    });
  });
