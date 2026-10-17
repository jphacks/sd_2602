import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { buildDemoMessages, DEMO_SNAPSHOT } from "../base44/functions/line-webhook/cards.js";
import { demoImageResponse } from "../base44/functions/line-webhook/image.js";

test("zero to three candidates produce only the existing cards plus more", () => {
  for (let count = 0; count <= 3; count++) {
    const snapshot = { ...DEMO_SNAPSHOT, candidates: DEMO_SNAPSHOT.candidates.slice(0, count) };
    const [message] = buildDemoMessages(snapshot);
    if (count === 0) {
      assert.equal(message.type, "text");
      assert.match(message.text, /候補日が見つかりません/);
    } else {
      assert.equal(message.type, "flex");
      assert.equal(message.contents.type, "carousel");
      assert.equal(message.contents.contents.length, count + 1);
    }
  }
});

test("candidate cards share the image, identify candidates and post test proposals", () => {
  const [message] = buildDemoMessages();
  const cards = message.contents.contents;
  assert.match(message.altText, /テスト/);
  assert.equal(new Set(cards.map(card => card.hero.url)).size, 1);
  for (const [index, candidate] of DEMO_SNAPSHOT.candidates.entries()) {
    const card = cards[index];
    assert.equal(card.hero.aspectMode, "fit");
    assert.match(card.body.contents[0].text, new RegExp(candidate.id));
    assert.equal(card.footer.contents[0].action.type, "message");
    assert.equal(card.footer.contents[0].action.label, "この候補を提案する");
    const proposal = card.footer.contents[0].action.text;
    for (const expected of ["テスト提案", candidate.dateLabel, candidate.busy, DEMO_SNAPSHOT.activityWindow, DEMO_SNAPSHOT.timezone]) {
      assert.ok(proposal.includes(expected));
    }
    assert.match(card.footer.contents[1].text, /実予定ではありません/);
  }
  const more = cards.at(-1);
  assert.equal(more.footer.contents[0].action.type, "uri");
  assert.equal(more.footer.contents[0].action.uri, DEMO_SNAPSHOT.moreUrl);
  assert.equal(new URL(DEMO_SNAPSHOT.moreUrl).hostname, "example.com");
  assert.match(more.body.contents[1].text, /準備中/);
});

test("too many candidates and mismatched image versions fail instead of mixing results", () => {
  assert.throws(() => buildDemoMessages({ ...DEMO_SNAPSHOT, candidates: [...DEMO_SNAPSHOT.candidates, DEMO_SNAPSHOT.candidates[0]] }), /CANDIDATES/);
  assert.throws(() => buildDemoMessages({ ...DEMO_SNAPSHOT, imageVersion: "other" }), /VERSION/);
  assert.throws(() => buildDemoMessages({ ...DEMO_SNAPSHOT, imageUrl: "http://example.com/image.png" }), /URL/);
});

test("public image serves the original attachment byte for byte without credentials", async () => {
  const response = demoImageResponse(new Request(DEMO_SNAPSHOT.imageUrl));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.match(response.headers.get("cache-control"), /immutable/);
  const actual = Buffer.from(await response.arrayBuffer());
  const source = readFileSync(new URL("./fixtures/calendar-demo.png", import.meta.url));
  assert.equal(createHash("sha256").update(actual).digest("hex"), createHash("sha256").update(source).digest("hex"));
  assert.equal(actual.readUInt32BE(16), 589);
  assert.equal(actual.readUInt32BE(20), 378);
});

test("image URL requires the exact fixture and version; HEAD returns no body", async () => {
  assert.equal(demoImageResponse(new Request("https://example.invalid/")), null);
  for (const query of ["asset=calendar", "asset=calendar&version=wrong", "asset=../../.env&version=image-demo-v1"]) {
    assert.equal(demoImageResponse(new Request(`https://example.invalid/?${query}`)).status, 404);
  }
  const head = demoImageResponse(new Request(DEMO_SNAPSHOT.imageUrl, { method: "HEAD" }));
  assert.equal(head.status, 200);
  assert.equal((await head.arrayBuffer()).byteLength, 0);
});
