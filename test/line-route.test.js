import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createPreparedDemoHandler} from '../base44/functions/line-webhook/prepared-handler.js';
import {buildPreparedMessages} from '../base44/functions/line-webhook/prepared-messages.js';
const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const bundle=load('../base44/functions/line-webhook/prepared.json');
test('packaged replacement entry uses the exact preview snapshot and approved image',()=>{
 assert.deepEqual(bundle,load('../base44/functions/line-card-demo/prepared.json'));
 assert.deepEqual(bundle.record.share.candidates.map(c=>c.date),['2026-11-09','2026-11-13','2026-11-15']);
 const bytes=Buffer.from(bundle.imageBase64,'base64');
 assert.deepEqual(bytes,readFileSync(new URL('./fixtures/selected-pair-calendar.jpg',import.meta.url)));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),bundle.record.image.hash);
 const entry=readFileSync(new URL('../base44/functions/line-webhook/entry.js',import.meta.url),'utf8');
 assert.ok(entry.includes('./prepared-handler.js')); assert.ok(!entry.includes('./handler.js'));
 const cards=buildPreparedMessages(bundle.record,{imageUrl:'https://example.com/i',webUrl:'https://example.com/result',now:new Date(bundle.record.share.generatedAt)})[0].contents.contents;
 assert.equal(cards.length,4); for(const card of cards.slice(0,3)) assert.ok(card.body.contents.some(v=>v.text.startsWith('相手：')));
});
test('packaged replacement image route serves only matching JPEG version',async()=>{
 const handler=createPreparedDemoHandler({...bundle,functionName:'line-webhook',getSecret:()=>null,now:()=>new Date(bundle.record.share.generatedAt)});
 const response=await handler(new Request('https://example.com/?asset=calendar&version='+bundle.record.version));
 assert.equal(response.status,200); assert.equal(response.headers.get('content-type'),'image/jpeg');
 assert.deepEqual(Buffer.from(await response.arrayBuffer()),Buffer.from(bundle.imageBase64,'base64'));
 assert.equal((await handler(new Request('https://example.com/?asset=calendar&version=image-demo-v1'))).status,404);
});

test('details link stays on the packaged version and fails closed for another version',async()=>{
 const handler=createPreparedDemoHandler({...bundle,functionName:'line-webhook',getSecret:()=>null,now:()=>new Date(bundle.record.share.generatedAt)});
 const response=await handler(new Request('https://example.com/?view=details&version='+bundle.record.version));
 assert.equal(response.status,200);
 const html=await response.text(); assert.ok(html.includes(bundle.record.version));
 assert.ok(html.includes('/functions/line-webhook?asset=calendar&amp;version='+bundle.record.version));
 assert.ok(html.includes('11月9日')); assert.ok(html.includes('11月13日')); assert.ok(html.includes('11月15日'));
 assert.equal((await handler(new Request('https://example.com/?view=details&version=old'))).status,404);
});
