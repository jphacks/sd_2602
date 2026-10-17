# 実行ID・処理段階・エラーコード

更新日：2026-10-17。実装前のデータ契約。ローカルとBase44で同じ識別・状態・コードを使う。実装済みや厳密な一回限り処理の保証ではない。

## 1 対応するToDoと完了条件
対象は「実行ID・段階・エラーコードを決める」。以下が説明できれば設計として完了とする。
- 同じ依頼の取得・計算・保存・LINE送信をrun_idで検索できる。
- 正常0件、未連携、共有未許可、取得失敗、保存失敗、送信結果不明を区別できる。
- 処理段階の開始・終了・所要時間と、使用した入力版を追える。
- ログに残す項目・残さない秘密情報が決まっている。
- 別作業としてログ実装と障害注入テストを実施する。設計完了を動作確認完了としない。

## 2 IDと版
| 項目 | 決める形式と役割 |
|---|---|
| run_id | アプリ側で発行するUUID v4文字列。1回の有効な操作全体で共通。DBレコードの標準idとは別 |
| request_id | HTTP受付単位のUUID。認証前の失敗も追跡可能。Webhook再送では別request_idになる |
| webhook_event_id | LINEが付与したイベントID。署名検証後に扱い、再送の同一操作を識別する。run_idの代用にしない |
| retry_of | 再試行元run_id。再試行は新run_id。元の終了状態を上書きしない |
| source_revision | CalendarSourceの取得版。全ページ取得・検証成功後の結果を指す |
| settings_version / edit_version | 計算開始時の設定・調整集合の版。不透明なUUIDを使う案。連番大小で順序を推測しない |
| permission_version | 発行・送信・閲覧が参照する許可版。再許可時は変更し旧リンクを復活させない |
| result_snapshot_id / share_snapshot_id | 保存済みの計算結果・公開版のBase44 id。作成前・失敗時はnull |

UUIDの形式はID発行方法であり、DBの一意制約や処理順序を保証しない。日時だけを実行IDにしない。

## 3 trigger（操作の種類）
| 値 | 意味・実行範囲 |
|---|---|
| fixture_check | 架空データで読込・計算・ローカル保存を検証 |
| web_refresh | Webから予定を再取得して再計算 |
| line_request | LINEの有効な依頼から再取得・計算・必要な共有・返信 |
| settings_change | 活動時間・期間等の設定変更。必要なら取得範囲を補完 |
| manual_edit | 時間帯調整を保存・適用し、多忙度と候補を再計算 |
| manual_reset | 対象時間帯の調整解除後に再計算 |
| exclusion_change | 日付の候補除外・解除。多忙度は変えず候補のみ再計算 |
| share_grant | 対象グループの許可・許可版を保存 |
| share_revoke | 許可解除・許可版変更・関連リンクのアクセス停止 |

通常会話・日付ボタンからの投稿は操作runとして永続保存しない。一般会話の本文を収集しない。共有閲覧は通常のAPIアクセスログで扱い、毎回OperationRunを増やさない。

## 4 stage（処理箇所）
実行状態とは別の項目。不要な段階はskippedとし、偽の成功を作らない。設定変更などは下記の全段階を通る必要はない。

| stage | 内容 | 主な観測項目 |
|---|---|---|
| receive | 受付・依頼判定・再送の照合 | request_id、検証済みevent ID |
| authorize | 本人・Google連携・グループ許可確認 | 所有者参照、許可版、拒否理由 |
| load | 設定・保存済み予定・調整・仮データ読込 | 使用した版、取得済み範囲 |
| fetch | Google APIの全対象ページ取得 | ページ数・予定件数・所要時間 |
| normalize | 共通形式への変換と検証 | 受信・有効・除外件数 |
| apply_adjustments | 計算区間への変換と手動調整の適用 | 設定版、調整版、調整数 |
| calculate | 日別・時間別多忙度の生成 | 対象日数、未取得日数 |
| recommend | 除外・順位付け・最大3件の選出 | 候補件数、valid/empty |
| persist | 設定・調整・取得データ・結果等の保存 | 保存対象の種類、結果ID、成功・失敗 |
| publish | 入力版の再確認と本人用最新参照の切替 | 公開版、古い結果の排除 |
| prepare_share | 許可確認・固定共有版とリンクの準備 | 共有版ID、許可版、期限 |
| deliver | 送信直前の許可確認・LINE返信 | delivery_state、応答種別、所要時間 |

共有解除runはauthorize→persistで許可版を変え、既存リンクを停止する。専用APIが現在の許可版も検証するため、一括失効更新が未完了でも旧版を許可しない設計とする。Base44上の競合保証は別途検証する。

## 5 実行・段階・送信状態
### 5.1 run.state
- queued：受付済み、処理開始前。
- running：処理中。
- succeeded：その操作に必要な処理が完了。LINE依頼なら必要な返信の受理確認まで。候補0件でも案内返信が成功すればsucceeded。
- failed：必要な処理のいずれかが失敗・中断・送信結果不明。計算が成功済みならその結果は別項目で残す。
- superseded：新しい設定・調整・実行に置き換わり、最新結果として採用しない。
- ignored：署名検証後、処理不要と判断。通常会話は原則runを作らず、この状態は制御上必要な受信記録だけに使う。

終了状態は巻き戻さない。起動時復旧・段階内再試行の回数と待機時間は実装時に定める。処理停止をrunningのまま永久放置せず、時間超過の検出方法を決める。

### 5.2 stepsとdelivery_state
- stepsはstage、attempt、started_at、finished_at、duration_ms、state（running/succeeded/failed/skipped）、error_codeを持つ小さな配列。
- 同じ段階を複数回通る場合、attemptで区別。大きな入出力は格納せず参照ID・件数のみを残す。配列上限は再試行方針と一緒に決定。
- delivery_stateはnot_required / pending / sending / sent / failed / unknown。
- sentはLINE APIが受理した意味。既読や端末表示は保証しない。
- failedは送信前に失敗、または未受理と判断できる明示的な拒否。通信断で受理の有無が不明ならunknown。
- 送信結果不明を自動再送すると二重返信になり得る。再試行・Push代替の条件を決めるまで無条件に実行しない。
- 計算・保存の失敗を案内する返信が届いてもrun.stateはfailedのまま、delivery_state=sentとする。

## 6 error_codeと正常な理由コード
error_codeは成功時null。失敗の段階はstage、原因分類はerror_code、再試行可否は別のretryable（true/false/null）で表す。nullは判断未了で、再試行許可ではない。

| code | 意味 | 扱い |
|---|---|---|
| INPUT_INVALID | 入力形式・値・期間が不正 | 入力修正まで繰り返さない |
| SIGNATURE_INVALID | LINE署名不正 | HTTP境界で拒否。信頼済みuser IDとして保存しない |
| IDENTITY_UNLINKED | LINE本人連携なし | 個別連携案内。別人へ代替しない |
| IDENTITY_AMBIGUOUS | 本人対応が重複・曖昧 | 処理停止、管理側で解消 |
| GOOGLE_UNLINKED | Google未連携 | サイトで連携案内 |
| GOOGLE_AUTH_REQUIRED | Google認可失効・再認可が必要 | 再認可後に再依頼 |
| SHARE_NOT_ALLOWED | 対象グループに共有許可なし | 個別許可案内、実データを返さない |
| SHARE_PERMISSION_CHANGED | 処理中に許可版変更・解除 | 共有停止 |
| GOOGLE_FETCH_FAILED | Google取得失敗 | 失敗案内。外部応答に応じ再試行判断 |
| GOOGLE_FETCH_INCOMPLETE | 必要な全ページを取得できない | 部分結果を完成版にしない |
| EXTERNAL_RATE_LIMITED | 外部APIの制限 | 提供側の待機条件を確認 |
| EXTERNAL_TIMEOUT | 外部処理の待機時間超過 | 取得の再試行と送信結果不明を区別 |
| NORMALIZATION_INVALID | 予定の形式・時刻整合が不正 | 仮データ・取得データ・変換を調査 |
| ADJUSTMENT_INVALID | 調整値・区間が規則に合わない | 調整を保存せず入力へ戻す |
| CALCULATION_FAILED | 多忙度計算失敗 | 新しい結果を公開しない |
| RECOMMENDATION_INVALID | 選出結果に対象外日・重複等 | 候補を送らず処理を調査 |
| STORAGE_READ_FAILED | 保存済みデータを読めない | 未取得を空きとして扱わない |
| STORAGE_WRITE_FAILED | 必須データ・制御状態の保存失敗 | 保存成功と表示しない |
| VERSION_CONFLICT | 設定・調整・実行版の不一致 | 古い結果を公開しない。通常はsuperseded、想定外不整合はfailed |
| SHARE_UNAVAILABLE | 共有リンクが無効・期限切れ・参照不整合 | 公開情報を返さず再依頼を案内 |
| LINE_REPLY_FAILED | LINEが返信を明示的に拒否等 | 取得成功と送信失敗を分離 |
| LINE_DELIVERY_UNKNOWN | 返信の受理有無が不明 | delivery_state=unknown。無条件再送なし |
| OPERATION_TIMEOUT | 実行が期限内に終了しない | 途中処理を検出・結果と送信状態を確認 |
| INTERNAL_ERROR | 未分類の想定外例外 | 秘密を除いた技術情報をサーバー側で調査 |

正常な理由はerror_codeに混ぜない。reason_codeにNO_CANDIDATES（正常0件）、DUPLICATE_EVENT（再送検出）、COMMAND_NOT_MATCHED（依頼対象外）を使う。
通常会話でCOMMAND_NOT_MATCHEDとなっても本文や全員分のrunを保存しない。IDは制御上必要な範囲に限定する。
未連携・未許可は想定内の案内なのでinfo/warn、障害はerrorなど、severityと画面表示を原因コードとは分ける。ユーザーへスタックトレースを返さない。

## 7 構造化ログの形式案
ログ1行は1イベント。OperationRunは現在の状態の正本、構造化ログは経過調査用として分ける。

~~~json
{
  "timestamp": "2026-10-17T03:00:00.000Z",
  "level": "info",
  "event": "stage_completed",
  "run_id": "68427899-4d6a-49e9-a61c-77f70d1c6418",
  "request_id": "8fa396a3-fce7-49e6-9ad7-70ce762c9c2b",
  "trigger": "line_request",
  "stage": "recommend",
  "attempt": 1,
  "state": "running",
  "source_revision": "source-test-001",
  "settings_version": "settings-test-001",
  "edit_version": "edits-test-001",
  "candidate_count": 0,
  "reason_code": "NO_CANDIDATES",
  "error_code": null,
  "duration_ms": 12
}
~~~

これは架空の例。版名のtest接頭辞は仮データ用で、実環境の版は不透明なIDを使う。state=runningはrecommend段階が終了しても返信が未完了のため。
eventはrun_started / stage_started / stage_completed / stage_failed / run_completed / duplicate_detected等の固定値。
ローカルは同じJSONを標準出力へ出し、Base44では関数ログへ出す。ログに大きな別エンティティを追加しない。ブラウザにはrun_idと安全な表示メッセージのみを返す。

## 8 記録しないものとログ障害
- APIキー、OAuthトークン、LINEチャネル秘密、返信トークン、共有リンクの生トークン、Authorizationヘッダー。
- 予定名・本文、予定配列全文、通常会話全文、カードの全文、不要なメールアドレス。
- userId/groupIdが制御に必要なら保護されたOperationRunまたは関連レコードに限定。構造化ログには原則内部参照IDを使う。
- 外部APIのエラー本文をそのまま出さず、許可したコード・HTTP状態・安全な要約を記録する。
- ログから候補や調整を復元して正本として使わない。正本はDBの設定・調整・計算版。
- 調整保存成功→再計算失敗なら、調整は保存済みと伝え、候補は再計算必要として残す。
- 調査用ログの出力失敗だけで、既に保存した変更を取り消したと表示しない。必須制御状態をOperationRunへ保存できない失敗は別で、外部送信前なら送信を止める。
- DB全体が停止した場合はOperationRunにも書けない。サーバーのログに最小限の失敗を出し、クライアントへ成功を返さない。ログ永続化そのものを成功保証にしない。
- ログ・受信記録・送信待ち情報の保持期間と自動削除は未決。秘密を含む旧ファイル状態をそのままログへ移さない。

## 9 必須の動作確認（設計タスクとは別）
1. 架空入力から取得相当・正規化・計算・保存を同じrun_idで追える。
2. 正常0件はreason_codeのみで表現し、エラーと区別する。
3. Google途中取得失敗、形式不正、DB保存失敗が正しい段階・コードになる。
4. 手動調整の保存成功と再計算失敗が混同されない。
5. 設定変更後に古いrunが戻っても最新結果を上書きしない。
6. LINE再送は同じイベントとして照合し、再試行runは別IDとretry_ofを持つ。
7. LINE送信拒否と送信結果不明を分け、計算結果の成否も保持する。
8. グループ許可解除・再許可で旧リンクと送信待ちが復活しない。
9. 通常会話・日付投稿に反応せず、秘密・本文・共有トークンがログにない。

関連：[Base44用DB草案](schedule-state-and-schema.md)、[内部設計](schedule-internal-flow.md)、[LINE仕様](schedule-line-spec.md)。
