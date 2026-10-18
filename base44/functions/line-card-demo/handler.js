import { commandFor, commandReply } from "./presentation.js";
import { createWebhookHandler } from "./transport.js";
import { buildPreparedMessages } from "./messages.js";
export function createPreparedDemoHandler({
  record,
  imageBase64,
  webOrigin,
  getSecret,
  fetchImpl,
  log,
  now = () => new Date(),
}) {
  const imageUrl =
    "https://base44.app/api/apps/6ad3509425cadbfc49e423a5/functions/line-card-demo?asset=calendar&version=" +
    encodeURIComponent(record.version);
  const webUrl = new URL(
    "/me/card-preview?version=" + encodeURIComponent(record.version),
    webOrigin,
  ).href;
  const imageResponse = (request) => {
    const url = new URL(request.url);
    if (!url.searchParams.has("asset")) return null;
    const headers = {
      "Cache-Control": "no-store",
      "Content-Type": "image/png",
      "X-Content-Type-Options": "nosniff",
    };
    if (
      url.searchParams.get("asset") !== "calendar" ||
      url.searchParams.get("version") !== record.version
    )
      return new Response(null, { status: 404, headers });
    if (Date.parse(record.expiresAt) <= now().getTime())
      return new Response(null, { status: 410, headers });
    return new Response(
      request.method === "HEAD"
        ? null
        : Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0)),
      { headers },
    );
  };
  return createWebhookHandler({
    getSecret,
    fetchImpl,
    log,
    imageResponse,
    resolveMessages: (event) => {
      if (
        event?.source?.type !== "group" ||
        event?.type !== "message" ||
        event.message?.type !== "text" ||
        !commandFor(event)
      )
        return [];
      return commandReply(commandFor(event)) ?? buildPreparedMessages(record, { imageUrl, webUrl, now: now() });
    },
    snapshotInfo: () => ({
      fixture_version: record.version,
      candidate_count: record.share.candidates.length,
      execution_mode: "fixed_demo",
    }),
  });
}
