import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
const noStore = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    setResponseHeader("Cache-Control", "no-store");
    return next();
  },
);
// Anonymous endpoint serves fixed fixtures only; accepts no IDs, dates or URLs.
// Real sharing MUST add requireUser, pair membership and both permissions first.
export const getPairDemo = createServerFn({ method: "GET" })
  .middleware([noStore])
  .handler(async () => {
    const { readPairDemo } = await import("./demo.server.js");
    return readPairDemo();
  });
