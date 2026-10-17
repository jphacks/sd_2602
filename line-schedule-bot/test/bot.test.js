import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createBotServer, replyFor, RESPONSE_TEXT } from '../src/server.js';

test('keyword returns one plain text response in an individual chat', () => {
  for (const keyword of ['＠リスケ', '@リスケ']) {
    assert.deepEqual(replyFor({
      type: 'message', source: { type: 'user', userId: 'fake-user' },
      message: { type: 'text', text: keyword }
    }), [{ type: 'text', text: RESPONSE_TEXT }]);
  }
  assert.deepEqual(replyFor({ type: 'message', message: { type: 'text', text: 'こんにちは' } }), []);
});

async function setup(t) {
  const replies = [];
  const logs = [];
  const secret = 'fake-channel-secret';
  const server = createBotServer({
    secret, token: 'fake-access-token',
    reply: async (replyToken, messages) => { replies.push({ replyToken, messages }); },
    log: value => logs.push(value)
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  const url = `http://127.0.0.1:${server.address().port}`;
  async function post(payload, signed = true) {
    const body = JSON.stringify(payload);
    const headers = { 'Content-Type': 'application/json' };
    if (signed) headers['x-line-signature'] = createHmac('sha256', secret).update(body).digest('base64');
    return fetch(url + '/webhook', { method: 'POST', headers, body });
  }
  return { url, post, replies, logs };
}

test('health and LINE Verify work without sending any messages', async t => {
  const { url, post, replies } = await setup(t);
  const health = await fetch(url + '/health');
  assert.equal(health.status, 200);
  assert.equal(await health.text(), 'ok');
  const response = await post({ events: [] });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'ok');
  assert.equal(replies.length, 0);
});

test('signed keyword webhook reaches the reply boundary once', async t => {
  const { post, replies, logs } = await setup(t);
  const payload = { events: [{
    type: 'message', webhookEventId: 'fake-event-1', replyToken: 'fake-reply-token',
    source: { type: 'user', userId: 'fake-user' },
    message: { type: 'text', text: '＠リスケ' }
  }] };
  const response = await post(payload);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'ok');
  assert.deepEqual(replies, [{
    replyToken: 'fake-reply-token', messages: [{ type: 'text', text: RESPONSE_TEXT }]
  }]);
  assert.ok(logs.includes('Keyword matched'));
  assert.ok(logs.includes('Reply sent'));
  const duplicate = await post(payload);
  assert.equal(duplicate.status, 200);
  await duplicate.text();
  assert.equal(replies.length, 1);
});

test('unsigned webhook is rejected before replying', async t => {
  const { post, replies } = await setup(t);
  const response = await post({ events: [] }, false);
  assert.equal(response.status, 401);
  await response.text();
  assert.equal(replies.length, 0);
});
