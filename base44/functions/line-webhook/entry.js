import { secrets } from "base44:runtime";
import { createWebhookHandler } from "./handler.js";

export default createWebhookHandler({ getSecret: (name) => secrets.get(name) });
