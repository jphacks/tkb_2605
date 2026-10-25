# Web Pushのフロント接続

アプリ内の通知設定画面・種類選択・オンオフ・解除ボタンは実装しない。受信対象は開始といいねの全通知で、通知を止める場合は端末／ブラウザーの設定で許可を取り消す。初回の開始操作からブラウザー標準の許可ダイアログを開く。許可済み端末は利用開始・フォーカス復帰時に登録を同期する。ログアウト／検知したアカウント変更では、別ユーザーの通知を受けないよう `releaseDevicePush()` を呼ぶ。

## バックエンド担当への提案契約（未実装）

| 操作 | URL | 成功 |
|---|---|---|
| 公開鍵とCSRF | GET /api/push/config/ | 200: {public_key, csrf_token} |
| 端末登録／再同期 | POST /api/push/subscriptions/ | 200/204 |
| ログアウト時の端末情報削除 | DELETE /api/push/subscriptions/ | 200/204 |

同一オリジンのセッションCookieを使う。POST/DELETEではconfigのCSRFトークンをX-CSRFTokenへ渡す。POSTはブラウザーのPushSubscription.toJSON()（endpoint, expirationTime, keys.p256dh, keys.auth）、DELETEは{endpoint}。認証済みユーザーへの紐づけ、所有権の確認、冪等登録、秘密鍵の管理、通知保存時の配送、失効端末の404/410削除はバックエンド担当。公開鍵はP-256非圧縮65バイトのbase64url。秘密鍵はフロントへ渡さない。

通知保存後、宛先ユーザーの全端末にWeb Pushを送る。ペイロードは{notification_id:123}。開始・いいねの両方を同じ受信処理で扱い、ロック画面には送信者名などを含めない汎用の新着案内を表示する。同じIDは同じtagに置き換える。詳細はGETの通知履歴を取得する。

## 動作と境界

- /push-sw.jsでOS通知を表示し、アプリへ一覧再取得のメッセージを送る。APIや認証データをキャッシュしない。
- タップ先は常に同一オリジンの/notifications。既存ウィンドウを優先し、なければ新しく開く。
- 拒否・非対応・サーバー未接続でも、トレーニングとGET履歴を妨げない。登録失敗時は新規購読を取り消し、自動で書き込みを再送しない。
- アプリ終了時は購読を残すが、ログアウト時は端末で解除する。同期中・許可待ち・登録中の遅延処理が終了後に再登録しないよう世代を確認する。
- HTTPS（ローカルはlocalhost）と対応ブラウザーが必要。iOS/iPadOS 16.4以降はホーム画面に追加して開く。OS・集中モード・通信・ブラウザー動作による配送制限がある。
- 認証APIへ接続済み。未ログイン時は保護画面を開かず、OS通知のリンクはログイン後は必ずホームを表示する。通知一覧はホームのベルから開く。

実配送はバックエンド接続後に実端末で確認する。現時点ではAPI／購読／Workerのモック試験と画面確認を実施。アイコンはnode scripts/generate-push-icons.mjsで再生成する。

参考: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe)、[WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)。
