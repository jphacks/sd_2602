import { commandFor, commandReply } from "./presentation.js";
import { createWebhookHandler } from "./transport.js";
import { buildPreparedMessages } from "./prepared-messages.js";
export function createPreparedDemoHandler({
  functionName = "line-card-demo",
  record,
  imageBase64,
  webOrigin,
  getSecret,
  fetchImpl,
  log,
  now = () => new Date(),
}) {
  const imageUrl =
    "https://base44.app/api/apps/6ad3509425cadbfc49e423a5/functions/" + functionName + "?asset=calendar&version=" +
    encodeURIComponent(record.version);
  const webUrl = imageUrl.replace('?asset=calendar&', '?view=details&');
  const imageResponse = (request) => {
    const url = new URL(request.url);
    if (url.searchParams.get('view') === 'details') {
      if (url.searchParams.get('version') !== record.version) return new Response('この版は確認できません', {status:404});
      if (Date.parse(record.expiresAt) <= now().getTime()) return new Response('この版は期限切れです', {status:410});
      const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const messages = buildPreparedMessages(record, {imageUrl,webUrl,now:now()});
      const cards = messages[0].contents?.contents ?? [];
      const details = cards.slice(0,-1).map(card => '<section>'+card.body.contents.map((item,i)=>'<'+(i===0?'h2':'p')+'>'+escape(item.text)+'</'+(i===0?'h2':'p')+'>').join('')+'</section>').join('');
      const html='<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>リスケ候補の確認</title><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:24px auto;padding:0 16px;color:#243c36;background:#f6faf8}img{width:100%;height:auto;border-radius:12px}section{background:white;padding:16px;margin:16px 0;border-radius:12px}h1{font-size:20px}h2{font-size:18px}small{overflow-wrap:anywhere}</style><h1>リスケ候補の確認</h1><p>固定テストデータ・未確定</p><img src="'+escape(imageUrl)+'" alt="2人の多忙度と候補日"><main>'+details+'</main><small>版：'+escape(record.version)+'</small></html>';
      return new Response(request.method === 'HEAD' ? null : html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; img-src https://base44.app; style-src 'unsafe-inline'; frame-ancestors 'none'"}});
    }
    if (!url.searchParams.has("asset")) return null;
    const headers = {
      "Cache-Control": "no-store",
      "Content-Type": record.image.contentType ?? "image/png",
      "X-Content-Type-Options": "nosniff",
    };
    if (
      url.searchParams.get("asset") !== "calendar" ||
      url.searchParams.get("version") !== record.version
    )
      return new Response(null, { status: 404, headers });
    if (Date.parse(record.expiresAt) <= now().getTime())
      return new Response(null, { status: 410, headers });
    return new Response(
      request.method === "HEAD"
        ? null
        : Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0)),
      { headers },
    );
  };
  return createWebhookHandler({
    getSecret,
    fetchImpl,
    log,
    imageResponse,
    resolveMessages: (event) => {
      if (
        event?.source?.type !== "group" ||
        event?.type !== "message" ||
        event.message?.type !== "text" ||
        !commandFor(event)
      )
        return [];
      return commandReply(commandFor(event)) ?? buildPreparedMessages(record, { imageUrl, webUrl, now: now() });
    },
    snapshotInfo: () => ({
      fixture_version: record.version,
      candidate_count: record.share.candidates.length,
      execution_mode: "fixed_demo",
    }),
  });
}
