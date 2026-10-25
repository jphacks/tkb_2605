# プロフィール・マスメイトAPI

すべてセッション認証が必要。未認証は403、書き込みはCSRF CookieとX-CSRFTokenが必要。

| 操作 | URL | 応答 |
|---|---|---|
| 自分のプロフィール | GET /api/users/me/profile/ | プロフィール |
| 自分を編集 | PATCH /api/users/me/profile/ | 保存後のプロフィール |
| 他人のプロフィール | GET /api/users/{id}/profile/ | プロフィール（不在・無効ユーザーは404） |
| ユーザー検索 | GET /api/users/?q=&masmates=false&limit=20&offset=0 | results, next_offset |
| マスメイトになる | PUT /api/users/{id}/masmate/ | 相手のプロフィール、is_masmate:true |

プロフィールは user_id（文字列）、user_name、bio、avatar_color、is_masmate。公開応答にメールアドレス・パスワードを含めない。既存の /api/users/me/ と登録・ログインの応答形式は変更しない。

PATCHはuser_name（空白除去後1〜50文字）、bio（空文字可、160文字まで）、avatar_color（#f0d9d1 / #f3dfcc / #e7dff0 / #dce9ee）のうち1項目以上。未指定の項目は保持。未知の項目や不正値は400。ユーザーID・メール・パスワード・権限の変更は不可。

検索は表示名の部分一致（qは50文字まで）。自分と無効ユーザーを除き、user_nameとID順。masmates=trueで接続済みの人だけを検索。limitは1〜100、offsetは0以上の整数。next_offsetがnullで終端。マスメイト数ではなく検索結果のページングであり、空の検索語では全対象を列挙する。

PUTの本文は不要。2人のIDを小さい順に並べた1レコードで保存し、DBの順序制約と一意制約で自己関係・逆順・重複を防ぐ。双方の一覧・プロフィールに即時反映し、再送や反対側からの追加も200。承認・解除APIはない。相手の指定を本文で上書きできない。

## 移行と確認

users.0002は既存ユーザーへ空の自己紹介と既定色を追加し、マスメイト用テーブルを作る。ユーザーや記録を削除しない。users.0001まで移行済みの環境で、DBバックアップ後に次を実行する。

```bash
docker compose exec -T backend python manage.py migrate
docker compose exec -T backend python manage.py check
docker compose exec -T backend python manage.py test users
```

旧auth.Userからの切り替えが未完了のDBは、先にREADMEのユーザーモデル移行を行う。投稿の永続化・チャット・通知配送は今回の追加に含めない。
