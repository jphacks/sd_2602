import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { demoDates, emptyState, relevant, transition } from '../src/domain.js';
import { verifySignature, receive, prepare } from '../src/service.js';
import { FileStore } from '../src/store.js';

const now = new Date('2026-10-17T03:00:00Z');
const options = { now, id: () => 'session-1' };
const source = (userId = 'alice', groupId = 'group-1') => ({ type: 'group', groupId, userId });
const message = (value, userId = 'alice') => ({ type: 'message', source: source(userId), message: { type: 'text', text: value } });
const action = (op, userId = 'alice', extra = {}, groupId = 'group-1') => ({ type: 'postback', source: source(userId, groupId), postback: { data: new URLSearchParams({ s: 'session-1', op, ...extra }).toString() } });
function started() { const state = emptyState(); transition(state, message('日程調整'), options); return state; }
function ready() {
  const state = started();
  transition(state, action('join', 'bob'), options);
  const date = state.sessions['session-1'].dates[0];
  transition(state, action('vote', 'alice', { date, value: 'yes' }), options);
  transition(state, action('vote', 'bob', { date, value: 'maybe' }), options);
  return { state, date };
}

test('candidates start tomorrow and cross a month/year correctly', () => {
  assert.deepEqual(demoDates(new Date('2026-12-31T14:00:00Z'), 'Asia/Tokyo'), ['2027-01-01', '2027-01-02', '2027-01-03']);
  assert.equal(demoDates(new Date('2026-12-31T16:00:00Z'), 'Asia/Tokyo')[0], '2027-01-02');
});
test('unrelated conversation messages are not collected', () => {
  const state = emptyState();
  assert.equal(relevant(message('private conversation')), false);
  assert.equal(receive(state, { ...message('private conversation'), webhookEventId: 'x', replyToken: 'secret' }), false);
  assert.equal(JSON.stringify(state).includes('private conversation'), false);
});
test('create joins owner; repeated start reuses active session', () => {
  const state = started();
  transition(state, message('日程調整', 'bob'), options);
  assert.equal(Object.keys(state.sessions).length, 1);
  assert.deepEqual(state.sessions['session-1'].members, ['alice']);
});
test('group identity is required and DM directs to group', () => {
  const state = emptyState();
  transition(state, { ...message('日程調整'), source: { type: 'group', groupId: 'x' } }, options);
  assert.equal(Object.keys(state.sessions).length, 0);
  const response = transition(state, { ...message('日程調整'), source: { type: 'user', userId: 'alice' } }, options);
  assert.match(response[0].text, /グループ/);
});
test('must join before voting; max four; duplicate join is harmless', () => {
  const state = started(), session = state.sessions['session-1'];
  transition(state, action('vote', 'bob', { date: session.dates[0], value: 'yes' }), options);
  assert.deepEqual(session.votes, {});
  for (const user of ['bob', 'carol', 'dan', 'eve', 'bob']) transition(state, action('join', user), options);
  assert.deepEqual(session.members, ['alice', 'bob', 'carol', 'dan']);
});
test('vote edits replace old answer; repeated same vote does not increase revision', () => {
  const { state, date } = ready(), session = state.sessions['session-1'];
  const previous = session.revision;
  transition(state, action('vote', 'bob', { date, value: 'maybe' }), options);
  assert.equal(session.revision, previous);
  transition(state, action('vote', 'bob', { date, value: 'no' }), options);
  assert.equal(session.votes.bob[date], 'no');
});
test('invalid dates/answers and cross-group buttons cannot change state', () => {
  const state = started(), before = JSON.stringify(state);
  transition(state, action('vote', 'alice', { date: '1900-01-01', value: 'yes' }), options);
  transition(state, action('vote', 'alice', { date: state.sessions['session-1'].dates[0], value: 'invalid' }), options);
  transition(state, action('join', 'bob', {}, 'other-group'), options);
  assert.equal(JSON.stringify(state), before);
});
test('only owner can confirm or cancel', () => {
  const { state, date } = ready(), before = JSON.stringify(state);
  transition(state, action('confirm', 'bob', { date, rev: String(state.sessions['session-1'].revision) }), options);
  transition(state, action('cancel', 'bob'), options);
  assert.equal(JSON.stringify(state), before);
});
test('preview is not confirmation and changed answers invalidate old confirmation', () => {
  const { state, date } = ready(), session = state.sessions['session-1'];
  const revision = String(session.revision);
  const preview = transition(state, action('preview', 'alice', { date }), options);
  assert.equal(preview[0].type, 'flex');
  assert.equal(session.status, 'open');
  transition(state, action('vote', 'bob', { date, value: 'yes' }), options);
  const response = transition(state, action('confirm', 'alice', { date, rev: revision }), options);
  assert.equal(session.status, 'open');
  assert.match(response[0].text, /変わりました/);
});
test('cannot confirm alone, with missing answers or with a no', () => {
  const state = started(), session = state.sessions['session-1'], date = session.dates[0];
  transition(state, action('vote', 'alice', { date, value: 'yes' }), options);
  transition(state, action('confirm', 'alice', { date, rev: String(session.revision) }), options);
  assert.equal(session.status, 'open');
  transition(state, action('join', 'bob'), options);
  transition(state, action('confirm', 'alice', { date, rev: String(session.revision) }), options);
  assert.equal(session.status, 'open');
  transition(state, action('vote', 'bob', { date, value: 'no' }), options);
  transition(state, action('confirm', 'alice', { date, rev: String(session.revision) }), options);
  assert.equal(session.status, 'open');
});
test('valid confirmation closes poll; old cards cannot change answers', () => {
  const { state, date } = ready(), session = state.sessions['session-1'];
  transition(state, action('confirm', 'alice', { date, rev: String(session.revision) }), options);
  assert.equal(session.status, 'confirmed');
  const before = JSON.stringify(state);
  transition(state, action('vote', 'bob', { date, value: 'no' }), options);
  assert.equal(JSON.stringify(state), before);
});
test('expired poll rejects writes and expired cards contain no buttons', () => {
  const state = started();
  const later = { now: new Date(now.getTime() + 25 * 3600000) };
  transition(state, action('join', 'bob'), later);
  assert.equal(state.sessions['session-1'].status, 'expired');
  const response = transition(state, message('集計'), later);
  assert.equal(JSON.stringify(response).includes('"type":"button"'), false);
});
test('raw-byte signature rejects tampering and missing/wrong-length signature', () => {
  const body = Buffer.from('{"events":[]}');
  const signature = createHmac('sha256', 'test-secret').update(body).digest('base64');
  assert.equal(verifySignature(body, signature, 'test-secret'), true);
  assert.equal(verifySignature(Buffer.from('{ "events":[]}'), signature, 'test-secret'), false);
  assert.equal(verifySignature(body, 'x', 'test-secret'), false);
  assert.equal(verifySignature(body, undefined, 'test-secret'), false);
});
test('webhook redelivery is deduplicated and preparation cannot apply twice', () => {
  const state = emptyState();
  const event = { ...message('日程調整'), webhookEventId: 'event-1', replyToken: 'test-token' };
  assert.equal(receive(state, event), true);
  assert.equal(receive(state, event), false);
  prepare(state, 'event-1', options);
  const before = JSON.stringify(state);
  prepare(state, 'event-1', options);
  assert.equal(JSON.stringify(state), before);
});
test('Flex buttons are postbacks; raw user/group identifiers are not shown', () => {
  const state = started();
  const response = transition(state, message('集計'), options);
  const serialized = JSON.stringify(response);
  assert.equal(serialized.includes('group-1'), false);
  assert.equal(serialized.includes('alice'), false);
  const walk = node => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'postback') assert.ok(Buffer.byteLength(node.data) <= 300);
    for (const value of Object.values(node)) if (typeof value === 'object') {
      if (Array.isArray(value)) value.forEach(walk); else walk(value);
    }
  };
  walk(response);
});
test('local store survives reload and rolls back failed transitions', () => {
  const root = resolve('data', 'test-runs');
  mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(join(root, 'line-bot-test-'));
  try {
    const filename = join(dir, 'state.json');
    const store = new FileStore(filename);
    store.transaction(state => transition(state, message('日程調整'), options));
    const persisted = readFileSync(filename, 'utf8');
    assert.throws(() => store.transaction(state => { state.sessions = {}; throw new Error('failure'); }));
    assert.equal(readFileSync(filename, 'utf8'), persisted);
    assert.equal(new FileStore(filename).state.sessions['session-1'].ownerId, 'alice');
    writeFileSync(filename, '{broken');
    assert.throws(() => new FileStore(filename));
  } finally {
    assert.ok(resolve(dir).startsWith(root + sep));
    rmSync(dir, { recursive: true, force: true });
  }
});

test('HTTP server accepts LINE verification and rejects unsigned requests without contacting LINE', async () => {
  const child = spawn(process.execPath, ['src/server.js'], {
    env: { ...process.env, PORT: '0', HOST: '127.0.0.1', LINE_CHANNEL_SECRET: 'smoke-secret', LINE_CHANNEL_ACCESS_TOKEN: 'not-a-real-token' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  try {
    const port = await new Promise((resolvePort, reject) => {
      const timeout = setTimeout(() => reject(new Error('Server startup timed out')), 10000);
      let output = '';
      child.on('error', error => { clearTimeout(timeout); reject(error); });
      child.stdout.on('data', chunk => {
        output += chunk;
        const match = output.match(/Port: (\d+)/);
        if (match) { clearTimeout(timeout); resolvePort(match[1]); }
      });
      child.on('exit', () => { clearTimeout(timeout); reject(new Error('Server exited before startup')); });
    });
    const url = `http://127.0.0.1:${port}`;
    const health = await fetch(url + '/health');
    assert.equal(await health.text(), 'ok');
    const body = '{"events":[]}';
    const unsigned = await fetch(url + '/webhook', { method: 'POST', body });
    assert.equal(unsigned.status, 401);
    const signature = createHmac('sha256', 'smoke-secret').update(body).digest('base64');
    const verified = await fetch(url + '/webhook', { method: 'POST', body, headers: { 'x-line-signature': signature } });
    assert.equal(verified.status, 200);
    assert.equal(await verified.text(), 'ok');
    const invalidBody = '{';
    const invalidSignature = createHmac('sha256', 'smoke-secret').update(invalidBody).digest('base64');
    const invalid = await fetch(url + '/webhook', { method: 'POST', body: invalidBody, headers: { 'x-line-signature': invalidSignature } });
    assert.equal(invalid.status, 400);
  } finally {
    const exited = once(child, 'exit');
    if (child.exitCode === null) { child.kill(); await exited; }
  }
});
