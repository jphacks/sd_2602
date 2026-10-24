# srcの構成

2026-10-24の整理後の配置。URLと機能の挙動は維持し、ファイルと参照先を整理した。

```text
src/
  routes/                      URL・ページの入口・API受付（配置維持）
  features/
    personal/
      components/              個人表示・レイアウト・CSS
      server/                  固定デモの取得入口と組立
    pair/
      components/              比較表示・共有カード・CSS
      server.js                比較デモのサーバー関数
      demo.server.js           固定データの組立
      share.js                 共有するデータと文章の組立
      image.js                 ブラウザでのPNG生成
      presentation.js          比較表示用の色・表示形式
    google-calendar/
      components/              固定応答のプレビュー画面
      server/                  Google取得・変換・固定プレビュー
    account/
      components/              Google連携画面・接続案内
      server.js                本人確認付きの接続確認・予定取得入口
      service.js               接続状態の整理
      flow.js                  ブラウザの接続開始・復帰情報
    admin/
      components/              設定・調整ルール・運用履歴
      server.js                本人確認付きDB操作
      format.js                表示形式
  domain/schedule/             外部サービスに依存しない共通計算・日時・候補文章
  shared/ui/schedule/          個人・比較の共通表示部品
  components/
    auth/                      認証画面・ゲート（開発ルールの配置を維持）
    ui/                        共通UIキット（既存配置を維持）
    DefaultCatchBoundary.jsx
    NotFound.jsx
  lib/                         共通の認証・クエリ・基盤処理、固定データ変換等
  api/base44Client.js          Base44ツールが参照する指定位置を維持
  hooks/                       共通Hook
  mock/                        固定テストデータ
  router.jsx
  start.js
  index.css
```

## 読み方と依存の境界

- routesは画面の入口。画面部品はfeatures内で探す。
- domain/scheduleは計算ルール。ReactやBase44 SDK、外部APIへ接続しない。
- featuresの中にはブラウザ処理とサーバー処理の両方がある。フォルダ名だけで実行場所を判断しない。
- サーバー関数の境界と本人確認・所有者確認は維持する。秘密はサーバー側だけで扱う。
- 個人デモ：routes/me/index.jsx → features/personal/server/server.js → demo.server.js → service.js → domain/schedule → features/personal/components。
- Google：features/account/server.js → features/google-calendar/server/service.js → Google取得・変換 → domain/schedule → 個人表示。DB保存を新たに追加したものではない。
- LINEの公開関数とエンティティ定義は従来どおりbase44/。今回の配置変更の対象外。

## 今回あえて残したもの

認証基盤、Base44の指定パス、共通UIキット、Hook、テスト用アダプターは現位置を維持した。AI・テンプレート・UI部品の削除候補は、通常のimport以外の参照や採用予定も調査してから別の変更で扱う。

既存のfeatures間参照は挙動維持のため残した。例えば共通の凡例が比較用の色定義を参照する点などは、今後の共通化候補であり、今回新たな抽象化や契約変更はしない。

詳細：[ADR](../docs/spec/adr/2026-10-24-src-organization.md)、[確認記録](../docs/dev/src-reorganization-checklist.md)。
