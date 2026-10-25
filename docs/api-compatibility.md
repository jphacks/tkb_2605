# API・データ仕様との対応

ホーム・種目選択・おすすめ・記録・結果のAPI対応状況。記録APIはIssue #31のURL・JSON構造を維持し、noteのrepositoryを使ったDB保存とセッション認証に接続している。投稿APIは引き続き固定応答。

## 定義済みの投稿API

[Issue #10](https://github.com/jphacks/tkb_2605/issues/10) と [mainのURL定義](https://github.com/jphacks/tkb_2605/blob/8a7523ce13ad38433c4504801bc9f8c3ab4a301a/backend/posts/urls.py)・[実装](https://github.com/jphacks/tkb_2605/blob/8a7523ce13ad38433c4504801bc9f8c3ab4a301a/backend/posts/views.py)には次の相違がある。

| 操作 | mainのURL | Issueの成功コード | mainの成功コード |
|---|---|---|---|
| POST 投稿作成 | `/api/posts/` | 200 | 201 |
| GET 投稿一覧 | `/api/posts/` | 201 | 200 |
| GET ユーザー別投稿 | `/api/users/{user_id}/posts/` | 201 | 200 |
| PUT いいね | `/api/posts/{post_id}/like/` | 200 | 200 |

ホームの投稿クライアントは2xxを受け付け、JSONの形・投稿型・対象投稿IDを検証する。いいねは末尾スラッシュ付きURLへのボディなしPUT。ユーザー別投稿URLはIssueでは末尾スラッシュなしだが、mainはスラッシュありであり、今回のホームからは呼ばない。`limit` は1〜100、`offset` は0以上、履歴終端は `next_offset: null` とする。書き込みでは既存の同一オリジンCookieと、取得できる場合のDjango標準 `csrftoken` / `X-CSRFToken` を使用する。

ホームは開発環境でも常に投稿APIを取得し、フロントのサンプル投稿・通知やサンプル/APIの切り替えは使用しない。初回は `limit=20&offset=0`、追加取得は `limit=20` と応答の `next_offset` を使い、offsetをフロントで加算しない。空のページでも `next_offset` があれば次へ進め、`null` のときだけ終端とする。失敗時は取得済み投稿とoffsetを保持し、同じ位置で再試行する。投稿は `post_id` でページ内・ページ間の重複を除去し、既存投稿のいいね状態を維持する。

mainは固定のサンプル応答を返すスタブで、投稿の永続化・いいねの実トグルは未実装。POSTは入力によらず `post_type: 1` を返すため、タイプ2・3の作成応答はフロントの型一致検証で拒否する。PUTも固定の投稿ID・件数・状態を返す。接続確認の成功を、保存やトグルの完成とは扱わない。

ホームはマスメイト・ベルの2タブ。マスメイトのサーバー側分類は未実装で、投稿APIの結果を表示する。通知は[通知仕様](notifications.md)のGETへ接続。ログアウトやアカウント変更で取得済みデータを破棄する。

### 投稿・いいねテーブルとの対応

[Issue #6](https://github.com/jphacks/tkb_2605/issues/6) と `feature/table_posts` の [モデル・migration（1be5c27）](https://github.com/jphacks/tkb_2605/tree/1be5c27/backend/posts) を確認した。確認時点のmain `aed893c` にはこのテーブル変更は未統合で、当該ブランチでも投稿APIのviews・URLはmainと同じ固定応答である。

| DBの定義 | フロントとの対応 |
|---|---|
| `Posts.post_id`: UUID主キー、DB側で採番 | APIでは文字列のまま扱う。数値化・フロント採番を行わず、一覧の識別・投稿リンク・いいねURLへ同じIDを渡す。既存モックの `"12"` も引き続き扱う |
| `Posts.user_id`: 100文字までの文字列 | 投稿者IDとして保持する。認証済みの現在ユーザーIDと推定しない |
| `post_type`・`content`・自動設定の`posted_at`・nullableな`workout_id` | 既存APIの3種類の投稿、本文、日時、任意の記録IDに対応 |
| `Like.id`: 自動採番、`Like.post_id`: 投稿への外部キー（CASCADE）、`Like.user_id`: 文字列 | いいねは投稿IDをURLで指定する。Like行のIDやuser_idをフロントから送るAPIには変更しない |

`user_name`・`like_count`・`is_liked` は投稿テーブルの列ではなくAPI表示用の情報。フロントはIssue #10の応答から取得し、DBの生の投稿行・いいね行をそのままAPI応答として扱わない。テーブル追加だけでAPIの永続化・トグルが完成したとは扱わない。

[Issue #35](https://github.com/jphacks/tkb_2605/issues/35) の投稿保存・フォロー中投稿のページング・投稿存在確認、[Issue #36](https://github.com/jphacks/tkb_2605/issues/36) のいいね済み確認・件数集計・ユーザー別保存はバックエンドの作業項目。これらに対する新しいURLや追加リクエスト項目は未定義。現在のGETの`limit`/`offset`・応答の`next_offset`と、本文なしPUTのいいね処理を維持する。

UUIDの投稿IDで一覧・ページング・作成・いいねを検証するテスト、およびAPI表示用情報が欠けたDB行を誤って受理しないテストを追加している。

## 記録API（DB接続）

[Issue #31](https://github.com/jphacks/tkb_2605/issues/31)の5操作を実装する。`/note/` を付けず、末尾スラッシュ付きURLを使う。

| 操作 | メソッド・URL | 成功コード | 現在の応答 |
|---|---|---|---|
| 開始 | `POST /api/workouts/` | 201 | UUID、ログイン中のuser_id、開始日時、未完了状態 |
| 種目追加 | `POST /api/workouts/{workout_id}/exercises/` | 201 | 指定したマスター種目と自動設定したposition |
| セット送信 | `POST /api/workout-exercises/{workout_exercise_id}/sets/` | 201 | 保存した全セット。再送は既存行を全置換 |
| 詳細取得 | `GET /api/workouts/{workout_id}/` | 200 | 保存済みの記録・種目・セット |
| 終了 | `PATCH /api/workouts/{workout_id}/` | 200 | DB更新後の完了状態。再実行も成功 |

認証はDjango標準のセッションCookie。全操作でログインが必要で、書き込みにはCSRF Cookieと`X-CSRFToken`が必要。未ログイン・CSRF不正は403、不正入力・UUID形式不正は400、存在しない記録・他人の記録・存在しない種目は404、完了後の種目追加・セット保存は409。予期しないDBエラーは成功に置き換えない。

入力形式は開始`{}`、追加`{exercise_id}`、セット`{sets:[{set_number,reps,weight}]}`、終了`{is_completed:true}`。未知のフィールドを拒否し、user_idは本文ではなく認証済みユーザーから取得する。重量は0〜99999.9・小数第1位までの文字列、回数とセット番号は正整数。セットは1件以上、番号の重複は禁止。セットの保存は全件成功か全件ロールバック。再送時はセットIDも再生成する。

応答のUUIDは文字列、user_idは整数、日時はタイムゾーン付き、重量は小数第1位の文字列。種目はposition順、セットはset_number順で返す。フロントは応答の構造・型とURL由来のIDを検証する。通信エラー時は保存されたか不明な場合があるため、自動再送しない。

### 画面の動作

DBの保存内容を復元し、選択種目・入力セットの一致を検証する。完了済みは読み取り専用、保存結果が不明な場合はGETで照合する。詳細と実DB検証は[DB版記録APIへの接続](workout-api.md)を参照。

### ブラウザの状態

進行中ID・送信結果の印をlocalStorage/sessionStorageに保存しない。旧`workout.active.v1:`・`workout.operation.v1:`・`workout.draft.v1:`の値は読み込み・移行・削除・送信しない。進行中の記録IDはURLで保持する。

入力と連打防止のロックは画面内だけに保持する。再読込ではDB保存済みのセットを再取得し、未送信の入力は復元しない。画面離脱・ログアウト後の遅延応答で遷移や後続PATCHを起こさない。認証API・ログイン画面と接続済み。開発確認は`/login`で登録・ログインする。セッション復元とCSRF更新は共通の認証処理で行う。

## 種目マスターと他画面

種目マスターはフロント所有の [JSONファイル](../frontend/src/features/exercises/serverCatalogData.json)。115種目・7部位・51器具区分・15おすすめ対応、種目名検索、部位・器具のAND絞り込みを維持する。`seed_exercises`コマンドで同じUUID・名称・関連をDBへ投入・更新する。起動時の自動実行は行わない。詳細は [種目マスター](exercise-master.md) を参照。

結果画面は [PR #27](https://github.com/jphacks/tkb_2605/pull/27) のUIを参照したGET接続版で、共有先は統合済みの [PR #30](https://github.com/jphacks/tkb_2605/pull/30) の投稿ダイアログ。投稿は既存の `post_type: 2`・`workout_id` の形式で送るが、現行スタブは `post_type: 1` を返すため成功として扱わない。認証ガード、ホームの投稿取得・ページングを維持する。投稿作成応答のユーザーIDもログイン中のIDと一致する必要がある。

## 検証

`frontend`で`npm test`・`npm run lint`・`npm run build`。バックエンドは`python manage.py test core.tests`でURL、DB保存・再取得・終了、入力エラー、所有者制限、セッション認証・CSRFを検証する。
