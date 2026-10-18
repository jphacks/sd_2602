// Shared LINE presentation; never fetches or recalculates schedules.
export const HELP = '使えるコマンド\n\n「リスケする」\nリスケ候補のカードを表示します。\n\n「予定確認」\n予定の確認ページを開きます。（準備中）';
export function commandFor(event) {
  if (event?.type !== 'message' || event.message?.type !== 'text' || typeof event.message.text !== 'string') return null;
  const value = event.message.text.trim();
  if (value === 'リスケしたい') return 'help';
  if (value === '予定確認') return 'schedule';
  if (['リスケする', '@リスケ', '＠リスケ'].includes(value)) return 'cards';
  return null;
}
export function commandReply(command) {
  if (command === 'help') return [{type:'text',text:HELP}];
  if (command === 'schedule') return [{type:'text',text:'予定確認は準備中です。'}];
  return null;
}
const text = (value, options={}) => ({type:'text',text:value,wrap:true,...options});
export function candidateBubble({imageUrl, aspectRatio, dateLabel, self, other}) {
  const lines = ['自分：'+self, ...(other === undefined ? [] : ['相手：'+other])];
  const action = {type:'message',label:'候補を提案',text:dateLabel+'にリスケしませんか？\n'+lines.join('\n')+'\n※候補の提案です。確定ではありません。'};
  return {type:'bubble',size:'mega',action,
    hero:{type:'image',url:imageUrl,size:'full',aspectRatio,aspectMode:'fit',action},
    body:{type:'box',layout:'vertical',spacing:'sm',action,contents:[
      text(dateLabel,{size:'xl',weight:'bold',color:'#225B35'}),
      ...lines.map(value=>text(value,{size:'sm'})),
      text('デモ・未確定',{size:'xxs',color:'#777777'})
    ]}};
}
export function moreBubble(webUrl) {
  const action={type:'uri',label:'詳しく確認',uri:webUrl};
  return {type:'bubble',size:'mega',action,body:{type:'box',layout:'vertical',justifyContent:'center',paddingAll:'24px',action,contents:[text('詳しく確認',{color:'#165E83',align:'center',action})]}};
}
