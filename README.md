# りすけ（Risuke）— Base44 App（TanStack Start）

Google Calendar の予定から日別の余裕（芝）を可視化し、候補日を提案・LINEで共有するスケジュール調整支援アプリ。多忙度は固定ロジックで計算し、AI補正は行わない。設計の正本は [architecture.md](./architecture.md)。

## アプリの内容

| 部位 | ファイル | 状態 |
| --- | --- | --- |
| 計算コア（純関数） | `src/lib/modules/normalize.js`（正規化）・`busyness.js`（日別/時間別多忙度）・`recommend.js`（候補最大3件） | 実装・検証済み |
| モック取得 | `src/lib/adapters/calendar-mock.js` + `src/mock/seed.json`（固定フィクスチャ） | 実装済み |
| エンティティ | `base44/entities/`（標準User + 7種類） | 定義済み（RLSは後日設定） |
| 画面 | `src/routes/index.jsx`（starterのまま） | デザイン確定後に実装 |
| LINE Webhook | — | 設計合意済み・未実装 |

ページとAPIルートは TanStack Start のファイルベース。starterのルートは `/`（`src/routes/index.jsx`）と `GET /api/time`（`src/routes/api/time.js`）。

## ローカル実行

```bash
npm ci
base44 login   # 初回1回
base44 link    # 初回1回
base44 dev     # ローカルバックエンド + アプリ
```

## ビルドと公開

```bash
npm run build         # -> dist/client (assets) + dist/server (the Worker)
base44 deploy         # GitHubリンク前のみ。リンク後は main へ統合し Base44 で Publish
```

`index.html` は存在しない。サーバーが `src/routes/__root.jsx` から HTML を生成する。ビルドは Cloudflare Vite プラグイン経由で、サーバーコードは workerd で動作する。

## 構成の説明

- **計算コアは純関数**（`src/lib/modules/`）：DB・外部API・時計に依存せず、固定入力で単独実行できる。入出力契約は [architecture.md](./architecture.md) §6 で固定（変更時は承認を要する）。
- **Google Calendar 互換**：正規化イベント形式は Google Calendar Events API の項目に対応する（`architecture.md` §6.2 の対応表）。予定名・本文は保存しない。
- **エンティティ**：Base44 内蔵DB。標準User + 7種類（UserProfile / CalendarSource / ManualAdjustment / AvailabilitySnapshot / GroupPermission / ShareSnapshot / OperationRun）。更新制御・公開切替の設計は `architecture.md` §2。
- **シークレット**：サーバーコードでは `import { secrets } from "base44:runtime"` → `secrets.get("NAME")` をハンドラ内で読む。`process.env` は使わない。値はフロントエンド・ログに出さない。
- **サーバールート**（`src/routes/api/*.js`）：アプリ外のURLからの要求（Webhook等）向けの生HTTPエンドポイント。アプリ内の画面はサーバー関数（`src/lib/server-fns.js`）を使う。
- **サーバー専用コード**は `*.server.js` に置く（ブラウザバンドルに含まれない）。
- **認証**：ハイドレーション後にクライアント側で解決される（`useAuth()`）。ユーザー別ページは `ssr: false` にする。
- **キャッシュ**：プラットフォームは各ルートが `headers()` で明示したもののみキャッシュする。それ以外は常に最新を返す。

## 関連ドキュメント

- アーキテクチャ・モジュール契約：[architecture.md](./architecture.md)
- 設計ドキュメント一式：GitHub `jphacks/sd_2602` の `docs/`（DB草案・実行ログ仕様・LINE仕様）
## 移行時の注意

- 元アプリは保持。eject先は別アプリ・空のDBです。
- 管理上の新アプリ名は `SyncEngine Copy`。製品名はRisukeです。
- GitHub連携はBuilder以上が必要です。リンク後は手動deployと混在させません。
- Secrets・外部連携・権限は移行後に確認します。RLSは未設定のため、実データを入れる前に設定・検証してください。
- 既存の `docs/` と `line-schedule-bot/` は保持しています。LINE Botは別の検証用プログラムで、このWebアプリにWebhookを追加する作業は含みません。

## 提出用テンプレート（既存内容）

# りすけ

[![IMAGE ALT TEXT HERE](https://jphacks.com/wp-content/uploads/2026/07/IMG_5316.png)](https://www.youtube.com/watch?v=piaNsc6ilBI)

## 製品概要
### 背景(製品開発のきっかけ、課題等）
### 製品説明（具体的な製品の説明）
### 特長
#### 1. 特長1
#### 2. 特長2
#### 3. 特長3

### 解決出来ること
### 今後の展望
### 注力したこと（こだわり等）
* 
* 

## 開発技術
### 活用した技術
#### API・データ
* 
* 

#### フレームワーク・ライブラリ・モジュール
* 
* 

#### デバイス
* 
* 

### 独自技術
#### ハッカソンで開発した独自機能・技術
* 独自で開発したものの内容をこちらに記載してください
* 特に力を入れた部分をファイルリンク、またはcommit_idを記載してください。
