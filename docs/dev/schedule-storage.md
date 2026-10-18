# 本人用の最小保存

作業ブランチ codex/minimal-schedule-storage。/accountを開くと保存済みを読む。Google取得は本人操作のみ。読込完了→CalendarSource→AvailabilitySnapshot→UserProfileの最新参照、の順で保存する。候補除外は保存、活動時間・期間は固定。ログはsaving/saved/failedと安全なコードのみ。

## 検証
node --test test/storage.test.js test/google.test.js：固定Google応答とインメモリDBで、保存再読込、各段階失敗、所有者差替え、除外永続化、0件と取得失敗の区別、RLS定義を確認する。クラウド上の権限を証明する試験ではない。
実DBでは利用者A/B/匿名による直接CRUD拒否、本人サーバー保存再読込、他人参照拒否、取得失敗時の前回版維持を別途検証する。

## 反映前の注意
CLI entities pushは全エンティティ同期であり、ローカルにない定義を削除する。スキーマ反映前に管理画面の現定義と照合し、別ブランチ／Builderの追加を消さない。今回はサイト公開を行わない。
同時実行の厳密な順序保証、途中レコードの自動清掃、保持期限の自動削除は未実装。保存した実予定は読み取りに必要な最小項目のみ。共有／LINEへつながない。
