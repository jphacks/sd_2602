import { createPrivateCardStore } from "../src/lib/line-card/storage.js";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { prepareCard } from "../src/lib/line-card/prepare.js";
import { renderCalendarPng } from "../src/lib/line-card/png.js";
import { buildPreparedMessages } from "../base44/functions/line-card-demo/messages.js";
import { createPreparedDemoHandler } from "../base44/functions/line-card-demo/handler.js";
const bundle = JSON.parse(
  readFileSync(
    new URL(
      "../base44/functions/line-card-demo/prepared.json",
      import.meta.url,
    ),
  ),
);
const now = new Date(bundle.record.share.generatedAt);
const options = {
  imageUrl: "https://example.invalid/image.png",
  webUrl: "https://example.invalid/result",
  now,
};
const row = {
  date: "2026-10-19",
  busyRatio: 0.2,
  allDayCount: 0,
  periods: [{ startMinute: 600, endMinute: 660 }],
};
const input = {
  self: [row],
  other: [row],
  today: row.date,
  window: { startMinute: 540, endMinute: 1320 },
  version: "test-version",
  generatedAt: "2026-10-19T01:00:00Z",
  selfFetchedAt: "2026-10-19T00:00:00Z",
  otherFetchedAt: "2026-10-19T00:00:00Z",
};
test("update pipeline publishes only after image and result saves; failures never produce ready", async () => {
  const calls = [];
  const record = await prepareCard({
    ...input,
    store: {
      saveImage: async () => {
        calls.push("image");
        return { key: "private/test.png" };
      },
      saveResult: async (r) => {
        assert.equal(r.image.key, "private/test.png");
        calls.push("result");
      },
    },
  });
  assert.deepEqual(calls, ["image", "result"]);
  assert.equal(record.state, "ready");
  assert.equal(record.expiresAt, "2026-10-27T00:00:00+09:00");
  let saved = false;
  await assert.rejects(
    prepareCard({
      ...input,
      store: {
        saveImage: async () => {
          throw Error("upload");
        },
        saveResult: async () => {
          saved = true;
        },
      },
    }),
  );
  assert.equal(saved, false);
  await assert.rejects(
    prepareCard({
      ...input,
      store: {
        saveImage: async () => ({ key: "x" }),
        saveResult: async () => {
          throw Error("save");
        },
      },
    }),
  );
  await assert.rejects(
    prepareCard({ ...input, other: [], store: {} }),
    /CARD_INPUT_INVALID/,
  );
});
test("rasterizer emits decodable RGB PNG without a DOM and is deterministic", async () => {
  const png = await renderCalendarPng(bundle.record.share),
    again = await renderCalendarPng(bundle.record.share);
  assert.deepEqual(png, again);
  assert.deepEqual(
    Array.from(png.slice(0, 8)),
    [137, 80, 78, 71, 13, 10, 26, 10],
  );
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength),
    w = view.getUint32(16),
    h = view.getUint32(20);
  assert.equal(w, 732);
  assert.equal(h, bundle.record.image.height);
  const chunks = [];
  for (let at = 8; at < png.length;) {
    const n = view.getUint32(at),
      type = new TextDecoder().decode(png.slice(at + 4, at + 8));
    if (type === "IDAT") chunks.push(png.slice(at + 8, at + 8 + n));
    at += n + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  assert.equal(raw.length, (w * 3 + 1) * h);
  assert.ok(raw.some((v) => v !== 255 && v !== 0));
});
test("cards use prepared versions, dates and one period per person; text stays outside PNG", () => {
  const record = structuredClone(bundle.record),
    c = record.share.candidates[0];
  c.self.periods = [
    { startMinute: 600, endMinute: 660 },
    { startMinute: 720, endMinute: 780 },
  ];
  const messages = buildPreparedMessages(record, options),
    str = JSON.stringify(messages);
  assert.equal(messages[0].type, "flex");
  assert.equal(messages[0].contents.contents[0].hero.url, options.imageUrl);
  assert.ok(str.includes("など"));
  assert.ok(!str.includes("12:00"));
  assert.equal(
    messages[0].contents.contents.at(-1).action.uri,
    options.webUrl,
  );
  const expired = buildPreparedMessages(record, {
    ...options,
    now: new Date("2099-01-01"),
  });
  assert.equal(expired[0].type, "text");
  assert.equal(expired.length, 1);
  record.image.version = "wrong";
  assert.equal(buildPreparedMessages(record, options).length, 1);
  record.image.version = record.version;
  record.share.candidates = [];
  assert.ok(
    buildPreparedMessages(record, options)[0].text.includes(
      "候補日がありません",
    ),
  );
});
test("prepared demo serves exact image/version only and handles HEAD/expiry", async () => {
  const handler = createPreparedDemoHandler({
    ...bundle,
    getSecret: () => null,
    now: () => now,
    log: () => {},
  });
  const base =
    "https://example.invalid/?asset=calendar&version=" + bundle.record.version;
  const response = await handler(new Request(base));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.deepEqual(
    Buffer.from(await response.arrayBuffer()),
    Buffer.from(bundle.imageBase64, "base64"),
  );
  assert.equal(
    (await handler(new Request(base, { method: "HEAD" }))).status,
    200,
  );
  assert.equal(
    (
      await handler(
        new Request("https://example.invalid/?asset=../../secret&version=x"),
      )
    ).status,
    404,
  );
  const expired = createPreparedDemoHandler({
    ...bundle,
    getSecret: () => null,
    now: () => new Date("2099-01-01"),
    log: () => {},
  });
  assert.equal((await expired(new Request(base))).status, 410);
});
test("signed group command sends saved card without generating an image or invoking a DB", async () => {
  const sent = [];
  const secret = "test-channel-secret";
  const handler = createPreparedDemoHandler({
    ...bundle,
    now: () => now,
    getSecret: (name) =>
      name === "LINE_CHANNEL_SECRET" ? secret : "test-token",
    fetchImpl: async (url, options) => {
      sent.push(JSON.parse(options.body));
      return { ok: true };
    },
    log: () => {},
  });
  async function request(source, id, text = "@リスケ") {
    const body = JSON.stringify({
      events: [
        {
          type: "message",
          message: { type: "text", text },
          source: { type: source },
          replyToken: "reply",
          webhookEventId: id,
        },
      ],
    });
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = Buffer.from(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)),
    ).toString("base64");
    return new Request("https://example.invalid/", {
      method: "POST",
      body,
      headers: { "x-line-signature": sig },
    });
  }
  assert.equal((await handler(await request("group", "one"))).status, 200);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].messages[0].type, "flex");
  assert.equal(sent[0].messages[0].contents.contents.length, bundle.record.share.candidates.length + 1);
  await handler(await request("group", "one"));
  assert.equal(sent.length, 1);
  await handler(await request("user", "two"));
  assert.equal(sent.length, 1);
  for (const [command, expected] of [['リスケしたい', '使えるコマンド'], ['予定確認', '準備中'], ['リスケする', null]]) {
    await handler(await request('group', command, command));
    const message = sent.at(-1).messages[0];
    if (expected) assert.ok(message.text.includes(expected));
    else assert.equal(message.type, 'flex');
  }
  assert.equal(
    (
      await handler(
        new Request("https://example.invalid/", { method: "POST", body: "{}" }),
      )
    ).status,
    401,
  );
});

test("private upload adapter uses private storage only and preserves the returned URI", async () => {
  let captured;
  const store = createPrivateCardStore({
    core: {
      UploadPrivateFile: async ({ file }) => {
        captured = file;
        return { file_uri: "private/example.png" };
      },
    },
    saveResult: async () => {},
  });
  const png = await renderCalendarPng(bundle.record.share);
  assert.deepEqual(await store.saveImage({ version: "test", png }), {
    key: "private/example.png",
  });
  assert.equal(captured.type, "image/png");
  assert.equal(captured.name, "test.png");
  assert.throws(
    () => createPrivateCardStore({ core: {}, saveResult: async () => {} }),
    /CARD_STORE_NOT_CONFIGURED/,
  );
  await assert.rejects(
    store.saveImage({ version: "../../x", png }),
    /CARD_ASSET_INVALID/,
  );
});
