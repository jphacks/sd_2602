# 入出力・交換可能な仮ロジックの契約

> 最新合意・現在の実装状態は [最新仕様](current.md) を参照。過去の初版／将来区分や共有範囲と競合する場合は同書を優先する。

更新日：2026-10-18。全体図・詳細設計は本書の契約を参照する。既存関数の呼出形式の記録と、新設計の提案を区別する。今回の個人ページ契約は§8を参照。DBスキーマは変更しない。

## 1 固定する境界

- 項目名だけでなく意味・単位・対象期間・未設定の表現を固定する。契約自体の変更は事前相談する。
- 現在日時は呼出側から渡す。計算コアで時計や環境のタイムゾーンを読まない。
- 取得範囲と取得完了を呼出側が確認し、取得済みの日付だけを計算へ渡す。未取得日を0%で補完しない。
- 仮ロジックの選択は呼出側／アダプターが担当し、計算利用者は内部のアルゴリズムを知らない。
- 計算結果には設計上のcalculation_versionを対応させる。AvailabilitySnapshotには項目があるが、付与する保存処理は未実装。
- 失敗時の例外を更新制御がstage・error_codeへ変換する。正常0件を例外にしない。

## 2 現在の関数契約

これは既存コードと一致する呼出形式。表記を揃えるために既存関数を変更しない。

| 関数 | 入力 | 出力 |
| --- | --- | --- |
| fetchFixture(name) | fixture名。省略時normal | sourceRevision、timezone、offsetMinutes、range、events |
| normalize(rawEvents) | 下記の入力予定配列 | events（計算用形式）、stats.received／valid／excluded |
| calculateDaily(events, options) | 計算用events、options={dates, offsetMinutes, activityWindow} | {date, activeMinutes, busyMinutes, busyRatio}[] |
| calculateHourly(events, options) | calculateDailyと同じ | {slotStart, activeMinutes, busyMinutes, busyRatio}[] |
| select(daily, options) | 日別配列、options={today, excludedDates, maxCandidates} | {candidateState, candidates:[{date,busyRatio,reasons}]} |

現実装の既定値はoffsetMinutes=540、activityWindow={startMinute:540,endMinute:1320}、maxCandidates=3。受渡し境界ではmaxCandidatesを0〜3の整数へ検証する設計とするが、既存select自身は上限・重複・対象期間の検証を保証しない。候補元dailyを期間内・取得済み・日付一意に絞り、出力も検証する。

## 3 予定形式の境界

| 境界 | 主な項目 | 意味 |
| --- | --- | --- |
| 入力・保存用の時刻予定 | kind=timed、provider_event_id、starts_at、ends_at、status、transparency、event_type、participation_status | 日時はオフセットまたはZを含むISO形式。保存時のUTC統一は日時アダプターで行う設計 |
| 入力・保存用の終日予定 | kind=all_day、provider_event_id、start_date、end_date_exclusive、各状態 | 終了日は含まない。終日の日付をUTC時刻へ強制変換しない |
| normalize後の計算用 | providerEventId、isAllDay、eventType、participationStatus、status、transparency | snake_caseからcamelCaseへ変換 |
| 計算用の時刻 | startsAtMs、endsAtMs | UTC基準のミリ秒 |
| 計算用の終日 | startDate、endDateExclusive | ISO日付、終了日は含まない |

CalendarSource.eventsは入力・保存用形式。normalize後のeventsをそのまま保存しない。Storeが計算形式と保存形式を変換・検証する。正規化で日跨ぎ分割や時間重複の統合はしない。計算用区間生成が担当する。

既存normalizeは形式不正の予定を除外する設計だが、null要素等で例外になる可能性があり、厳密な境界検証の完成版ではない。形式不正を除外して続行するかrun失敗にするかはP11。Google途中取得や入力破損を空きとして公開しない。

## 4 日時・計算の仮ルール

| 項目 | 境界で固定する意味 | 仮実装／判断待ち |
| --- | --- | --- |
| date／today | YYYY-MM-DD、利用者側の集計日付。実在日付として検証 | 現モックはAsia/Tokyo。対象地域はP02 |
| range | start_date以上、end_date_exclusive未満 | 拡大で取得範囲を超える場合は取得が必要 |
| offsetMinutes | UTCからローカルへの分オフセット | 現計算は固定値。地域・夏時間対応はP02 |
| activityWindow | 0時からの開始・終了分数 | 現実装は1区間。複数区間・日跨ぎ・0分はP02 |
| activeMinutes／busyMinutes | 分。重複時間を二重加算しない | 秒境界で小数になり得るがDBはinteger。丸め方式はP02で決定するまで差分扱い |
| busyRatio | 多忙分数を活動分数で割った0〜1の割合 | 現実装は小数4桁。0分で0%として公開することは未承認 |
| slotStart | 集計タイムゾーンのローカル日時。timezoneと組で解釈 | 現実装にオフセット表記なし。単独でUTCと解釈しない |
| 今日／除外日／未取得日 | 候補から除外 | 今日を呼出側で固定し、出力時も確認 |
| 終日予定 | 日別は6時間換算、時間別は終日欄に分離 | P04の今回回答を反映。今回実装は末尾§8の承認ルール。1日6時間＋通常予定、活動時間上限 |
| 全日多忙 | 今回決定済みP03 | 今回承認により100%は除外（§8） |
| 多忙とみなす状態 | confirmed/tentative、非transparent、本人accepted、workingLocation以外 | 欠損参加状態はacceptedと推測しない。本人特定・仮承諾はP11 |

日時の仮ルールを交換しても、計算への日付・分数・UTCミリ秒の意味を変えない。新しいルールの期待値は版ごとに用意する。

## 5 時間帯調整の境界

ユーザー決定：今回固定するのは入出力の原則と判断項目。値・優先順位等の具体的仮ルールは次の設計で相談する（P01）。

- 入力は元の正規化予定、対象範囲、活動時間、別保存の調整集合とその版。
- 出力は日別・時間別計算へ渡せる計算区間。元のGoogle予定を変更しない。
- 調整保存成功と再計算成功を分ける。再計算失敗でも保存が取り消されたと表示しない。
- 区間の開始／終了・値の型・単位、重複優先、解除、再取得後の維持を決めるまで完成した型として固定しない。
- 現ManualAdjustmentのadjustment_value=integerは草案であり、値の意味が確定した証拠ではない。
- 仮ルール未決の機能はUIのみ／明示モック。実保存や共有へ暗黙に反映しない。
- 入出力に変更が必要なら、版を分けて境界の変換を提案し、契約変更を相談する。

## 6 表示用データ（DTO）

DTOは、受け渡す相手に必要な項目だけをまとめたデータ。DBレコード全体を返さない。

| 用途 | 必要な内容 | 含めない内容 |
| --- | --- | --- |
| 本人表示 | 完成版の取得／生成日時、timezone、範囲、daily、hourly、候補、候補状態、古さ・更新状況 | 認証秘密、内部サービス権限、他人のデータ |
| 共有表示 | 固定版の生成日時、timezone、範囲、公開daily／hourly、候補、保存済み画像、カードに許可された多忙時間帯、期限 | 生予定、設定全体、LINE識別子、token_hash、内部run記録 |
| 更新受付／状況 | run_id、受付／進行／完了状態、安全な案内 | 予定配列、秘密、例外スタック |

今回の本人向けテスト表示の実区間・終日欄は§8で追加。製品DB完成版や共有詳細まで実装済みとは扱わない。今回追加する画像・抽象化した多忙時間帯・説明／提案文以外の共有項目追加は別途確認する。


## 7 共有画像と候補カード（追加設計）

- カレンダー更新側の入力：検証済み結果版と、WebUIの共有用月間カレンダー表示データ。出力：月間画像1枚の参照と元結果版の対応・生成時刻・描画版・成否。全候補カードで同じ画像を共用する。具体型と保存先はP13。
- LINE側の入力：保存済み画像、同じ元版の候補、許可済み公開情報、文面テンプレート。出力：候補数分のカード＋もっと見る＋固定共有ページへの参照。再取得・再計算・画像生成はしない。
- item IDは生成一式の内部管理名。candidate IDは元版内の候補識別。文字列形式・タイトル表示長はP07/P14で決める。Managerのアイテム登録APIの存在を前提にしない。
- 説明と提案文は候補日・timezone・対象活動時間・公開可の多忙時間帯から組み立てる。自由文で計算結果や参照版を変えない。編集方法と保存範囲はP14。
- 許可された多忙時間帯は名前・本文のない抽象化区間。終日換算値から実在しない6時間の予定区間を捏造しない。
- 最新設定、日付経過、画像準備の可否を検証し、画像と候補の版不一致を補完しない。更新中・未準備・期限経過の具体案内はP13。
- 詳細カードの項目は[LINE仕様](line.md)を正本とする。


## 8 個人ページの今回承認された契約（2026-10-18）

- Google API未設定。認可は今後の開発予定として表示し、成功状態を偽装しない。GoogleログインとCalendar閲覧認可は別の工程。
- ログイン不要の固定テスト表示用GETサーバー関数getPersonalDemo()は引数なし。所有者・期間・モード・外部URLを受け付けず、31日・テスト入力に固定する。
- Asia/Tokyo・+540分、09:00〜22:00の1区間は今回のテスト表示に限定した既定値。今日を含む31日、終了境界は今日+31日の排他。
- readPersonalFixture(seed,today)は日付・rawEvents・範囲・活動時間を返す。時計はserviceの呼出側から渡す。
- buildSchedule(input,today,excludedDates)はdaily、details（時刻区間・終日件数・hourly）、candidates、candidateStateを生成。予定名・本文なし。
- 終日予定は複数でも1日6時間を1回加算。通常予定は重複統合し、合計は活動時間を上限。終日分はhourlyに入れず専用欄。実在しない6時間の区間を作らない。
- 100%多忙・活動時間0分・今日以前・除外日は候補から除外。同点は近い日。最大3件。
- 除外・候補選択・案内文編集はページ内状態のみ。再読込で戻る。日付除外は日別集計を変えない。案内文はコピーのみ。
- 既存calculateDaily/calculateHourly/selectの引数・戻り値の形は維持し、終日／全日多忙の意味だけ今回の承認へ更新する。
- 正常0件と読込失敗を分離。今回の処理は同期の表示検証であり、業務キュー登録や完成版保存の完了を意味しない。

## 2人比較の追加仕様（2026-10-18）

候補の選出順と表示順は別。共通の最長連続空き時間→合計→近い日付で3日を選出し、表示は日付昇順。双方いずれかの終日予定日を除外する。全日は日別多忙度、候補日のみ双方の予定時間帯を共有する。カード・コピー文は候補日ごと各人1件まで＋複数時「など」。月間画像と本文は同一版の共有データを使う。

現在の実装・確認項目・未接続範囲は [2人比較のテスト実装](../dev/pair-page.md) を参照。実共有時は候補日／比較版／双方の同意の検証が必要。

## 最新の候補・接続契約
recommendForDetails(daily, details, today, excludedDates, activityWindow) はselectPairと同じ空き時間の評価を使い、終日予定日を除外して日付順の候補を返す。古いselect(daily, options)は互換用の純関数として残るが、現画面の候補選出では使わない。selectShareはサーバー候補と選択集合の積を作り、元の比較版を維持する。
getConnectionStatusは入力IDなし・requireUser付きGET。秘密設定のGOOGLE_CALENDAR_CONNECTOR_IDを利用し、返すのは状態と非秘密のConnector IDだけ。トークンや接続設定は返さない。404は未連携と誤設定を区別できないためconnection_unconfirmed。未設定・GoogleクライアントIDの誤指定では外部コネクタを呼ばない。
