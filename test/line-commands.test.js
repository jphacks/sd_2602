import test from 'node:test';
import assert from 'node:assert/strict';
import {replyFor} from '../base44/functions/line-webhook/handler.js';
const event=text=>({type:'message',message:{type:'text',text}});
test('public help hides test commands and schedule stays pending',()=>{
 const help=replyFor(event('リスケしたい'))[0].text;
 for(const value of ['リスケする','予定確認','準備中']) assert.ok(help.includes(value));
 for(const value of ['@','＠','日程']) assert.ok(!help.includes(value));
 assert.match(replyFor(event('予定確認'))[0].text,/準備中/);
 assert.equal(replyFor(event(' リスケする '))[0].type,'flex');
 assert.deepEqual(replyFor(event('11月9日にリスケしませんか？')),[]);
});
