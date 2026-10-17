# ローカルBotと実行環境

更新：2026-10-17。ここは確認済みの検証実装の記録。本番・Manager自動化の完了記録ではない。

## 現行構成
- 場所：`C:\Users\sukiy\Documents\develop\sd_2602\line-schedule-bot`。
- 元の`Hackathon\line-schedule-bot`はコピー照合後、利用者の指示で削除済み。
- 利用者の指示でカード・投票・保存を外し、キーワード受信と文章返信だけへ縮小。
- `src/server.js`：HTTP受付、HMAC署名検証、キーワード判定、LINE Reply API。
- `test/bot.test.js`：実LINEへ送信しない4件のローカルテスト。最後の実行は全件成功。
- 入力：前後の空白を除いた`＠リスケ`／`@リスケ`。個別トークとグループに対応。実メンション判定ではない。
- 出力：「リスケBotです。受信できました。」というtextメッセージ1件。
- 通常の会話・友だち追加等へは返信しない。
- `GET /health`→`ok`、`POST /webhook`。署名付き空eventsによるLINE Verifyに対応。
- DB・JSONファイルの読み書きなし。過去の`data/`は保持されるが使わない。`package.json`は実行設定でDBではない。
- メモリ上の直近1000イベントIDで重複を抑止。再起動後の重複排除・厳密な一回配信は保証しない。
- `.env`は保持済み。secret/tokenの項目が存在することは確認したが、有効性・対象チャネルの一致を確認済みとは扱わない。

## npmなしで起動
このPCのCodex同梱Node.jsはv24.19.0。追加パッケージ依存がないためnpmは不要。

```powershell
Set-Location -LiteralPath 'C:\Users\sukiy\Documents\develop\sd_2602\line-schedule-bot'
$nodeExe = "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
& $nodeExe --test
& $nodeExe --env-file=.env src/server.js
```

- `.env: not found`は実行フォルダー違いの可能性。上記へ移動してから起動する。
- PowerShellが`>>`のままならCtrl+Cで入力途中を解除。
- Botを再起動する前に旧プロセスをCtrl+Cで停止。起動中かはその都度確認する。
- http://127.0.0.1:3000/health のokはPC内の起動確認。LINE送受信成功とは別。

## cloudflared
確認済み実行ファイル：`C:\Program Files (x86)\cloudflared\cloudflared.exe`。バージョン2026.10.1。
短いコマンド名が認識されない事象は、実行ファイル不在ではなくPATH未反映だった。

別のPowerShellで：
```powershell
& 'C:\Program Files (x86)\cloudflared\cloudflared.exe' tunnel --url http://127.0.0.1:3000
```

生成URL/healthでokを確認し、生成URL/webhookをLINEへ登録する。URLは再起動で変わり得る。現在有効な公開URLは未記録。トンネル起動中とも断定しない。

## LINE設定は方式ごとに区別
- このWebhook Botだけを確認する場合：Webhook ON、Managerの応答メッセージOFF、あいさつOFF。
- Managerの「テスト」キーワード応答を確認する場合：対象の組込み応答機能・ルールを有効にする必要がある。上のOFF設定をそのまま流用しない。
- 双方を混ぜて二重返信の原因を作らない。現在の管理画面設定は未確認。
- 利用者はManagerでカードのモックを作成済みと報告。これはローカルBotによる実LINE返信の成功証拠ではない。

旧コード退避：`C:\Users\sukiy\AppData\Local\Temp\line-schedule-bot-before-minimal-445e746b695b432d9222170c2eb569e2.zip`。存在・保持は復元時に再確認する。
