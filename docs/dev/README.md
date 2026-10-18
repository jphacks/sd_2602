# リスケRisukeの開発手順

すべてリポジトリのルートで実行します。表示名はリスケRisuke、内部識別名はrisukeです。

## 1 初期設定とローカル起動

~~~bash
npm ci
npx base44 login
npx base44 link
npx base44 dev
~~~

既にリンク済みならlinkのやり直しは不要です。`base44/.app.jsonc` はGit管理外のローカル連携情報。
現在の対象IDは `6ad3509425cadbfc49e423a5` です。
`base44 dev` はローカルのバックエンドを使用します。`--remote` は実環境のデータに接続するため通常の検証には使いません。

## 2 テストとコード検査

~~~bash
node --test test/line-webhook.test.js test/line-cards.test.js
npm run lint
~~~

LINE返信は模擬通信で確認し、テストから実LINEへ送信しません。
旧ローカルBotの4テストは撤去済み。画像テストを含む現行Base44関数の15テストを実行します。

## 3 LINE関数の編集・デプロイ

| ファイル | 役割 |
| --- | --- |
| [entry.js](../../base44/functions/line-webhook/entry.js) | Base44のHTTP受付・Secrets接続 |
| [handler.js](../../base44/functions/line-webhook/handler.js) | 署名検証・キーワード判定・Flexカード返信 |
| [line-webhook.test.js](../../test/line-webhook.test.js) | 模擬イベントによる検証 |

~~~bash
npx base44 whoami
npx base44 functions deploy line-webhook
npx base44 functions list
~~~

この関数だけの公開にサイトのビルドは不要です。関数名を指定して反映します。
公開受付：[line-webhook](https://base44.app/api/apps/6ad3509425cadbfc49e423a5/functions/line-webhook)。
GETは稼働確認で200、署名なしPOSTは401。Secrets未設定の署名付きPOSTは503で停止します。

## 4 Secretsと実LINEの確認

Base44の対象アプリのSecretsに `LINE_CHANNEL_SECRET` と `LINE_CHANNEL_ACCESS_TOKEN` を登録します。
LINE Developersの対象Messaging APIチャネルでWebhook URLを上記公開受付に設定し、VerifyとUse webhookを確認します。
個別トークへ `＠リスケ` または `@リスケ` を送ると、テスト候補3枚ともっと見る1枚の画像付きカードを返信します。実予定ではなく仮データです。
PCのサーバーやトンネルは使いません。

旧Botの `.env` はルートの `.env.line.local` に保管しました。秘密を含むためGitへ追加しません。
旧HOST/PORTなどが含まれる可能性があり、そのまま全項目を再インポートする必要はありません。
秘密の値をソース・ログ・ブラウザー向け環境変数へ記載しません。

## 5 ログと制約

~~~bash
npx base44 logs --function line-webhook --since 30m --limit 30
~~~

request_idとwebhook_received / keyword_matched / reply_sent / webhook_failedで処理を追います。
SIGNATURE_INVALIDは署名不正、LINE_NOT_CONFIGUREDは秘密未設定、LINE_REPLY_FAILEDは明示拒否、LINE_DELIVERY_UNKNOWNは送信結果不明です。
本文・ヘッダー・秘密は記録しません。重複抑止は同一インスタンス内のみで、配信保証・耐久キューは未実装です。

## 6 サイト全体の公開（必要なときのみ）

~~~bash
npx base44 build
npx base44 deploy --no-build
~~~

buildはアプリIDを注入します。全体deployはエンティティ等も反映するため、関数の編集だけなら第3節の手順を使います。
リンク先・権限・[公開条件](../spec/checks.md)を確認して実行します。

## 関連資料

- [開発計画](plan.md)
- [LINE公開時の検証結果](line-deploy-test.md)
- [整理と名称変更の記録](cleanup.md)
- [現行仕様](../spec/index.md)


画像と仮データの編集・確認は [LINE画像カードテスト](line-card-test.md) を参照してください。もっと見るのリンク先は未実装です。


## 個人ページ

[個人ページの検証・制限](personal-page.md)を参照。Googleは開発予定の表示のみです。

- [2人リスケの比較・候補・画像保存（固定テスト）](pair-page.md)
