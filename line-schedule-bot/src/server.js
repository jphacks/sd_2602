import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { FileStore } from './store.js';
import { prepare, receive, sendReply, verifySignature } from './service.js';

export function createBotServer({ secret, token, store, timeZone = 'Asia/Tokyo', reply = sendReply }) {
if (!secret || !token) throw new Error('Channel secret and access token are required');
new Intl.DateTimeFormat('en', { timeZone }).format();
let draining = false;

async function drain() {
  if (draining) return;
  draining = true;
  try {
    for (;;) {
      const key = Object.keys(store.state.events).find(k => ['queued', 'pending'].includes(store.state.events[k].status));
      if (!key) break;
      let record;
      try {
        record = store.transaction(state => prepare(state, key, { timeZone }));
      } catch {
        console.error('Event processing failed; no payload logged');
        // Avoid silently dropping a queued operation after storage failures.
        break;
      }
      if (record.status !== 'pending') continue;
      let status = 'sent';
      try { await reply(record.event.replyToken, record.messages, token); }
      catch (error) {
        status = 'delivery_unknown';
        console.error(error.message?.startsWith('LINE_HTTP_') ? error.message : 'LINE delivery failed');
      }
      store.transaction(state => {
        state.events[key].status = status;
        delete state.events[key].event.replyToken;
        delete state.events[key].messages;
      });
    }
  } catch {
    console.error('Queue storage failure; restart after checking storage');
  } finally { draining = false; }
}

const server = createServer(async (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  if (req.method === 'GET' && req.url === '/health') { res.end('ok'); return; }
  if (req.method !== 'POST' || req.url !== '/webhook') { res.writeHead(404).end('not found'); return; }
  try {
    const chunks = [];
    let length = 0;
    for await (const chunk of req) {
      length += chunk.length;
      if (length > 1024 * 1024) { res.writeHead(413).end('too large'); return; }
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);
    if (!verifySignature(body, req.headers['x-line-signature'], secret)) {
      res.writeHead(401).end('invalid signature'); return;
    }
    let payload;
    try { payload = JSON.parse(body.toString('utf8')); }
    catch { res.writeHead(400).end('invalid JSON'); return; }
    if (!Array.isArray(payload.events)) { res.writeHead(400).end('events required'); return; }
    // Persist the inbox before acknowledging; empty events are LINE's verification request.
    if (payload.events.length) store.transaction(state => {
      for (const event of payload.events) receive(state, event);
    });
    res.end('ok');
    void drain();
  } catch {
    if (!res.headersSent) res.writeHead(500).end('temporary failure');
    console.error('Webhook receipt failed; no payload logged');
  }
});

server.on('listening', () => { void drain(); });
return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createBotServer({
    secret: process.env.LINE_CHANNEL_SECRET,
    token: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    timeZone: process.env.APP_TIME_ZONE || 'Asia/Tokyo',
    store: new FileStore(process.env.DATA_FILE || './data/state.json')
  });
  server.listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1', () => {
    console.log(`LINE scheduling test server started. Port: ${server.address().port}. Webhook: /webhook`);
  });
}
