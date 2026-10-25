# 認証機能の開発

PR #48でメールアドレスによるセッション認証が追加されました。`AUTH_USER_MODEL` は `users.User` です。新規DBは通常の `migrate` で作成できます。既存DBは [READMEの切り替え手順](../README.md#dbのユーザモデルの切り替え) の前提条件を確認してください。

## APIを接続する順序

フロントからは同一オリジンの `/api/` を使用し、Cookieを含めて通信します。開発時もViteのプロキシを通します。

開発用Composeは `http://localhost:5173` と `http://127.0.0.1:5173` をCSRFの信頼済みOriginに設定しています。ポートやホスト名を変える場合は `.env` の `DJANGO_CSRF_TRUSTED_ORIGINS` に利用するOriginをカンマ区切りで指定して `docker compose up -d backend` を実行してください。Viteが転送先のHostを変更するため、この設定がないと正しいトークンでもブラウザのログインが403になります。本番の許可Originは本番環境で別途設定します。

1. 登録は `POST /api/auth/register/` に `email`・`password`・`user_name` を送ります。成功は201です。登録だけではログインしません。
2. `GET /api/auth/csrf/` の `csrf_token` を取得します。応答でCSRF Cookieも設定されます。
3. `POST /api/auth/login/` に `email`・`password` を送り、`X-CSRFToken` ヘッダーへ取得したトークンを付けます。成功は200で、セッションCookieが設定されます。
4. ログインするとCSRFトークンが更新されます。`GET /api/auth/csrf/` でもう一度取得し、以降のPOST・PUT・PATCH・DELETEに使います。ログイン前のトークンを使い続けると403になります。
5. 起動時・再読み込み時は `GET /api/users/me/` でログイン状態を復元します。成功は200、未認証は現在403です。
6. ログアウトはCSRFヘッダー付き `POST /api/auth/logout/` で、成功は204です。画面のユーザー情報やユーザーに紐づくキャッシュも破棄します。

登録・ログイン・自分の情報の応答は `{ "user_id": "1", "email": "...", "user_name": "..." }` です。パスワードは応答に含まれません。認証APIの `user_id` は文字列、記録APIの `user_id` は数値なので、フロント内で比較するときは型を統一してください。

認証情報の不一致・登録時の入力不備は400です。403には未認証とCSRF失敗の両方があるため、すべてを「セッション切れ」として扱わず、操作内容とエラーを確認します。

フロントは上記へ接続済みです。新規登録成功後にログインし、開始時のURLへ戻ります。初期確認中は保護画面を表示せず、通信障害は未認証と区別して再試行を表示します。フォーカス復帰・別タブのログイン／ログアウトでも再確認します。認証情報をlocalStorageへ保存しません。

記録・投稿・いいね・通知は共通のセッション通信を使います。401/403では自分の情報を再確認し、CSRF失敗だけでログアウト扱いにはしません。書き込みの自動再送は行いません。ログアウトでは端末のプッシュ購読を解除してからサーバーのセッションを終了し、進行中リクエスト・記録入力・通知・プロフィール表示の編集・マスメイト表示を破棄します。別アカウントの応答を作成成功として扱いません。

バックエンド未実装の範囲：投稿は固定応答、プロフィール更新・他人の詳細取得・マスメイト保存はAPIなし、通知・プッシュの保存／配送は接続契約に従うサーバー実装が必要です。フロントでは取得失敗や未対応を明示し、架空の保存成功に置き換えません。自分の名前は認証APIから読み取り、自己紹介・色の編集はタブ内表示だけです。

フロントの回帰確認は `docker compose exec -T frontend npm test`・`npm run lint`・`npm run build`。認証テストではCSRF更新、セッション失効、通信障害、アカウント切り替え、古い応答の破棄、同一オリジンへの復帰を検証します。

## ユーザーを使うテスト

`username` は廃止されています。記録テストのようにパスワードログインが不要な場合は、次の形式でユーザーを作ります。

```python
user = get_user_model().objects.create_user(
    email="record-user@example.test",
    password=None,
    user_name="record-user",
)
```

`password=None` は利用不能なパスワードになります。ログイン自体のテストではパスワードを指定し、`APIClient(enforce_csrf_checks=True)` でCookie・CSRFを含むフローを確認します。

```bash
docker compose exec -T backend python manage.py check
docker compose exec -T backend python manage.py makemigrations --check --dry-run
docker compose exec -T backend python manage.py test
```

`core.tests.test_auth_api` では登録、CSRF付きログイン、ログイン後のトークン更新、記録の所有者、ログアウト後のアクセス拒否、重複登録、弱いパスワード、認証失敗を検証します。テスト用DBを使い、開発DBへアカウントを残しません。種目の初期投入は [種目マスター](exercise-master.md#dbへの初期投入更新) を参照してください。
