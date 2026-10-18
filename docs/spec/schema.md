# 状態遷移とDB草案：Base44最小構成

> 最新合意・現在の実装状態は [最新仕様](current.md) を参照。過去の初版／将来区分や共有範囲と競合する場合は同書を優先する。

更新日：2026-10-18。Base44採用を前提に、本人の芝・候補・LINE共有に絞った設計草案。エンティティ名・項目・制御は本書の提案であり、スキーマ適用・接続検証済みではない。
旧PostgreSQL草案は[アーカイブ](../archive/2026-10-17-before-base44-redesign/schedule-state-and-schema.md)、検証版の保存説明は[別資料](../archive/local-line/storage.md)に残す。

## 1 範囲と原則
- 仮データ→正規化→計算→保存・再読込→UIを確認し、同じ契約の保存口をBase44へ差し替える。受付と実行を分離し、UIのみの機能は業務キューへ登録しない。
- 実API接続はテスト利用者1人でGoogle予定再取得と実LINE返信を通す。
- 手動調整は候補からの日付除外と時間帯編集。日別多忙度は直接編集しない。日時・調整の仮ロジックは交換可能とし、入出力の意味・単位を保つ。具体的な調整ルールはP01で次の設計時に相談する。
- 共有は固定版リンク、グループ別許可・解除・期限を必須とする。共有画像保存とカード自動生成は初版へ追加。4人比較、AI補正、詳細な開発者画面、エクスポート、毎日の自動更新は将来機能。
- 旧投票Botは別経路の検証版。今回の候補日投稿に投票・集計・確定テーブルを追加しない。
- Google由来の予定、手動入力、計算結果、公開情報を分離。計算途中のデータを完成した結果として返さない。
- 7種類は最小構成案。単なる件数削減のために所有者・公開範囲・寿命が違う情報を一緒に公開しない。

## 2 Base44の前提
- 標準Userを認証主体として利用。独自users・auth_identitiesは作らず、アプリのowner_idに標準Userのidを保存する。
- 各エンティティにはBase44標準のid、created_date、updated_date等があるため再定義しない。ローカル側では同じ役割の値を補う。
- ISO日時・ISO日付、数値、真偽値、配列・オブジェクトを使う。DB型timestamptzやSQLの複合主キーは持ち込まない。
- エンティティ間のID参照は論理的な関連。参照先・所有者・版の一致はサーバーで検証する。
- 一意制約、行ロック、複数レコードのトランザクション、比較更新の提供を仮定しない。作成前の存在確認だけで重複・競合を完全に防げたとは扱わない。
- RLS/FLSとバックエンド関数のアクセス検証を設計する。サービス権限による処理はRLS/FLSを迂回するため、関数内で署名・本人・所有者・共有許可を検証する。
- クラウドでの競合制御は接続検証の必須項目。未検証のまま複数実行・厳密な一回限り配信を保証しない。

## 3 エンティティ一覧（標準User＋7種類）

| 名前 | 用途 | 主な項目案 | 権限・更新 |
|---|---|---|---|
| UserProfile | 本人設定・LINE対応・連携状態 | owner_id, timezone, activity_windows[], search_days, excluded_dates[], line_user_id, line_display_name, google_connection_ref, google_status, settings_version, edit_version, latest_snapshot_id, current_run_id, candidate_state | 本人専用。LINE対応・接続参照・版・最新参照は検証済みサーバー処理でのみ変更。秘密は含めない |
| CalendarSource | 全取得成功分の正規化予定 | owner_id, source_revision, run_id, calendar_id, fetched_at, timezone, range, events[], schema_version | 本人の内部データ。取得単位で作成し確定後は不変。予定名・本文なし |
| ManualAdjustment | 現在有効な時間帯調整 | owner_id, start/endまたは日付・枠, adjustment_value, active, adjustment_revision | 本人のみ。具体的な区間・値の型は編集仕様確定後。Google予定を上書きしない |
| AvailabilitySnapshot | 同じ入力版から計算した芝・候補 | owner_id, run_id, source_id, settings_version, edit_version, adjustment_refs[], calculation_version, timezone, generated_at, range, daily[], hourly[], candidates[], candidate_state, schema_version | 本人用。計算と検証が完了した結果を作成。不変。日別・時間別・候補を1レコード内にまとめる |
| GroupPermission | 利用者×グループの共有許可 | owner_id, line_group_id, state, permission_version, granted_at, revoked_at | 本人が個別画面から許可・解除。現在の許可をサーバーが判定。名前を本人識別に使わない |
| ShareSnapshot | LINEで共有した固定版とリンク | owner_id, source_snapshot_id, permission_id, permission_version, run_id, timezone, generated_at, range, daily_public[], hourly_public[], candidates[], token_hash, expires_at, revoked_at, schema_version | 内容は固定。失効のみ変更可。汎用エンティティAPIから匿名公開せず、専用APIが有効性を検証して公開DTOだけ返す |
| OperationRun | 作業の制御状態・最小限の追跡情報 | run_id, owner_id, trigger, request_id, webhook_event_id, retry_of, state, stage, steps[], versions, result_snapshot_id, share_snapshot_id, delivery_state, error_code, reason_code, started_at, finished_at | サーバー内部専用。ログと同じrun_idで追跡。ユーザー回答を保存する用途ではない |

### 3.1 補足
- UserProfileの本人設定とLINE対応を同居させる案だが、クライアントによるline_user_idの自己申告書換えは認めない。本人連携の認証方式・Google認可秘密の保管先は実装時に確定。
- line_user_id、owner_id、owner_id＋line_group_idの業務上一意性は必要。ただしDB制約として保証されるとは扱わない。曖昧な重複を検出したら先頭を採用せず処理を止める。
- 除外日はUserProfileにまとめる。候補除外だけなら予定再取得・多忙度変更をしない。
- edit_versionは手動調整集合の更新を識別する版。計算には使用した調整IDと各版を固定する。設定・調整の同時更新をどう整合させるかは接続検証で確定。
- google_connection_refは秘密の参照。アクセストークン、リフレッシュトークンを通常のプロフィール・ログ・公開データへ保存しない。
- OperationRunのstepsは既知の処理段階の記録に限定する。予定本文・入力全文・無制限の詳細ログを埋め込まない。
- 日付ボタンによる投稿は投票・参加表明・確定として保存しない。

## 4 ER図（論理的な関連）
単数・一意は意図する業務ルールであり、Base44のFK/UNIQUE保証を表す図ではない。

~~~mermaid
erDiagram
  User ||--o| UserProfile : configures
  User ||--o{ CalendarSource : fetches
  User ||--o{ ManualAdjustment : edits
  User ||--o{ AvailabilitySnapshot : calculates
  User ||--o{ GroupPermission : permits
  User ||--o{ OperationRun : starts
  CalendarSource ||--o{ AvailabilitySnapshot : source
  AvailabilitySnapshot ||--o{ ShareSnapshot : freezes
  GroupPermission ||--o{ ShareSnapshot : governs
  OperationRun ||--o| AvailabilitySnapshot : produces
  OperationRun ||--o| ShareSnapshot : shares
~~~

調整集合の参照はAvailabilitySnapshot.adjustment_refsにIDと版を保存する。ユーザー設定の最新版参照はUserProfile.latest_snapshot_id、共有先の固定参照はShareSnapshot.source_snapshot_idで分ける。

## 5 正規化予定と保存の境界
- Google APIの生レスポンスを公開DBへ丸ごと保存しない。全ページの取得完了と検証成功後、必要項目だけ正規化してCalendarSourceに保存。
- CalendarSourceのrangeはstart_dateとend_date_exclusive、timezoneは日別集計に使う利用者タイムゾーン。取得時のAPIリクエスト境界もrunで追跡できるようにする。
- 時刻予定はkind=timed、provider_event_id、starts_at、ends_atを持つ。入力はオフセット付きISO日時、保存時は日時アダプターでUTCへ統一する設計。計算用のUTCミリ秒へはnormalizeが変換する。現保存アダプターは未実装。
- 終日予定はkind=all_day、provider_event_id、start_date、end_date_exclusiveを持つ。時刻予定と混ぜず、終日終了日は排他的な日付のまま保持。
- どちらもstatus、transparency、event_type、participation_status等の集計判断に必要な状態を保持。情報がない参加状態を承諾済みと推測しない。
- 予定名・本文は保存しない。キャンセル・空き扱い・本人辞退等の採否は別の計算規則として確定する。
- CalendarSource.eventsの保存形式は入力用のsnake_caseで、normalize後の計算用camelCase形式とは別。[入出力契約](contracts.md)に従いStoreが変換する。日跨ぎ分割・活動時間切出し・重複統合は計算用区間生成が担当する。
- ManualAdjustmentは別入力。適用・解除後に時間別→日別→候補を再計算する。Google再取得後の維持方針は未決なので自動消去・自動維持を確定済みとしない。

## 6 更新・候補・送信の状態
### 6.1 実行状態
基本はqueued → running → succeeded / failed / superseded / ignored。queuedは耐久受付済み、runningは実行権取得後。待機中の失効・タイムアウト等ではqueuedから終了し得る。
stateは実行の成否、stageは現在の処理箇所。詳細な段階名・エラーコードは[実行・ログ仕様](logs.md)を正本にする。
再試行は新run_idで開始しretry_ofで元runを参照。終了したrunをqueuedへ巻き戻さない。

### 6.2 候補状態
- valid：最新の設定・調整・日付条件に合った候補あり。
- empty：正常計算の結果0件。「候補日が見つかりませんでした」。エラーではない。
- invalid：設定変更後の再計算待ち・取得失敗・版不一致等。旧候補を新しい有効候補として送らない。
- 前回の芝は古さ・失敗付きで表示可能。候補の可否とは別に扱う。
- 候補状態の変更自体をDBへ書けない場合、成功したふりをしない。必要な版・有効性を確認できなければ新しい候補の配信を止める。

### 6.3 送信状態
not_required / pending / sending / sent / failed / unknown。
- 計算成功とLINE送信成功は別。タイムアウト等で受理の有無が分からない場合はunknownで、failedと決めつけて再送しない。
- sentはLINE APIで受理を確認した意味。端末での表示・既読・ボタン操作の成功を保証しない。
- UIでの表示成功・実機確認は試験証拠として別に残す。

## 7 更新と公開の制御案
1. 受付で実行モード・本人・入力・操作に必要な許可を確認し、依頼の耐久受付とrun_id記録に成功してからqueuedを応答する。本人未特定や署名不正はOperationRunではなく安全な受付ログで追う。
2. 実行担当が実行権を取得してrunningとし、権限を再確認する。設定版・調整版・現在のrunを固定し、再取得が必要なら全ページ取得。完全取得・検証したものだけを保存対象にする。
3. 設定・調整変更なら先に検証・保存し、その成否を記録する。調整を適用して多忙度・候補を作る。除外だけなら既存多忙度から候補のみ再計算する。
4. 同一入力版のAvailabilitySnapshotを検証・保存。参照前に所有者・版の一致を確認する。
5. 古い実行ならsuperseded。新しい結果として公開せず、新しい成功runの候補状態も変更しない。
6. 本人UIの最新参照を切替。途中保存を公開しない。設定・調整保存成功と再計算失敗は別に表示。カレンダー更新時は同じ完成版のWebUI共有部分を画像化・保存し、計算と画像準備の成否を分ける。
7. LINE依頼は上記の再取得・計算を行わず、保存済み完成版と画像を検証して同じ元版を固定する。候補ありなら現在の許可を確認し、カードともっと見る用のShareSnapshotを作成。正常0件なら案内のみ。送信直前にも許可を再確認する。
8. OperationRunと構造化ログに結果を記録。制御情報の保存失敗は成功として処理を続けない。

この手順はSQLトランザクションによる保証ではない。版の読み比べだけでは確認と更新の間の競合を防げない。実行受付・排他・最新版切替・再送防止の実現方法はP05の接続検証で確認する。フロントのボタン無効化や単一関数内のメモリロックをクラウド全体の排他と扱わない。未検証なら同時要求を受けない制限とその実現方法を決め、保証できない運用へ拡張しない。

## 8 共有許可・失効
- 許可の単位はowner_id＋line_group_id。state=allowed/revoked、未登録は未許可。
- permission_versionは許可・解除・再許可のたびに新しい不透明な版IDにする案。共有版が発行時の許可版を保持。
- 閲覧には、リンクが未失効かつ期限内、現在の許可がallowed、所有者・グループ・許可版が一致することが必要。
- 許可解除で既存リンクを失効。再許可後にallowedへ戻っても許可版が違うため旧リンクは復活しない。一括更新の完了だけに依存しない。
- 他ユーザー・別グループの許可に影響させない。送信待ち処理も旧許可版なら停止。
- 許可の最終確認と外部送信の間には競合が残り得る。DBとLINE APIをまたぐ原子的な処理を仮定せず、範囲・限界を確認する。LINEに受理済みのカード・文章は回収できたと扱わない。
- 固定共有内容は後の取得・編集・設定変更で差し替えない。解除・期限によるアクセス停止は行う。
- 期限は最終候補日後・発行から最大1カ月。具体的な月末・タイムゾーン境界は実装時に確定する。
- 公開APIは汎用エンティティの匿名読取を開放せず、トークンのハッシュ照合・期限・許可を確認して必要項目のみ返す。検証不能時は公開しない。
- 失効とデータ消去は別。保存期間・削除処理は未決。

## 9 操作と再実行範囲
| 操作 | 保存・再処理 |
|---|---|
| Google再取得 | 全取得→正規化→必要な調整適用→多忙度→候補→共有用画像保存 |
| ＠リスケ | 保存済み同一版の画像と候補を検証→カードともっと見るの共有ページを生成。再取得・画像生成なし |
| 時間帯編集・解除 | 調整保存→多忙度→候補。適用規則は未決 |
| 候補日除外・解除 | 設定保存→候補のみ再計算。多忙度は変えない |
| 共有許可・解除 | 許可状態と版変更。解除で既存リンク停止。予定取得不要 |
| 共有閲覧 | 固定共有版・期限・許可の検証。再取得しない |

## 10 この草案の合格条件・残る判断
- エンティティの所有者、機密性、公開項目、参照する版が説明できる。
- 同じ架空データをローカル保存とBase44保存で再読込して比較できる。
- 候補0件、未取得、失敗、計算成功・送信失敗を区別できる。
- 他人の編集拒否、共有解除・再許可、期限境界、部分取得、古い応答・Webhook再送を検証する。
- 未決：[判断待ち一覧](decisions.md)のP01〜P14を参照。終日6時間方針は維持、合成はP04。全日多忙の合格判定はP03決定まで保留。
- 本書の更新はスキーマのデプロイ・実装テスト完了を意味しない。

## 参照
- [実行・ログ仕様](logs.md)
- [内部設計](internal.md)／[LINE仕様](line.md)
- [Base44 Entity Schemas](https://docs.base44.com/developers/backend/resources/entities/entity-schemas)：配列・オブジェクト、標準項目、一意制約の制限。
- [Base44 Security](https://docs.base44.com/developers/backend/resources/entities/security)：RLS/FLS、サービス権限を利用する関数の検証責任。

## 11 権限・ログ契約・現スキーマとの差分

- 項目単位の読書きは[権限表](access.md)、型・列挙・条件付き必須・DB省略／ログnullの変換は[ログ仕様](logs.md)を正本とする。
- DBの任意項目は未設定なら省略する。OperationRunのerror_code等へnullや空文字を入れない。ログはnull可で、比較時に省略と同じ未設定へ正規化する。
- OperationRunにretryable・実行モード・キューclaim等の項目は未定義。必要な永続化はP05/P12で相談し、今回はJSONCを変更しない。
- CalendarSourceはkindしか予定要素の必須条件がない。型別の開始／終了、所有者・版・範囲等はサーバー検証が必要。スキーマだけで整合が保証されるとは扱わない。
- ManualAdjustmentのinteger値は仮の草案。調整仕様の採用済み型ではない。AvailabilitySnapshotの分数integerと計算の小数分数の差はP02で決める。
- 実行基盤、保存・公開アダプター、RLS、境界変換は未実装・未検証。[確認リスト](checks.md)の証拠を揃えてから合格とする。

## 12 共有画像・カードの保存設計（追加・未実装）

既存の標準User＋7種類は画像保存まで実現したスキーマではない。画像の保存先、asset ID、元snapshot ID、画像準備状態、生成時刻、描画版、ハッシュ、カードitem ID／候補ID／文面版等の保存場所はP13/P14で決める。今回JSONC・DB設定は変更しない。

WebUIで更新済みの共有用要素を画像化して保存し、その段階ではグループへの公開としない。LINE依頼時に許可を確認して、元snapshotと保存画像への参照を固定した公開版を作る。同じ画像を後で別内容へ上書きせず、再生成は新しい識別子を使う。公開画像のURL・期限・解除時のアクセス制御はP13。LINE側に配信・キャッシュ済みの画像を回収できるとは扱わない。

画像の未準備・不一致・日付経過等の利用可否を確認できなければ、別版の画像や前回候補へ暗黙に代替しない。具体的な案内・再準備の操作はP13で相談する。

## 最新共有仕様に必要な変更（未反映）
既存hourly_publicを全日時間帯公開として使わない。比較組、2人の元snapshot参照、双方のpermission_version、候補日限定の時間帯、画像参照・描画版・保存状態が必要。Account Link用nonceのハッシュ・有効期限・使用状態も別管理する。PairとLinkRequest等の具体JSONC、RLS/FLS、重複制約の検証は後続で行い、現DBへ自動同期しない。

## 最小保存の適用差分
UserProfile / CalendarSource / AvailabilitySnapshotのみ本人用保存に接続。直接CRUDをRLSで全拒否し、requireUser付き関数がowner_idを認証結果から決める。AvailabilitySnapshotへ検証済みのview（日別詳細・時間帯を含む本人用表示）とfetched_atを追加。既存のdaily/candidates等を維持し、分単位の小数値を壊さないようbusy_minutes/active_minutesはnumberへ変更する。viewはサーバーのZodで許可項目だけを保存・再読込する。候補除外はProfileの現在値から投影し、保存済み完成版の予定や多忙度を変更しない。
