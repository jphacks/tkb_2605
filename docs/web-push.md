# Webプッシュ通知（フロント実装）

今回の追加はフロントのみ。通知許可、ブラウザー購読、登録・解除APIの呼び出し、Service WorkerでのOS通知、通知クリック、ホーム画面用manifestを実装する。バックエンド、DB、送信処理、VAPID秘密鍵、デプロイ設定は変更しない。

**以下のAPIはフロントが提案する接続契約であり、Issue #42に定義済みのAPIではない。** バックエンドがこの契約を実装し、認証を接続するまでは実端末への配送はできない。HTTP 404/501/503を「準備中」、401/403を「ログイン確認」と表示し、有効化に成功したようには扱わない。

## バックエンドへ渡す接続契約

同一オリジンのセッションCookieで認証する。ユーザーIDや受信者IDはブラウザーから送らず、サーバーが認証済みユーザーに紐づける。すべての応答はキャッシュしない。

| 操作 | リクエスト | 成功応答 |
| --- | --- | --- |
| 公開鍵とCSRFトークン | `GET /api/push/config/` | 200: `{"public_key":"<VAPID public key>","csrf_token":"<session CSRF token>"}` |
| この端末を登録／再同期 | `POST /api/push/subscriptions/` | 200または204、応答ボディ不要 |
| この端末の登録を削除 | `DELETE /api/push/subscriptions/` | 200または204、応答ボディ不要 |

`public_key` はP-256非圧縮公開鍵（65バイト、先頭04）のbase64url。秘密鍵はフロントへ渡さない。POST/DELETEはJSON、`X-CSRFToken`にconfigで得たトークンを渡す。

POSTボディはブラウザーの `PushSubscription.toJSON()` のまま:

```json
{
  "endpoint": "https://<browser-push-service>/<opaque-device-endpoint>",
  "expirationTime": null,
  "keys": { "p256dh": "<browser-encryption-public-key>", "auth": "<browser-auth-secret>" }
}
```

DELETEボディは `{"endpoint":"<same endpoint>"}`。登録と削除は冪等にし、他人の登録を変更しない。所有者の衝突や端末上限は409で返す。購読URLと鍵は機微情報としてログに出さず、通知サービスへの外向きアクセスはバックエンドで検証する。無効な購読への404/410で登録を削除する。ブラウザーを解除できてもDELETEが失敗した場合、UIは「この端末は停止、サーバーの削除は未完了」と明示する。

## 通知APIとの接続（バックエンド担当）

1. 既存 `POST /api/notify/` で送信者を認証し、受信者と通知IDを確定して保存する。
2. 受信者の登録端末へVAPIDによるWeb Pushを送る。送信と再送はサーバー側の責任とする。
3. 暗号化するJSONペイロードは `{"type":"workout","notification_id":123}`。同じ通知の再送には同じIDを使用する。
4. 受信側 `GET /api/notify/` にも同じ通知を返す。プッシュ受信を一覧データの代わりにしない。

`notification_id` は正の安全な整数。OS通知は固定タイトル「WORKOUT」と固定の新着案内を表示し、送信者名などをロック画面に出さない。IDをtagに使うため、同一通知の再送は既存通知を置き換える（`renotify: false`）。配送の厳密な一回性を保証する仕組みではない。空または不正なペイロードでも汎用の通知を表示する。

## フロントの動作

- 設定は `/notifications` 内。「プッシュ通知を有効にする」を押したときだけ `Notification.requestPermission()` を直接呼ぶ。ページ表示時には許可ダイアログも新規購読も開始しない。
- 設定画面では公開鍵と既存購読を確認する。既に購読していればサーバーへ再同期し、登録成功を確認してから「オン」にする。APIが失敗した場合は「登録を要確認」。鍵が変更された場合は明示的な解除・再登録を案内する。
- 新規購読の保存に失敗したらブラウザー購読も解除する。通信がタイムアウトしてPOSTだけ成功していても、古い購読は無効になる。書き込みを自動再試行しない。
- 解除はブラウザーを先に無効化し、続いてサーバーへDELETE。サーバー停止中にも端末での受信は止められる。
- `/push-sw.js` はルートscopeの専用Service Worker。APIレスポンスのキャッシュ、オフラインページ、fetchハンドラーは追加しない。nginxでもWorkerファイルはキャッシュ更新を確認し、ファイル不存在時にSPAのHTMLを返さない。
- `push` で `showNotification` を呼び、開いているアプリにはメッセージを送って通知一覧のGETを促す。
- 通知タップで同一オリジンの `/notifications` を開く。開いているウィンドウがあれば再利用する。外部URLやペイロード指定のURLを開かない。
- タブを閉じる際に購読を解除しない。現在のプレビュー終了では `releaseDevicePush()` で端末を解除する。今後のログアウト処理も**セッションを破棄する前**に同じ関数を呼ぶ。許可操作や端末登録が終了処理と競合した場合も、遅れて完了した新規購読を解除する。
- 購読の自動更新イベントだけには依存しない。次回設定画面で既存購読を再同期し、ブラウザーが購読を失っていれば再び有効化ボタンを表示する。

## 認証・環境上の境界

現在の本番ログイン画面は未接続。既存のアクセス制御を維持し、開発プレビューを本物のログインとは扱わない。認証担当は `App.tsx` のアクセス許可とNotificationProviderのenabledを実セッションに接続する。通知タップでログイン画面になった場合は、既存の `location.state.from` を使って認証後に `/notifications` に戻す。

HTTPS（ローカル開発はlocalhost）とPush API対応ブラウザーが必要。iOS/iPadOSでは16.4以降のホーム画面に追加したWebアプリで利用する。タブを閉じても受信できるが、OSの通知許可、集中モード、電源・通信状態、ブラウザーのバックグラウンド動作によって表示が遅れたり制限されたりする。ブラウザーの完全終了や端末停止を越えた即時配送は保証しない。

ホーム画面アイコンは `node scripts/generate-push-icons.mjs` で再生成できる。外部素材・追加npm依存は不要。

## 検証

- `npm test`: 許可拒否、API契約とCSRF、既存購読、鍵変更、登録失敗時の解除、解除の部分失敗、終了処理との競合、Workerの受信・固定遷移・ウィンドウ再利用をモックで確認。
- `npm run lint` / `npm run build`。本番ビルドにWorker・manifest・PNGが含まれることを確認。
- ブラウザーで未対応環境／API未接続時の表示、320px幅での設定画面を確認。
- **実際のプッシュサービス経由の配送は未検証。** バックエンド接続後は実端末で、通知許可→登録→タブを閉じる→別のユーザーが送信→OS通知→タップ→一覧表示、拒否、解除、ログアウト後の停止を確認する。

参考: [MDN PushManager.subscribe](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe)、[WebKit: iOS/iPadOS Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)。
