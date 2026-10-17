# Base44 LINE関数のデプロイテスト結果

確認日：2026-10-18（Asia/Seoul）。対象は既存連携アプリ `6ad3509425cadbfc49e423a5`。

## 結果

- Base44 CLI 0.1.32で `functions deploy line-webhook --json` を実行し、`1 deployed` を確認。
- 公開先の関数一覧に `line-webhook` が1件存在することを確認。
- 公開URL： https://base44.app/api/apps/6ad3509425cadbfc49e423a5/functions/line-webhook
- 認証ヘッダーなしGET：200、`{"ok":true,"service":"risuke-line"}`。
- 署名なしPOST（空のevents配列）：401、`SIGNATURE_INVALID`。
- ダミーの署名ヘッダー付きPOST（空のevents配列）：503、`LINE_NOT_CONFIGURED`。署名検証成功を意味せず、秘密未設定時に処理を止める確認。
- Base44の関数ログに `[line-webhook] GET → 200` を確認。
- ローカル：新規10件＋既存Bot4件の14テストすべて成功。LINE通信は模擬処理。
- ESLint：既存lintスクリプトと同じ `eslint . --quiet` をローカルの実行ファイルから起動し、終了コード0。

## 変更したもの

- `base44/functions/line-webhook/entry.js`：Base44のHTTP受付とSecretsの接続。
- `base44/functions/line-webhook/handler.js`：署名検証・入力制限・キーワード判定・LINE返信。
- `test/line-webhook.test.js`：秘密未設定・署名・本文・返信・失敗・同一インスタンスの重複確認。
- `architecture.md` と `README.md`：疎通用関数の構造と手順を追記。
- リポジトリのAGENTS.mdの指示に従い、公式 `base44-cli` / `base44-sdk` スキルとインストール管理ファイルを追加。

## 今回実行していないもの

- LINEの秘密情報の転送・登録、LINE DevelopersのWebhook設定変更、実LINEへの返信。
- サイトのビルド・公開、エンティティの反映、DB操作、Google Calendar連携。
- Gitのコミット・プッシュ。

サイトURL取得コマンドはApp not foundを返したため、Webサイトの公開確認としては扱わない。
上記URLの関数については、実際のHTTP応答を別途確認済み。

## 次の確認

実LINE接続を行う際は、同じチャネルのLINE_CHANNEL_SECRETとLINE_CHANNEL_ACCESS_TOKENを
Base44 Secretsへ安全に登録し、上記公開URLをWebhookとして設定する。
LINEのVerify成功後、個別トークで「＠リスケ」を1回送り、返信とログを確認する。
今回は実施していないため、LINE Botの実機動作確認済みとはしない。

重複抑止はインスタンス内のみ。複数インスタンス・再起動後の配信制御は別途必要。
予定取得・本人対応・共有許可・耐久キューはこの疎通用関数には未接続。

## その後の確認と配置変更（2026-10-18）

上記は初回デプロイ時点の記録。以後、利用者がSecretsを登録し、Botで受信できたと報告した。
返信受信・トンネル停止時の継続稼働までを、この報告だけで確認済みとは扱わない。
旧line-schedule-botとその4テストは撤去し、現行関数の10テストを残した。
現在の手順は [開発手順](README.md)、整理内容は [整理記録](cleanup.md) を参照する。
