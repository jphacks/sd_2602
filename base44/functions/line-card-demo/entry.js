import { secrets } from "base44:runtime";
import bundle from "./prepared.json" with { type: "json" };
import { createPreparedDemoHandler } from "./handler.js";
// Explicit fixed-data demo only. No user schedules, DB or Google calls.
export default createPreparedDemoHandler({
  ...bundle,
  getSecret: (name) => secrets.get(name),
});
