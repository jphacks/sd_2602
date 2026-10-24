import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

const demoResponse = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    setResponseHeader("Cache-Control", "no-store");
    return next();
  },
);

// Public fixed-fixture display only. Never accept owner, mode, dates or remote URL.
// Add requireUser and the page gate BEFORE connecting real data or persistence.
export const getPersonalDemo = createServerFn({ method: "GET" })
  .middleware([demoResponse])
  .handler(async () => {
    const { readDemo } = await import("./demo.server.js");
    return readDemo();
  });
