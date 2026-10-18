# 更新時生成・LINE固定版デモ

この経路は公開可能な架空データ専用デモ。実利用者の予定、DB、Google、共有同意処理は未接続。実予定での本番共有を有効化しない。既存WebhookのURL・動作は変更しない。

## 準備
node scripts/prepare-line-demo.mjs https://公開するWebのオリジン

固定入力から共通演算→サーバーPNG→画像保存→結果保存の順で実行し、base44/functions/line-card-demo/prepared.jsonを生成する。デモ用保存先はこのファイル。実DB/非公開ストレージへのアップロードではない。手動でこのコマンドを実行することがカレンダー更新のシミュレーション。既存のGoogle更新ボタンには接続しない。prepareCardのstore.saveImage/saveResultを後から置換する。DBのトランザクションや最新版切替の保証は未実装。

## 動作
Webは /me/card-preview?version=生成した版。LINEと同じ固定JSON・事前PNGを表示。選択はWeb内だけの下書き。新しいデモ生成で古いファイルは置換され、旧版Webリンクは不明版表示となる。複数版保持はDB接続後。URLに指定されない版や任意ファイルは配信しない。画像は対象最終日の7日後の終わりまで、その翌日00:00 JSTに停止。

LINE関数line-card-demoを個別デプロイして検証可能。グループの@リスケ/＠リスケのみ、署名検証後に固定カード2メッセージを返信（取得時刻テキスト＋画像/候補/リンク）。画像生成・演算は呼び出し時にしない。既存LINE_CHANNEL_SECRET/LINE_CHANNEL_ACCESS_TOKENを使う。LINE DevelopersのWebhook変更と実送信は別途明示承認後。公開WebのURLが表示可能であること、画像配信URLがHTTPS200 image/pngであることを先に確認する。古い公開URLが未公開案内の場合は利用不可。デモの既定Webオリジンをそのまま本番利用できるとは保証しない。

## 制約
固定データなので画像URLは匿名公開。実データの非公開保存・署名付き配信・同意撤回・本人紐付け・DB永続重複排除・自動削除は未接続。現在の重複排除は1インスタンス内だけ。実利用者共有へ流用不可。送信はreplyのまま、Pushや自動再送を追加しない。

## 確認
node --test test/*.test.js、npm run lint、Base44 build。PNGのデコードと決定性、失敗時非公開、版照合、期限、署名、グループ限定、重複、LINE送信内容を固定テスト。公開後のLINE実表示・スマホ描画は別途必要。

実SDK用のcreatePrivateCardStoreはUploadPrivateFileへPNGを保存し、file_uriを返す。saveResultだけをDBアダプターで注入する。実SDKへのアップロードは未実行で、テストはSDK境界を固定。事前生成デモでは利用しない。

既存line-webhookのテスト候補本文も、node scripts/prepare-line-candidates.mjsで/meと同じ固定入力と演算から事前生成する。candidates-data.jsonを参照し、Bot呼出し時には再計算しない。生成日は日本時間で明記。/meは日付が進むと再計算するため、日付経過後はこの生成スクリプトの再実行と関数の再デプロイが必要。既存の疎通PNGは表示確認用のままで候補の星との一致は保証しない。新しいline-card-demoの事前生成PNGとは別。
