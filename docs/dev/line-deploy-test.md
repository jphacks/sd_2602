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

## 経路比較の調査記録（2026-10-19）

LINE公式GET /v2/bot/channel/webhook/endpointは200。登録先は既存line-webhook、active=true。関数2つのデプロイ成功による自動切替はない。両関数が生成するFlexのvalidate/replyは200（実送信なし）。GET 200／署名なしPOST 401も両関数で確認済み。

line-webhookは旧1人版候補・緑色画像・/me、line-card-demoは固定2人版候補・事前生成2色画像・/me/card-preview?version=…を使用。後者の候補は11/8・12・14、選択画像の★は11/9・13・15で不一致。新コマンドとタップ操作の反映と、希望画像・候補への統一を混同していた。修正は未実施。「完成形のLINE確認済み」とは扱わない。

以後は docs/spec/checks.md のV37〜V42に従い、実接続先から画像・データ・リンクまで追跡する。LINE登録先の変更は読み取り確認と区別し、承認された範囲で実施する。確認に使った秘密や認証ヘッダーは記録しない。

## 最終の接続先と確認結果（2026-10-19・上記のURL維持案を更新）
Base44からpullしたline-webhookのコードは新版だったが、同名の公開URLは旧画像処理を返した。内部原因は未確定で、CLI成功だけでは公開ルートの更新を保証できないことを実測。旧関数は削除せず、LINE公式APIでWebhookを検証済みの **line-card-demo** へ明示切替えた。今後の正規LINE受付は https://base44.app/api/apps/6ad3509425cadbfc49e423a5/functions/line-card-demo 。active=trueを再取得済み。line-webhookの公開応答は現行の確認に使わない。旧経路の削除・プラットフォーム側の原因解明は行っていない。
結果版8c0726e2-0f7d-4e6b-8992-e62236007e5a、候補11/9・13・15、承認JPEGのSHA-256一致、画像200/image/jpeg、同じ関数の版付き詳細200/text/html、LINE validate/reply 200、旧画像版404を確認。V37〜V40の経路・内容照合は合格。V41の実LINE新規返信・タップ表示は本人による確認待ち。実トークへの送信は未実施。関連26テスト・Lint・Base44ビルド成功。
以後は node scripts/package-line-functions.mjs --check と node scripts/verify-line-route.mjs を公開確認に使用する。後者は秘密を表示せず登録Webhook・active・画像実体ハッシュ・詳細の日付と版・LINE形式・旧版拒否を照合する。メッセージ送信や設定変更はしない。チャネルのローカル秘密バックアップがある開発者環境で実行する。選択画像は10/19基準の固定テストで、自動更新する実共有ではない。
