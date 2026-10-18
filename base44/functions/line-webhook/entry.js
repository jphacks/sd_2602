import { secrets } from "base44:runtime";
import bundle from "./prepared.json" with { type: "json" };
import { createPreparedDemoHandler } from "./prepared-handler.js";
// Legacy-name replacement bundle. The active LINE route is verified independently.
export default createPreparedDemoHandler({...bundle,functionName:'line-webhook',getSecret:name=>secrets.get(name)});
