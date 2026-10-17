# 整理と名称変更の記録

実施日：2026-10-18。利用者の承認に基づくファイル配置整理と名称変更。

## 名称

- 表示名：リスケRisuke。内部のpackage名・Worker名：risuke。
- package.json、package-lock.json、base44/config.jsonc、wrangler.jsonc、ページタイトルと見出しを更新。
- Base44管理画面のタイトルも「リスケRisuke」へ変更し、画面で確認済み。
- フォルダーsd_2602、Base44アプリID、LINE Webhook URLは維持。

## 撤去と保管

- line-schedule-botのPC常駐サーバー、テスト、起動手順、package.json、見本.env、ローカル設定を削除。
- 旧data/以下のresult.jsonとstate.jsonは現行コードから読み書きされない検証データのため削除。
- 旧.envは.env.line.localへ移動。移動前後のSHA-256一致を確認し、値は表示・記録していない。
- 旧仕様・Manager操作・障害調査は削除せずdocs/archiveへ保管。
- src、base44の関数とエンティティ、UI・認証部品、依存関係、公式スキルは維持。
- READMEを入口として整理し、architecture.mdの配置・クラス図・資料間リンクを更新。

## 資料の移動

| 旧配置 | 新配置 |
| --- | --- |
| `docs/schedule-design-index.md` | `docs/spec/index.md` |
| `docs/schedule-features.md` | `docs/spec/features.md` |
| `docs/schedule-access.md` | `docs/spec/access.md` |
| `docs/schedule-checks.md` | `docs/spec/checks.md` |
| `docs/schedule-contracts.md` | `docs/spec/contracts.md` |
| `docs/schedule-decisions.md` | `docs/spec/decisions.md` |
| `docs/schedule-external-design.md` | `docs/spec/external.md` |
| `docs/schedule-internal-flow.md` | `docs/spec/internal.md` |
| `docs/schedule-line-spec.md` | `docs/spec/line.md` |
| `docs/schedule-operation-log-spec.md` | `docs/spec/logs.md` |
| `docs/schedule-state-and-schema.md` | `docs/spec/schema.md` |
| `docs/schedule-development-plan.md` | `docs/dev/plan.md` |
| `docs/base44-line-deploy-test.md` | `docs/dev/line-deploy-test.md` |
| `docs/adr/2026-10-15-schedule-recommendation.md` | `docs/spec/adr/2026-10-15-schedule-recommendation.md` |
| `docs/adr/glossary.md` | `docs/spec/adr/glossary.md` |
| `docs/context-index.md` | `docs/archive/local-line/index.md` |
| `docs/context/local-bot.md` | `docs/archive/local-line/context/local-bot.md` |
| `docs/context/manager-cards.md` | `docs/archive/local-line/context/manager-cards.md` |
| `docs/context/next-steps.md` | `docs/archive/local-line/context/next-steps.md` |
| `docs/context/tool-troubleshooting.md` | `docs/archive/local-line/context/tool-troubleshooting.md` |
| `docs/schedule-local-prototype-storage.md` | `docs/archive/local-line/storage.md` |

## 検証

- 現行Base44関数の10テスト：すべて成功。
- ESLint（eslint . --quiet）：成功。
- Markdown 37ファイル・相対リンク189件を確認し、現行資料のリンク切れは0件。
- アーカイブの既存リンク切れ2件は当時の参照として維持し、アーカイブ入口に注記。
- package・lockfile・Workerの内部名、Base44設定名、旧Bot撤去、秘密バックアップとアプリ連携ファイルの存在を確認。
- 既存Webhook URLへのGET：200、service=risuke-line。再デプロイ・実LINE送信は行っていない。
- Base44管理画面でアプリ名リスケRisukeを確認。Gitのコミット・pushは行っていない。

コミット草案：`[整理] リスケRisukeへ名称を統一しBase44開発の資料と旧Botを整理`
