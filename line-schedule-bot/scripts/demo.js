import { emptyState, transition } from '../src/domain.js';

const state = emptyState();
const event = (userId, data) => ({ type: 'postback', source: { type: 'group', groupId: 'demo', userId }, postback: { data: new URLSearchParams({ s: 'demo-session', ...data }).toString() } });
const options = { now: new Date('2026-10-17T03:00:00Z'), id: () => 'demo-session' };
transition(state, { type: 'message', source: { type: 'group', groupId: 'demo', userId: 'alice' }, message: { type: 'text', text: '日程調整' } }, options);
transition(state, event('bob', { op: 'join' }), options);
const date = state.sessions['demo-session'].dates[0];
transition(state, event('alice', { op: 'vote', date, value: 'yes' }), options);
const messages = transition(state, event('bob', { op: 'vote', date, value: 'maybe' }), options);
console.log('LINE接続なしのデモ。2人の回答後のFlex Message JSONです。');
console.log(JSON.stringify(messages.at(-1).contents, null, 2));
