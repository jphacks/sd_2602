// Web-standard handler: the same code runs on Base44 and in Node's local tests.
import { buildDemoMessages, DEMO_VERSION, DEMO_SNAPSHOT } from "./cards.js";
import { demoImageResponse } from "./image.js";
const KEYWORDS = new Set(["＠日程", "@日程"]);
const MAX_BYTES = 1024 * 1024;

export function replyFor(event) {
  if (event?.type !== "message" || event.message?.type !== "text") return [];
  if (typeof event.message.text !== "string" || !KEYWORDS.has(event.message.text.trim())) return [];
  return buildDemoMessages();
}

export async function verifySignature(body, signature, secret) {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
  );
  const bytes = Uint8Array.from(atob(signature), (char) => char.charCodeAt(0));
  return crypto.subtle.verify("HMAC", key, bytes, body);
}

class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

async function readBody(request) {
  if (Number(request.headers.get("content-length")) > MAX_BYTES) throw new HttpError(413, "BODY_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) {
        await reader.cancel();
        throw new HttpError(413, "BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function parseEvents(body) {
  let payload;
  try { payload = JSON.parse(new TextDecoder().decode(body)); }
  catch { throw new HttpError(400, "INPUT_INVALID"); }
  if (!Array.isArray(payload?.events) || payload.events.length > 100) throw new HttpError(400, "INPUT_INVALID");
  return payload.events;
}

async function sendReply(replyToken, messages, token, fetchImpl) {
  let response;
  try {
    response = await fetchImpl("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ replyToken, messages }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new HttpError(502, "LINE_DELIVERY_UNKNOWN");
  }
  if (!response.ok) throw new HttpError(502, "LINE_REPLY_FAILED");
}

export function createWebhookHandler({ getSecret, fetchImpl = fetch, log = console.log }) {
  // Best effort within ONE instance only. Not a durable deduplication guarantee.
  const seen = new Set();
  return async function handleWebhook(request) {
    const headers = { "Cache-Control": "no-store" };
    if (request.method === "GET" || request.method === "HEAD") {
      const image = demoImageResponse(request);
      if (image) return image;
      if (request.method === "GET") return Response.json({ ok: true, service: "risuke-line" }, { headers });
    }
    if (request.method !== "POST") return new Response(null, { status: 405, headers: { ...headers, Allow: "GET, HEAD, POST" } });
    const requestId = crypto.randomUUID();
    const record = (event, extra = {}) => log(JSON.stringify({ event, request_id: requestId, ...extra }));
    try {
      const signature = request.headers.get("x-line-signature");
      if (!signature) throw new HttpError(401, "SIGNATURE_INVALID");
      const secret = getSecret("LINE_CHANNEL_SECRET");
      if (!secret) throw new HttpError(503, "LINE_NOT_CONFIGURED");
      const body = await readBody(request);
      if (!await verifySignature(body, signature, secret)) throw new HttpError(401, "SIGNATURE_INVALID");
      const events = parseEvents(body);
      record("webhook_received", { event_count: events.length });
      for (const event of events) {
        const messages = replyFor(event);
        if (!messages.length || typeof event.replyToken !== "string" || !event.replyToken) continue;
        const eventId = typeof event.webhookEventId === "string" ? event.webhookEventId : null;
        if (eventId && seen.has(eventId)) {
          record("duplicate_ignored");
          continue;
        }
        const token = getSecret("LINE_CHANNEL_ACCESS_TOKEN");
        if (!token) throw new HttpError(503, "LINE_NOT_CONFIGURED");
        if (eventId) seen.add(eventId);
        try {
          record("keyword_matched");
          record("cards_prepared", { fixture_version: DEMO_VERSION, item_id: `${DEMO_VERSION}:${requestId}`, candidate_count: DEMO_SNAPSHOT.candidates.length, card_count: messages[0].contents.contents.length });
          await sendReply(event.replyToken, messages, token, fetchImpl);
          record("reply_sent");
        } catch (error) {
          // Unknown acceptance must not cause an automatic retry in this instance.
          if (eventId && error.code !== "LINE_DELIVERY_UNKNOWN") seen.delete(eventId);
          throw error;
        } finally {
          if (seen.size > 1000) seen.delete(seen.values().next().value);
        }
      }
      return new Response("ok", { headers });
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const code = error instanceof HttpError ? error.code : "INTERNAL_ERROR";
      record("webhook_failed", { error_code: code });
      return Response.json({ error: code, request_id: requestId }, { status, headers });
    }
  };
}
