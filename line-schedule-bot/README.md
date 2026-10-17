# LINE Bot：キーワード受信・文章返信だけの最小検証

## 合格条件
SD_2602公式アカウントとの個別トークで、文字列「＠リスケ」または「@リスケ」を送ると、
「リスケBotです。受信できました。」が1件返ること。前後の空白は無視する。
LINEの実メンション操作は不要。通常の会話、友だち追加などには返信しない。
グループから同じキーワードを送っても応答するが、まず個別トークで確認する。

カード・投票・日付生成・カレンダー・DB保存は含まない。
既存のdata/は過去の検証データとして残るが、このプログラムは読み書きしない。
.envは既存の接続情報をそのまま使う。秘密情報をGitやチャットへ貼らない。

## 構成
- src/server.js：HTTP受付、署名検証、キーワード判定、LINE返信。
- test/bot.test.js：架空の入力と模擬返信によるローカルテスト。実LINEへの送信なし。
- .env.example：設定項目の見本。.envを上書きしない。
- package.json：Node.js要件と実行コマンド。追加パッケージなし。
- README.md：起動と実機確認の手順。

## 1. PC内で起動
Node.js 22以上。このPCではnpmの代わりにCodex同梱Node.jsを直接使える。
パスはこのPC固有であり、他のPCではインストール済みNode.jsへ置き換える。

```powershell
Set-Location -LiteralPath 'C:\Users\sukiy\Documents\develop\sd_2602\line-schedule-bot'
$nodeExe = "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
& $nodeExe --test
& $nodeExe --env-file=.env src/server.js
```

起動したPowerShellは開いたままにする。
http://127.0.0.1:3000/health でokならPC内の受付は起動済み。
PORTを変更していればその番号を使用。停止はCtrl+C。
コードを変更した場合、以前のBotをCtrl+Cで止めてから再起動する。

## 2. 検証用HTTPS接続
別のPowerShellで次を実行する。

```powershell
& 'C:\Program Files (x86)\cloudflared\cloudflared.exe' tunnel --url http://127.0.0.1:3000
```

出力されたhttps://〜.trycloudflare.comに/healthを付け、okを確認する。
このウィンドウも開いたままにする。トンネルを再作成するとURLは変わり得る。

## 3. LINE側の最小設定
対象はSD_2602のMessaging APIチャネル。
1. LINE Developers Console：Webhook URLを「生成されたHTTPS URL/webhook」にする。
2. VerifyでSuccessを確認し、Use webhookをONにする。
3. LINE Official Account Manager：応答メッセージOFF、あいさつメッセージOFF。
4. 個別トークで文字列「＠リスケ」を送る。

グループ参加設定・リッチメニュー・カードの設定変更は今回不要。
Channel secret/access tokenは当該チャネルの既存値を使用。再発行しない。
この文書に設定を記載したことは、実際の管理画面の設定変更済みを意味しない。

## ログで切り分け
- Webhook received: 0 event(s)：LINEのVerifyが届いた。
- Webhook received: 1 event(s)：署名確認済みのイベントが届いた。
- Keyword matched：キーワードに一致した。
- Reply sent：LINE返信APIが成功した。実機の画面でも受信を確認する。
- Webhook rejected: invalid signature：Channel secretとチャネルの対応を確認。
- Webhook failed: LINE_HTTP_401：access tokenの有効性・対応チャネルを確認。

会話全文・ユーザーID・トークンはログへ出さない。
イベントIDによる重複抑止はメモリ上の直近1000件のみで、再起動後は維持しない。
永続キュー・送信保証・本番運用は今回の対象外。

公式手順：https://developers.line.biz/en/docs/messaging-api/building-bot/
