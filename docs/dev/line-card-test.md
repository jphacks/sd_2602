# LINE画像カードのテスト

更新日：2026-10-18。利用者が提供したPNGと仮データによる表示テスト。
製品本体の本人連携・Google取得・共有許可・固定共有ページの完成を示すものではありません。

## 使い方

1. 既存の公式アカウントへ `＠リスケ` または `@リスケ` を送る。
2. 添付画像を共用する候補3枚＋もっと見る1枚のFlexカルーセルを確認する。
3. 「この候補を提案する」を押すと、押した人の発言としてテスト提案文が投稿される。
4. 「もっと見る」はexample.comの仮URL。リンク先ページは今回作成しない。

年月のない画像のため候補日は「テスト月19日・24日・29日」。多忙時間帯はそれぞれ13〜14時・16〜18時・10〜11時。
活動時間09〜22時、Asia/Tokyoも含め、画像から実予定を推測した値ではなく固定の仮データです。
すべてのカードにテスト表示を付け、提案文に「テスト提案」を付けています。

## ファイルと固定版

| ファイル | 役割 |
| --- | --- |
| [cards.js](../../base44/functions/line-webhook/cards.js) | image-demo-v1の仮データと純粋なカード組立 |
| [image.js](../../base44/functions/line-webhook/image.js) | 固定PNGの公開GET/HEAD受付 |
| [image-data.js](../../base44/functions/line-webhook/image-data.js) | 添付PNGの元バイト列をBase64で保持 |
| [calendar-demo.png](../../test/fixtures/calendar-demo.png) | 照合・再現用の元画像 |
| [line-cards.test.js](../../test/line-cards.test.js) | 候補数・画像共用・提案・仮URL・版・元画像一致の検証 |

画像URL： https://base44.app/api/apps/6ad3509425cadbfc49e423a5/functions/line-webhook?asset=calendar&version=image-demo-v1

画像は元PNGの589×378、17,157バイトを変更せず使用。上記URLは承認されたテスト画像だけを公開し、ファイルパスや秘密を指定して読む機能はありません。
元画像や仮データを変える場合は版を更新します。製品の予定画像をこの公開テスト経路へ流用しません。
LINE依頼時に画像生成・Google取得・再計算は行いません。

## 確認

~~~bash
node --test test/line-webhook.test.js test/line-cards.test.js
npm run lint
npx base44 functions deploy line-webhook
~~~

- ローカル15テストとESLintは成功。
- LINE公式の `/v2/bot/message/validate/reply` は200。これは形式検証であり、メッセージ送信は発生しません。
- 実LINE端末での見え方・提案ボタンの投稿は利用者側で確認します。
- Base44 CLIでline-webhookの再デプロイに成功（1 deployed）。
- 公開PNGはHTTP 200・image/png・17,157バイト。元の添付画像とのSHA-256一致を確認。
- 稼働確認GETと正しい署名の空events POSTが200。空イベントのため実メッセージ送信なし。
- 現行資料の相対リンク切れ0件を確認。Webhook URL・アプリID・既存Secretsは維持。

ログのcards_preparedにはfixture_version・item_id・candidate_count・card_countを出力します。
本文・画像内容・秘密はログへ出しません。同一インスタンス内の重複抑止は既存どおりです。

コミット草案：`[追加] 添付画像と仮候補でLINEカードの表示と提案操作を検証可能にする`
