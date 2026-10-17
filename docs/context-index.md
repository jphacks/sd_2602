# SD2602：作業コンテキストの入口

更新：2026-10-17（Asia/Seoul）。この資料はLINE検証・Manager自動化についてのサイド会話の引継ぎ。会話の逐語録ではなく、現状・決定・未検証・次の行動を分けて保存する。

## 最初に読む
- 直近の目的：LINE Official Account Managerで検証カード「日程テスト」を作り、キーワード「テスト」に割り当てる。最終的にはカードと応答ルールをセットで自動作成・削除・再登録したい。
- 現在の障害：Codexの画面操作環境が初期化前に失敗し、依頼されたカードもキーワード設定もAIからは未作成。
- 次の一歩：[再開手順](context/next-steps.md)。まず画面読取りを復旧・検証し、いきなり削除や再インストールを行わない。
- ローカルリポジトリ：`C:\Users\sukiy\Documents\develop\sd_2602`。最終確認ブランチは`line-test`。実行時は再確認する。

## 話題別
| 資料 | 内容 |
|---|---|
| [ローカルBot・実行環境](context/local-bot.md) | 現行の最小実装、Node.js、cloudflared、テスト・実機確認の区別 |
| [Managerのカード自動化](context/manager-cards.md) | 作成するカードの正確な値、キーワード、セットの作成・削除方針 |
| [画面操作障害・代替](context/tool-troubleshooting.md) | 確認済みエラー、仮説、復旧候補・未接続の代替 |
| [再開手順と判断待ち](context/next-steps.md) | 検証順序、完了条件、まだ着手していない作業 |

## 他の設計資料との関係
- アプリ本体の正本は[設計の入口](schedule-design-index.md)とリンク先。ここで本体仕様を再定義しない。
- 現在の[DB草案](schedule-state-and-schema.md)はBase44標準User＋7種類。適用・接続済みではない。古いPostgreSQL案を確定仕様として復活させない。
- 現行Botの保存なし構成は[ローカル検証版の記録](schedule-local-prototype-storage.md)。本番DB設計とは別。
- ManagerのカードタイプメッセージとMessaging APIのFlex Messageは別経路。同じものとして扱わない。
- 実データ・秘密・ログイン状態をこのコンテキストへ保存しない。資料の記述を管理画面変更済みの証拠にしない。

## Git・作業保護
- `front-test`のGitHub側にDigを追加済み：`.agents/skills/dig/SKILL.md`と`agents/openai.yaml`。コミット`093e72ed697a47ce605c0e3aff8ca3d2696dc0d3`。
- ローカル`line-test`にはBot・本体設計の未コミット変更と画像等がある。この記録作成ではコミット・push・ブランチ切替を行わない。
- 別作業による設計資料の更新がある。編集前に読み直し、無関係な変更をリセットしない。
