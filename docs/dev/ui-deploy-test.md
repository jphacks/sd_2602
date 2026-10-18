# UIデプロイ確認（2026-10-18）

- 実装コミット: e6f96c060a4a
- Base44 CLI: 0.1.32
- lint成功、全32テスト成功、base44 build成功。
- ローカルモードのbase44 devを起動し直し、http://localhost:5173/me のHEAD応答200を確認。
- 通常のsite deploy --no-build -yはMissing index.html at root of archiveで失敗。
- インストール済みCLIのSSR対応経路（BASE44_DEPLOYMENTS_API=1）を確認し、site deploy --no-build -yを再実行。静的アセット11件とWorker 35モジュールのアップロード後にSite deployedを確認。
- デプロイID: 6ad3509425cadbfc49e423a5-git-e6f96c060a4a
- エンティティ・コネクタ・認証設定・LINE関数の同期は実施していない。
- base44 site openによる公開URL取得はApp not foundで失敗。公開ドメインの到達確認は未完了。デプロイ完了と公開URLの取得成功は区別する。
- ブラウザの既存ローカルタブはURLポリシーによりアクセスを拒否され、今回の見た目の再確認は実施できていない。
- 現在の画面は固定テストデータ専用。Google実予定・LINE実共有は未接続。

## 追加調査
アプリメタデータ200・LINE関数200。管理画面Domainsで sync-engine-copy-49e423a5.base44.app を確認。/me と /me/pair は200だが、ブラウザ上は「リスケRisukeはまだご利用いただけません」「Builderで公開してください」のBase44案内。今回のSSR画面は配信されていない。is_managed_source_code=false、site_framework=null、build_deploy_enrolled=false、fullstack_app_serving=null、last_deployed_at=nullを観測。フラグの直接変更はしていない。概要には「GitHubリポジトリをリンクするとBase44で編集できる」という案内がある。公開方式・既存リポジトリとの接続確認が必要。

## 改善第1段階のローカル確認
新しい公開確認スクリプトはローカル2画面をEXPECTED_APP_SERVED、組み込み公開URLの2画面をEXPECTED_APP_NOT_SERVEDと判定。200応答を公開完了の根拠にしない。管理画面の無料URL表示とも一致。Googleコネクタはアプリユーザーとして「りすけ Google Calendar 開発用」が登録済み。UI詳細にはConnector IDの表示なし。calendar.eventsとcalendar.readonlyが登録されており、最小のevents.readonlyへ整理する確認が必要。設定・スコープ・シークレットは変更していない。
