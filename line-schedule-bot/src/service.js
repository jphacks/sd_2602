import { createHmac, timingSafeEqual } from 'node:crypto';
import { relevant, transition } from './domain.js';

export function verifySignature(body, signature, secret) {
  if (typeof signature !== 'string' || !secret) return false;
  const expected = createHmac('sha256', secret).update(body).digest('base64');
  const a = Buffer.from(expected), b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function receive(state, event) {
  if (!relevant(event) || !event.webhookEventId || !event.replyToken) return false;
  const key = event.webhookEventId;
  if (Object.hasOwn(state.events, key)) return false;
  // Store only fields needed for scheduling; no unrelated conversation content.
  state.events[key] = {
    status: 'queued', receivedAt: new Date().toISOString(),
    event: {
      type: event.type, source: event.source, replyToken: event.replyToken,
      ...(event.type === 'message' ? { message: { type: 'text', text: event.message.text.trim() } } : {}),
      ...(event.type === 'postback' ? { postback: { data: event.postback.data } } : {})
    }
  };
  return true;
}

export function prepare(state, key, options) {
  const record = state.events[key];
  if (record.status !== 'queued') return record;
  record.messages = transition(state, record.event, options);
  record.status = record.messages.length ? 'pending' : 'ignored';
  return record;
}

export async function sendReply(replyToken, messages, token, transport = fetch) {
  const response = await transport('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ replyToken, messages }),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`LINE_HTTP_${response.status}`);
}
