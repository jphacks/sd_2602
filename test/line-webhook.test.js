import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createWebhookHandler } from "../base44/functions/line-webhook/handler.js";

const secret = "fake-channel-secret";
const keywordEvent = (text = "＠リスケ", id = "fake-event") => ({
  type: "message", webhookEventId: id, replyToken: "fake-reply-token",
  message: { type: "text", text },
});

function setup({ values = {}, fetchImpl } = {}) {
  const replies = [];
  const logs = [];
  const handle = createWebhookHandler({
    getSecret: (name) => ({ LINE_CHANNEL_SECRET: secret, LINE_CHANNEL_ACCESS_TOKEN: "fake-access-token", ...values })[name],
    fetchImpl: fetchImpl ?? (async (url, options) => {
      replies.push({ url, ...JSON.parse(options.body) });
      return new Response(null, { status: 200 });
    }),
    log: (line) => logs.push(line),
  });
  return { handle, replies, logs };
}

function post(body, signature = createHmac("sha256", secret).update(body).digest("base64")) {
  const headers = { "Content-Type": "application/json" };
  if (signature !== null) headers["x-line-signature"] = signature;
  return new Request("https://example.invalid/functions/line-webhook", { method: "POST", body, headers });
}

test("health works without secrets; unsupported methods return 405", async () => {
  const handle = createWebhookHandler({ getSecret: () => { throw new Error("must not read secrets"); } });
  const health = await handle(new Request("https://example.invalid/"));
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true, service: "risuke-line" });
  assert.equal(health.headers.get("cache-control"), "no-store");
  assert.equal((await handle(new Request("https://example.invalid/", { method: "DELETE" }))).status, 405);
});

test("missing and incorrect signatures never send a reply", async () => {
  const { handle, replies } = setup();
  const body = JSON.stringify({ events: [keywordEvent()] });
  for (const signature of [null, "invalid", createHmac("sha256", "wrong").update(body).digest("base64")]) {
    assert.equal((await handle(post(body, signature))).status, 401);
  }
  assert.equal(replies.length, 0);
});

test("signature is checked against the original bytes before JSON parsing", async () => {
  const { handle } = setup();
  const body = '{ "events": [] }';
  const signature = createHmac("sha256", secret).update(body).digest("base64");
  assert.equal((await handle(post(body, signature))).status, 200);
  assert.equal((await handle(post('{"events":[]}', signature))).status, 401);
});

test("LINE Verify and unrelated events send nothing", async () => {
  const { handle, replies } = setup();
  for (const events of [[], [keywordEvent("こんにちは")], [{ type: "follow" }], [null], [keywordEvent(123)]]) {
    assert.equal((await handle(post(JSON.stringify({ events })))).status, 200);
  }
  assert.equal(replies.length, 0);
});

test("both keywords reply once and duplicates within an instance are ignored", async () => {
  const { handle, replies, logs } = setup();
  for (const [index, text] of ["＠リスケ", " @リスケ "].entries()) {
    const body = JSON.stringify({ events: [keywordEvent(text, `fake-${index}`)] });
    assert.equal((await handle(post(body))).status, 200);
    assert.equal((await handle(post(body))).status, 200);
  }
  assert.equal(replies.length, 2);
  assert.equal(replies[0].messages[0].type, "flex");
  assert.equal(replies[0].messages[0].contents.contents.length, 4);
  assert.ok(logs.some((line) => JSON.parse(line).event === "cards_prepared"));
  assert.equal(replies[0].url, "https://api.line.me/v2/bot/message/reply");
  for (const forbidden of ["fake-channel-secret", "fake-access-token", "fake-reply-token", "＠リスケ"]) {
    assert.equal(logs.join("\n").includes(forbidden), false);
  }
  assert.ok(logs.some((line) => JSON.parse(line).event === "reply_sent"));
});

test("missing configuration fails closed and makes no outbound request", async () => {
  for (const values of [{ LINE_CHANNEL_SECRET: undefined }, { LINE_CHANNEL_ACCESS_TOKEN: undefined }]) {
    const { handle, replies } = setup({ values });
    const response = await handle(post(JSON.stringify({ events: [keywordEvent()] })));
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, "LINE_NOT_CONFIGURED");
    assert.equal(replies.length, 0);
  }
});

test("signed malformed JSON and invalid event containers return 400", async () => {
  const { handle } = setup();
  for (const body of ["{", "null", "{}", '{"events":{}}', JSON.stringify({ events: Array(101).fill(null) })]) {
    assert.equal((await handle(post(body))).status, 400);
  }
});

test("body limit applies without relying on Content-Length", async () => {
  const { handle, replies } = setup();
  const response = await handle(post("x".repeat(1024 * 1024 + 1)));
  assert.equal(response.status, 413);
  assert.equal(replies.length, 0);
});

test("LINE rejection is distinguishable from unknown delivery", async () => {
  for (const [fetchImpl, code] of [
    [async () => new Response(null, { status: 401 }), "LINE_REPLY_FAILED"],
    [async () => { throw new Error("secret upstream details"); }, "LINE_DELIVERY_UNKNOWN"],
  ]) {
    const { handle, logs } = setup({ fetchImpl });
    const response = await handle(post(JSON.stringify({ events: [keywordEvent()] })));
    assert.equal(response.status, 502);
    assert.equal((await response.json()).error, code);
    assert.equal(logs.join("\n").includes("secret upstream details"), false);
  }
});

test("unknown delivery is not automatically resent within the same instance", async () => {
  let count = 0;
  const { handle } = setup({ fetchImpl: async () => { count++; throw new Error("timeout"); } });
  const body = JSON.stringify({ events: [keywordEvent()] });
  assert.equal((await handle(post(body))).status, 502);
  assert.equal((await handle(post(body))).status, 200);
  assert.equal(count, 1);
});
