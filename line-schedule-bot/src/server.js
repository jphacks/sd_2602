import { createServer } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const RESPONSE_TEXT = 'リスケBotです。受信できました。';
const keywords = new Set(['＠リスケ', '@リスケ']);

export function verifySignature(body, signature, secret) {
  if (typeof signature !== 'string') return false;
  const expected = createHmac('sha256', secret).update(body).digest('base64');
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes);
}

export function replyFor(event) {
  if (event?.type !== 'message' || event.message?.type !== 'text') return [];
  if (!keywords.has(event.message.text?.trim())) return [];
  return [{ type: 'text', text: RESPONSE_TEXT }];
}

async function sendReply(replyToken, messages, token) {
  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ replyToken, messages }),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`LINE_HTTP_${response.status}`);
}

// Minimal single-process connectivity check: no database, cards, polls or schedules.
export function createBotServer({ secret, token, reply = sendReply, log = console.log }) {
  if (!secret || !token) throw new Error('LINE_CHANNEL_SECRET and LINE_CHANNEL_ACCESS_TOKEN are required');
  // Short-lived duplicate protection only; resets when the server restarts.
  const seen = new Set();
  return createServer(async (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    if (req.method === 'GET' && req.url === '/health') {
      res.end('ok');
      return;
    }
    if (req.method !== 'POST' || req.url !== '/webhook') {
      res.writeHead(404).end('not found');
      return;
    }
    try {
      const chunks = [];
      let length = 0;
      for await (const chunk of req) {
        length += chunk.length;
        if (length > 1024 * 1024) {
          res.writeHead(413).end('too large');
          return;
        }
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks);
      if (!verifySignature(body, req.headers['x-line-signature'], secret)) {
        log('Webhook rejected: invalid signature');
        res.writeHead(401).end('invalid signature');
        return;
      }
      let payload;
      try { payload = JSON.parse(body.toString('utf8')); }
      catch {
        res.writeHead(400).end('invalid JSON');
        return;
      }
      if (!Array.isArray(payload?.events)) {
        res.writeHead(400).end('events required');
        return;
      }
      log(`Webhook received: ${payload.events.length} event(s)`);
      for (const event of payload.events) {
        const messages = replyFor(event);
        if (!messages.length || !event.replyToken) continue;
        const eventId = event.webhookEventId;
        if (eventId && seen.has(eventId)) continue;
        if (eventId) seen.add(eventId);
        try {
          log('Keyword matched');
          await reply(event.replyToken, messages, token);
          log('Reply sent');
        } catch (error) {
          if (eventId) seen.delete(eventId);
          throw error;
        }
        if (seen.size > 1000) seen.delete(seen.values().next().value);
      }
      // LINE's Verify sends an empty events array, which is accepted here.
      res.end('ok');
    } catch (error) {
      const reason = /^LINE_HTTP_\d{3}$/.test(error?.message) ? error.message : 'request or reply failed';
      log(`Webhook failed: ${reason}`);
      if (!res.headersSent) res.writeHead(502).end('temporary failure');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createBotServer({
    secret: process.env.LINE_CHANNEL_SECRET,
    token: process.env.LINE_CHANNEL_ACCESS_TOKEN
  });
  server.on('error', error => {
    console.error(`Server startup failed: ${error.code || 'unknown error'}`);
    process.exitCode = 1;
  });
  server.listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1', () => {
    console.log(`LINE keyword test server started. Port: ${server.address().port}. Webhook: /webhook`);
  });
}
