# 実行・ログ仕様とOperationRunの対応

更新日：2026-10-18。識別・状態・コードの正本。設計と現スキーマの差分を明記する。コード／JSONCの変更・接続検証は今回行っていない。

## 1 共通規則

- 同じ有効操作全体をrun_idで追う。受付と実行は分離する。
- OperationRunは業務上の実行状態、構造化ログは経過調査用。ログをキューや復旧状態の代わりにしない。
- 未取得、正常0件、失敗、計算成功・送信失敗を区別する。
- UIのみは業務runを作らない。モックと実接続を混同しない。
- 未設定はDBではプロパティを省略し、ログではnullを許す。省略を空文字・0・falseに変換しない。

## 2 ID・版・時刻の対応

以下は現OperationRunの全トップレベル項目に対応する。DBの標準id／created_date／updated_dateは再定義しない。

| DB項目 | 型・意味 | 必須となる時点／ログ対応 |
| --- | --- | --- |
| run_id | UUID v4文字列。DB標準idとは別 | 有効操作の受付から必須／同名 |
| owner_id | 標準UserのID | 本人特定後の業務runで必須／ログは必要最小の内部参照のみ |
| trigger | §3の列挙文字列 | 受付時に必須／同名 |
| request_id | HTTP受付単位のUUID | HTTP経由なら記録。再送は別ID／同名 |
| webhook_event_id | LINEの検証済みイベントID | 署名確認済みLINE依頼に限る／必要な内部ログのみ |
| retry_of | 再試行元のrun_id | 再試行時のみ。新run_idを発行／同名 |
| state | §5の実行状態 | 受付から必須／ログstateもrun状態 |
| stage | §4の現在または最後の段階 | 受付記録後から適用段階を記録／同名 |
| steps | §6の小さな段階配列 | 通過段階の追跡時／ログは1段階1イベントへ展開 |
| versions | source_revision、settings_version、edit_version、permission_versionの文字列オブジェクト | 使用する版が確定後。未使用項目は省略／ログでは各項目を平坦化 |
| result_snapshot_id | 保存済み計算結果のBase44 id | 計算保存成功、またはLINE用に既存完成版を固定したとき。送信失敗でも保持／同名 |
| share_snapshot_id | 保存済み公開版のBase44 id | 共有版作成成功時のみ／同名 |
| delivery_state | §5の送信状態 | 受付以後、送信不要も明示する設計／同名 |
| error_code | §7の原因コード文字列 | 原因があるときのみ。正常成功では省略／ログはnull可 |
| reason_code | 正常な理由コード文字列 | 正常0件・再送等、該当時のみ／ログはnull可 |
| started_at | UTCのISO日時文字列 | 実行担当が処理を開始した時点。待機中は省略／同名 |
| finished_at | UTCのISO日時文字列 | 終了状態に到達後／同名 |

現JSONCでrequiredなのはrun_id、owner_id、trigger、stateのみ。他の条件付き必須はサーバー検証が必要で、スキーマで保証済みとはしない。UUIDは順序や一意な実行を保証しない。source_revisionは完全取得・検証を通った取得版を指し、日時だけで版の優劣を決めない。

本人未特定・署名不正はowner_id必須のOperationRunへ無理に保存しない。request_id付きの安全な受付ログを残す。本文・未検証のIDを信頼済みの所有者として記録しない。

## 3 trigger

現JSONCと同じ9値を使う。

| 値 | 操作 |
| --- | --- |
| `fixture_check` | 固定入力・模擬接続の読込／計算／保存検証 |
| `web_refresh` | Web起動・手動更新で予定を再取得 |
| `line_request` | ＠リスケで保存済み同一版の画像と候補を読み、カード・共有ページ生成／返信。再取得・再計算・画像生成なし |
| `settings_change` | 設定変更。活動時間は再計算、期間拡大は必要な取得を補完 |
| `manual_edit` | 時間帯調整保存後の再計算 |
| `manual_reset` | 時間帯調整解除後の再計算 |
| `exclusion_change` | 除外設定の保存と候補のみ再計算 |
| `share_grant` | グループ許可と許可版の保存 |
| `share_revoke` | 許可解除・版変更・関連リンク停止 |

毎日の自動更新は初版対象外でtriggerを追加しない。通常会話・日付投稿・共有閲覧に業務runを作らない。

## 4 stageと操作別経路

| stage | 責務・観測項目 |
| --- | --- |
| receive | 受付、依頼判定、署名確認済みイベントの再送照合、request_id |
| authorize | 本人、必要なGoogle連携、操作別の共有許可 |
| load | 設定・保存済み予定・調整・版・取得済み範囲 |
| fetch | 全対象ページの取得、件数・ページ数・時間 |
| normalize | 共通形式への変換・検証、受信／有効／除外件数 |
| apply_adjustments | 計算区間生成・仮ルールの適用、使用する調整版 |
| calculate | 日別・時間別計算、対象日・未取得日数 |
| recommend | 除外・順位・最大3件、候補件数 |
| persist | 設定／調整／許可／取得版／結果／共有画像と参照等の保存 |
| render_share_image | カレンダー更新後、WebUIの共有用部分を画像化。計算結果ID・描画版・成否を記録。追加の設計段階で未実装 |
| publish | 所有者・入力版・実行の有効性確認、本人最新参照切替 |
| prepare_share | 保存済み画像と候補の版確認、現在の許可確認、カード自動組立、もっと見る用の固定公開版・リンク準備 |
| deliver | 許可の最終確認、LINE返信と受理結果 |

stageは一方向の固定列ではない。同じ段階を再度通る場合はattemptを増やす。不要段階はskipped。実行対象でない機能には段階自体を作らない。

| 操作 | 主な経路 |
| --- | --- |
| 再取得 | 受付receive→authorize→耐久受付queued→実行running→authorize再確認→load→fetch→normalize→apply_adjustments→calculate→recommend→persist→publish→render_share_image→persist画像 |
| 活動時間変更 | load→persist設定→apply_adjustments→calculate→recommend→persist結果→publish→render_share_image→persist画像 |
| 時間帯調整 | load→検証→persist調整→apply_adjustments→calculate→recommend→persist結果→publish→render_share_image→persist画像 |
| 除外変更 | load→persist設定→recommend→persist結果→publish→render_share_image→persist画像。fetch・calculateはskipped |
| 期間変更 | 保存範囲内なら候補再選出、拡大で不足なら取得から実行 |
| 許可／解除 | authorize→load→persist許可版。解除は閲覧と待機送信にも反映 |
| LINE候補あり | receive→authorize→耐久受付→running→authorize再確認→load既存版と画像→prepare_share→persist共有参照→deliver。fetch／normalize／apply_adjustments／calculate／recommend／render_share_image／publishはskipped |
| LINE正常0件 | 有効な保存済み完成版で正常0件を確認→prepare_shareをskipped→deliverで正常案内。画像未準備を0件と誤分類しない |

本人と操作を確認した受付段階はqueued作成時に記録する。started_atは実行開始時刻なので受付段階の時刻より後でもよい。実行権の取得、再authorize、設定保存等で同stageを繰り返す場合のattemptはrun内で一意にする。

耐久受付と起動通知の片方だけ成功する場合の復旧・claim・待機時刻はP05/P12。OperationRunを保存しただけで処理起動や一回限りの実行を保証しない。受付拒否時にqueued成功を返さない。

## 5 run.stateとdelivery_state

| run.state | 意味 |
| --- | --- |
| `queued` | 本人・入力を確認し耐久的に受付済み。実行開始前 |
| `running` | 実行担当が実行権を取得して処理中 |
| `succeeded` | 必要処理が完了。LINEは案内を含め必要な返信の受理確認まで |
| `failed` | 必要処理が失敗・中断、または送信結果不明 |
| `superseded` | 新しい設定・調整・実行に置換され、最新として採用しない |
| `ignored` | 処理不要。制御上必要な記録に限定。通常会話は原則runなし |

通常はqueued→running→終了。待機中の失効・タイムアウト・重複等はqueuedから終了し得る。終了状態を巻き戻さず、再試行は別run_idとretry_ofを使う。復旧条件・回数・待機時間はP05/P07。

| delivery_state | 意味 |
| --- | --- |
| `not_required` | Webのみ等、送信不要 |
| `pending` | 必要な送信を待機 |
| `sending` | 送信を開始 |
| `sent` | LINE APIの受理を確認。端末表示・既読の保証ではない |
| `failed` | 明示拒否または送信前の失敗で未受理と判断できる |
| `unknown` | 通信断等で受理の有無を判断できない。無条件再送しない |

| ケース | run.state | delivery_state | error_code／reason_code |
| --- | --- | --- | --- |
| Web成功（必要な画像保存も成功） | succeeded | not_required | 原因なし |
| 計算保存成功・必要な画像準備失敗 | failed | not_required | SHARE_IMAGE_FAILED等。計算結果IDを保持し、画像は未準備 |
| LINE正常0件の案内成功 | succeeded | sent | reason_code=NO_CANDIDATES |
| 計算成功・LINE明示拒否 | failed | failed | LINE_REPLY_FAILED。結果IDは保持 |
| 計算成功・LINE受理不明 | failed | unknown | LINE_DELIVERY_UNKNOWN。結果IDは保持 |
| 計算失敗・失敗案内の返信成功 | failed | sent | 元の計算原因を保持 |
| 古い実行の排除 | superseded | 未送信ならnot_required／failed等を実状に合わせる | VERSION_CONFLICT。既にsentなら回収したと扱わない |

エラー案内自体も失敗した場合、元の業務原因をrun.error_codeへ残し、送信原因はdeliverのstepに残す。単一の原因を上書きして元の失敗を消さない。

## 6 stepsと構造化ログの型

stepsの現JSONC項目はstage:string、attempt:integer、started_at:string、finished_at:string、duration_ms:integer、state:string、error_code:string。requiredはstage、attempt、state。

- step.stateはrunning／succeeded／failed／skipped。ログのstate（run状態）と混同せず、ログにはstep_stateで明示する。
- attemptは1以上の整数、duration_msは0以上の整数。実行したstepは開始時刻、終了したstepは終了時刻と所要時間を持つ設計。
- skippedは未実行。所要時間0や架空の開始・終了時刻を成功実績として作らない。
- 配列上限・再試行上限はP05/P07。予定全文や入出力全文は入れない。

| ログ専用項目 | 型・意味 | DBとの関係 |
| --- | --- | --- |
| timestamp | UTCのISO日時 | ログ出力時刻。DB標準作成日時と別 |
| level | debug/info/warn/error | severity。run状態・原因コードと別 |
| event | run_accepted/run_started/stage_started/stage_completed/stage_failed/stage_skipped/run_completed/duplicate_detected/request_rejected | 固定イベント名。DBに同名項目なし |
| step_state | stepの列挙値 | steps[].stateへ対応 |
| attempt／duration_ms | 正の整数／非負整数 | stepsの対応項目 |
| candidate_count等の件数 | 非負整数 | 調査用。ログを結果の正本にしない |
| retryable | true/false/null | 現JSONCに未定義。ログ上の判断のみ。復旧へ使う永続先はP12 |
| execution_mode | mock/live | 現JSONCに未定義。モックの実績を実接続の証拠にしない。永続先はP12 |
| calculation_version | 仮ルールの識別文字列 | 結果エンティティにはあるがOperationRunには未定義。P12 |
| image_asset_id／image_snapshot_id／card_item_id／copy_version | 画像・元版・カード一式・文面の参照文字列 | 現JSONCに未定義。永続先はP13/P14。ログ参照だけで同一版の保証にしない |

log上のretryable=null／未設定は再試行許可ではない。trueでも重複・入力版・共有許可・送信状態を検証せず再送しない。

### 省略とnullの変換

- DB保存時は未設定の任意項目を省略する。ネストしたversions／stepsも同じ。空文字で埋めない。
- ログでは同じ意味の未設定をnullまたは省略で表せる。集約・比較時にどちらも「未設定」へ正規化する。
- DB読取時の省略を、false／0／空き日へ変換しない。
- ログ→DBの変換は、DBに定義済みの項目だけを明示対応し、未定義項目を丸ごと保存しない。ログをDB復元の正本にしない。
- 既存DBのコードを消す更新では「省略したPATCH＝削除」と仮定しない。終了runは再利用せず、途中再試行での削除方法はSDK動作確認後に設計する。

### 例：正常0件の段階終了（架空）

~~~json
{
  "timestamp": "2026-10-18T03:00:00.000Z",
  "level": "info",
  "event": "stage_completed",
  "run_id": "68427899-4d6a-49e9-a61c-77f70d1c6418",
  "trigger": "fixture_check",
  "execution_mode": "mock",
  "stage": "recommend",
  "attempt": 1,
  "state": "running",
  "step_state": "succeeded",
  "candidate_count": 0,
  "reason_code": "NO_CANDIDATES",
  "error_code": null,
  "retryable": null,
  "duration_ms": 12
}
~~~

同じ時点のDBではerror_codeを省略する。state=runningは後続の保存等が未完了のため。versionsのログ展開は平坦化し、DBへはversions配下に戻す。

## 7 error_codeと正常理由

| code | 意味・扱い |
| --- | --- |
| INPUT_INVALID | 入力不正。修正まで繰り返さない |
| SIGNATURE_INVALID | 署名不正。HTTP境界で拒否しrequest_idで追跡 |
| IDENTITY_UNLINKED | 本人未連携。別人で代替しない |
| IDENTITY_AMBIGUOUS | 本人対応が重複・曖昧。停止 |
| GOOGLE_UNLINKED | Google未連携。サイトへ案内 |
| GOOGLE_AUTH_REQUIRED | 再認可が必要 |
| SHARE_NOT_ALLOWED | グループ未許可。実データを返さない |
| SHARE_PERMISSION_CHANGED | 処理中の許可変更。共有停止 |
| GOOGLE_FETCH_FAILED | 取得失敗。外部応答で再試行を判断 |
| GOOGLE_FETCH_INCOMPLETE | 全ページ未完了。部分結果を完成扱いしない |
| EXTERNAL_RATE_LIMITED | 外部制限。待機条件を確認 |
| EXTERNAL_TIMEOUT | 外部待機超過。送信結果不明とは区別 |
| NORMALIZATION_INVALID | 形式・時刻の不正 |
| ADJUSTMENT_INVALID | 調整不正。保存せず戻す |
| CALCULATION_FAILED | 計算失敗。新版を公開しない |
| RECOMMENDATION_INVALID | 今日・重複・対象外等の不正候補 |
| STORAGE_READ_FAILED | 読取失敗。未取得を空き扱いしない |
| STORAGE_WRITE_FAILED | 必須データ・制御保存失敗 |
| VERSION_CONFLICT | 版不一致。通常はsuperseded、想定外不整合はfailed |
| SHARE_UNAVAILABLE | 無効・期限切れ・参照不整合 |
| SHARE_IMAGE_FAILED | 共有画像の生成失敗。計算成功と分離 |
| SHARE_NOT_READY | 画像・元結果・候補の同一版を確認できない。正常0件と区別 |
| CARD_BUILD_FAILED | 候補カード／もっと見るの組立・形式検証失敗 |
| LINE_REPLY_FAILED | 明示拒否等 |
| LINE_DELIVERY_UNKNOWN | 受理不明。無条件再送なし |
| OPERATION_TIMEOUT | 実行期限超過。放置を検出 |
| INTERNAL_ERROR | 未分類。秘密を除いて調査 |

reason_codeはNO_CANDIDATES／DUPLICATE_EVENT／COMMAND_NOT_MATCHED。正常理由をerror_codeへ入れない。未連携等は想定内の案内でも業務原因コードを保持し、level・画面文言と分ける。共有閲覧のSHARE_UNAVAILABLE等は業務runを作らず、安全なAPIログで扱う。

## 8 出力場所・禁止情報・障害

- 受付、実行担当の各段階開始／終了／失敗、公開切替、共有送信に構造化ログを出す。ローカルは標準出力、クラウドは選択した実行基盤のログ。
- APIキー、OAuthトークン、LINE秘密・返信トークン、共有生トークン、ヘッダー、予定名・本文・配列全文、通常会話、カード全文を出さない。
- userId/groupId等は制御上必要な保護レコードに限定し、一般ログへ無用に出さない。
- 外部エラー全文やスタックを利用者へ返さない。run_idと安全な案内だけを表示する。
- 調査ログ失敗で保存済みの調整を未保存と表示しない。必須制御の保存失敗では成功を返さず、外部送信前なら停止する。
- DB停止でOperationRunへ書けない場合は最小の安全なログを出す。ログ保存自体を成功保証にしない。
- 保持・削除期間はP09。復旧に必要な未定義項目はP12。画像とカードの安全な参照はP13/P14。画像配信URLの生トークンやカード本文をログへ出さない。

## 9 現JSONCとの差分と検証

| 差分 | 今回の扱い | 完了条件 |
| --- | --- | --- |
| 任意文字列と仕様のnull | DB省略／ログnull可に統一 | V27で境界変換を実装・検証 |
| stage／error_code／reason_codeがstringのみ | 本文の列挙をサーバー検証する設計 | 未知値を拒否する試験。JSONC強化は別途 |
| 条件付き必須がJSONCにない | §2／§6をサーバー契約にする | 保存前検証と障害注入 |
| 画像・カード参照と文面版 | 既存JSONCにない設計追加を明示 | P13/P14で保存先と境界検証を決める。V32〜V36 |
| retryable／mode／計算版／待機・claim情報 | 未定義を明示し永続化を未完了扱い | P05/P12を判断し、別作業でスキーマ・実装を揃える |

検証は[確認リスト](checks.md)のV12〜V17、V24、V27〜V29。文書とスキーマの差を隠さず、未解決のまま本番のキュー／再試行保証を宣言しない。


## 10 画像・カード追加の検証

更新runでは計算保存と画像生成・保存を段階別に追う。LINE runではresult_snapshot_idで元の更新runへ辿れ、画像・候補・説明・共有ページが同じ元版であることを記録する。＠リスケでfetch・calculate・render_share_imageが起動していないことを確認する。新しいstage・原因コード・参照項目は設計上の追加で、今回スキーマやランタイムへ反映していない。
