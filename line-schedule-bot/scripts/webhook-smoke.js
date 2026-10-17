import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createBotServer } from '../src/server.js';
import { FileStore } from '../src/store.js';
import { sendReply } from '../src/service.js';

// All credentials, user IDs and messages in this script are synthetic.
// .env is never loaded and no request is sent to LINE.
const secret = 'local-test-secret';
const token = 'local-test-token';
const receivedReplies = [];
const checks = [];
const dataRoot = resolve('data', 'webhook-smoke');
mkdirSync(dataRoot, { recursive: true });
const runDir = mkdtempSync(join(dataRoot, 'run-'));
const store = new FileStore(join(runDir, 'state.json'));
const mockLine = createServer(async (req, res) => {
  try {
    assert.equal(req.method, 'POST');
    assert.equal(req.url, '/v2/bot/message/reply');
    assert.equal(req.headers.authorization, `Bearer ${token}`);
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    assert.equal(typeof payload.replyToken, 'string');
    assert.ok(payload.messages.length > 0 && payload.messages.length <= 5);
    receivedReplies.push(payload);
    res.setHeader('Content-Type', 'application/json');
    res.end('{}');
  } catch { res.writeHead(400).end('invalid mock reply'); }
});
let bot;
const listen = async server => {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}`;
};
const close = server => new Promise(resolveClose => {
  if (!server?.listening) { resolveClose(); return; }
  server.close(resolveClose);
  server.closeIdleConnections();
});
const check = label => { checks.push(label); console.log(`PASS: ${label}`); };
try {
  const mockUrl = await listen(mockLine);
  bot = createBotServer({
    secret, token, store,
    reply: (replyToken, messages, accessToken) => sendReply(replyToken, messages, accessToken, (url, options) => {
      assert.equal(url, 'https://api.line.me/v2/bot/message/reply');
      return fetch(mockUrl + '/v2/bot/message/reply', options);
    })
  });
  const url = await listen(bot);
  const post = async (events, signatureOverride) => {
    const body = JSON.stringify({ destination: 'test-destination', events });
    const signature = createHmac('sha256', secret).update(body).digest('base64');
    return fetch(url + '/webhook', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-line-signature': signatureOverride ?? signature }, body
    });
  };
  const waitSent = async key => {
    const deadline = Date.now() + 5000;
    while (store.state.events[key]?.status !== 'sent') {
      if (store.state.events[key]?.status === 'delivery_unknown') throw new Error('Mock delivery failed');
      if (Date.now() >= deadline) throw new Error('Reply timed out');
      await new Promise(resolveWait => setTimeout(resolveWait, 10));
    }
  };
  assert.equal((await post([])).status, 200);
  check('LINE verification-shaped request -> HTTP 200');
  const source = userId => ({ type: 'group', groupId: 'test-group', userId });
  const start = { type: 'message', webhookEventId: 'test-start', replyToken: 'test-reply-start', source: source('test-alice'), message: { type: 'text', text: '日程調整' } };
  assert.equal((await post([start], 'invalid-signature')).status, 401);
  assert.equal(Object.keys(store.state.events).length, 0);
  check('Invalid signature -> HTTP 401, no state change');
  assert.equal((await post([start])).status, 200);
  await waitSent(start.webhookEventId);
  const sessionId = store.state.active['test-group'];
  assert.ok(sessionId);
  assert.equal(receivedReplies.at(-1).messages[0].type, 'flex');
  check('Signed message -> saved session -> Flex reply received over local HTTP');
  const perform = async (key, userId, op, extra = {}) => {
    const event = {
      type: 'postback', webhookEventId: key, replyToken: `reply-${key}`, source: source(userId),
      postback: { data: new URLSearchParams({ s: sessionId, op, ...extra }).toString() }
    };
    assert.equal((await post([event])).status, 200);
    await waitSent(key);
    return event;
  };
  await perform('test-join', 'test-bob', 'join');
  const date = store.state.sessions[sessionId].dates[0];
  const vote = await perform('test-vote', 'test-bob', 'vote', { date, value: 'yes' });
  assert.equal(store.state.sessions[sessionId].votes['test-bob'][date], 'yes');
  assert.match(receivedReplies.at(-1).messages[1].altText, /参加者2:○/);
  check('Postback answer -> saved vote -> updated summary received over local HTTP');
  const repliesBefore = receivedReplies.length;
  const revisionBefore = store.state.sessions[sessionId].revision;
  assert.equal((await post([vote])).status, 200);
  // Receipt and drain happen before the response is observable; allow any queued work to finish.
  await new Promise(resolveWait => setTimeout(resolveWait, 50));
  assert.equal(receivedReplies.length, repliesBefore);
  assert.equal(store.state.sessions[sessionId].revision, revisionBefore);
  check('Webhook redelivery -> no repeated vote or reply');
  const persisted = new FileStore(join(runDir, 'state.json'));
  assert.equal(persisted.state.sessions[sessionId].votes['test-bob'][date], 'yes');
  check('Saved test answer can be loaded again');
  const report = {
    testedAt: new Date().toISOString(), mode: 'local-mock-only', checks,
    externalLineRequests: 0, replyCount: receivedReplies.length,
    // These are exclusively synthetic test payloads, never actual LINE traffic.
    lastReply: receivedReplies.at(-1)
  };
  const reportPath = join(runDir, 'result.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nResult: ${reportPath}\nNo actual LINE messages were sent.`);
} finally {
  await close(bot);
  await close(mockLine);
}
