import {readPersonalFixture} from "../src/lib/adapters/personal-mock.js";
import {buildSchedule} from "../src/lib/personal/schedule.js";
import {shortSchedule} from "../src/lib/pair/share.js";
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

test('candidate taps propose and last card is only a text link',()=>{
 const cards=buildDemoMessages()[0].contents.contents;
 for(const [i,c] of DEMO_SNAPSHOT.candidates.entries()) {
  const card=cards[i]; assert.equal(card.footer,undefined); assert.equal(card.header,undefined);
  assert.equal(card.action.type,'message'); assert.deepEqual(card.hero.action,card.action); assert.deepEqual(card.body.action,card.action);
  assert.ok(card.action.text.includes(c.dateLabel)); assert.ok(card.action.text.includes(c.busy));
  assert.match(card.action.text,/確定ではありません/);
  assert.ok(!JSON.stringify(card).includes('候補ID')); assert.ok(!JSON.stringify(card).includes('活動時間 09'));
 }
 const more=cards.at(-1); assert.equal(more.hero,undefined); assert.equal(more.body.contents.length,1);
 assert.equal(more.body.contents[0].text,'詳しく確認'); assert.equal(more.action.uri,DEMO_SNAPSHOT.moreUrl);
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

test('LINE candidates match the personal Web fixture calculation on the preparation date',()=>{
 const seed=JSON.parse(readFileSync(new URL('../src/mock/personal.json',import.meta.url)));
 const input=readPersonalFixture(seed,DEMO_SNAPSHOT.generatedDate),schedule=buildSchedule(input,DEMO_SNAPSHOT.generatedDate);
 assert.deepEqual(DEMO_SNAPSHOT.candidates.map(c=>c.date),schedule.candidates.map(c=>c.date));
 for(const c of DEMO_SNAPSHOT.candidates){const day=schedule.details.find(d=>d.date===c.date);assert.equal(c.busy,shortSchedule({...day,allDay:day.allDayCount>0}));}
 assert.ok(!JSON.stringify(buildDemoMessages()).includes('それ以外の活動時間内は空いています'));
});
