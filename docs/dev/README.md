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
$env:BASE44_DEPLOYMENTS_API = "1"
npx base44 site deploy --no-build -y
~~~

buildはアプリIDを注入します。このTanStack Start構成はSSR Workerを含むため、CLI 0.1.32ではBASE44_DEPLOYMENTS_API=1でサイト専用の公開経路を使います。通常のsite deployは静的アーカイブとして扱われ、Missing index.html at root of archiveで失敗します。全体deployはエンティティ・コネクタ等も同期するため、画面の公開には使いません。関数だけの編集は第3節を参照してください。
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

## 公開完了の判定（更新）
BASE44_DEPLOYMENTS_API=1はCLI内で確認した経路だが、現アプリで本番配信まで有効とは確認できていない。現時点で成功手順として再デプロイしない。Workerのアップロード成功、公開ドメインへの割当、実画面の応答を別々に確認する。node scripts/verify-site.mjs <origin> は /me と /me/pair のHTTP200に加えて本アプリ固有の描画マーカーを確認し、Base44の汎用案内ページを成功扱いしない。

Google接続入口は /account。Base44のApp user connector IDをGOOGLE_CALENDAR_CONNECTOR_IDとしてサーバー設定へ登録する。Google OAuthクライアントIDやシークレットをこの項目に入れない。設定未確認のため現在は登録・実認可していない。

LINE関数の配布制約：関数フォルダー外への相対importはBase44で利用不可。共通表示と署名付きHTTP処理は `node scripts/package-line-functions.mjs` でline-card-demo内へ同梱する。変更後は `node scripts/package-line-functions.mjs --check` と関連テストを実行してから2関数をデプロイする。生成先presentation.js/transport.jsは直接編集しない。

現在のLINE登録先はline-card-demo。line-webhookは旧公開応答が残るため利用しない。最新の接続確認は node scripts/verify-line-route.mjs。詳細はdocs/dev/line-deploy-test.md末尾を参照。
