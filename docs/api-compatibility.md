# API・データ仕様との対応

ホーム・種目選択・おすすめ・記録・結果のAPI対応状況。記録APIは更新後のIssue #31とmain aed893cの固定サンプル実装に接続し、DB保存や認証があるものとして扱わない。

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

ホームの「フォロー中・フォロワー・通知」タブは維持する。関係・通知のHTTP契約が未定義のため、投稿2タブは分類が準備中である旨とともに同じ投稿一覧を表示し、通知タブは準備中表示とする。タブ切り替えでは投稿一覧を再生成せず、取得済み投稿・次のoffset・いいね状態を保持する。サンプルデータや仮の未読件数は表示しない。

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

## 記録API（現在のモック仕様）

[Issue #31](https://github.com/jphacks/tkb_2605/issues/31)（2026-10-24 18:20 JST更新）と [main `aed893c`](https://github.com/jphacks/tkb_2605/tree/aed893c) の実装を基準にする。`/note/` を付けず、末尾スラッシュ付きURLを使う。

| 操作 | メソッド・URL | 成功コード | 現在の応答 |
|---|---|---|---|
| 開始 | `POST /api/workouts/` | 201 | 固定ID `workout-1`、`user_id: 1` |
| 種目追加 | `POST /api/workouts/{workout_id}/exercises/` | 201 | URLのworkout_idと固定のベンチプレス `exercise-1` |
| セット送信 | `POST /api/workout-exercises/{workout_exercise_id}/sets/` | 201 | URLのIDと固定3セット |
| 詳細取得 | `GET /api/workouts/{workout_id}/` | 200 | URLのID、固定1種目・3セット、`is_completed: false` |
| 終了 | `PATCH /api/workouts/{workout_id}/` | 200 | URLのIDと`is_completed: true`。次のGETはfalseのまま |

APIは本文の読込・検証・反映、DB保存、ID採番、認証・所有権確認を行わない。POSTを繰り返しても同じIDを返す。2xxやPATCHのtrueを永続化の証拠にしない。

フロントは従来の入力形式（開始は`{}`、追加は`{exercise_id}`、セットは`{sets:[{set_number,reps,weight}]}`、終了は`{is_completed:true}`）を送る。これはフロント側の送信形式であり、現行APIが受理・検証する契約を意味しない。重量は0以上・小数第1位までの文字列、回数は正整数という入力検証を維持する。

応答の構造・型とURL由来のIDを検証する。選択した種目IDと返却exercise_idの一致、送信したセットと返却セットの件数・値の一致は要求しない。固定サンプルを正常に受け取り、画面では選択や入力が保存されたものとして表示しない。

### 画面の動作

1. ホームの「トレーニング開始」でPOSTし、返ったIDを選択画面のURLに渡す。おすすめの閲覧だけでは開始せず、種目選択時に開始する。
2. フロントのマスターIDで追加を要求するが、記録への遷移には応答のexercise_idとworkout_exercise_idを使う。現在はどの種目を選んでもAPIのベンチプレスが表示されることをサンプルの注記で伝える。
3. 記録画面はGETのサンプルを入力欄に表示し、編集・行追加・削除できる。GETを保存済み判定には使わない。「別の種目」「終了」で入力をPOSTし、固定サンプルの応答を受け取る。
4. 「終了」はセットPOST成功後にPATCHして結果へ進む。PATCHだけが失敗した場合は同じ画面内ではPATCHのみ再試行する。通信失敗は表示し、自動再送しない。現在のAPIは保存しないため、利用者による再試行を可能にする。
5. 結果はGETの固定サンプルを表示する。終了状態を捏造したり、falseを保存失敗・未終了と表示したりしない。実記録ではないため共有は無効とする。

### ブラウザの状態

固定user_idを認証済みユーザーとして扱わず、進行中ID・送信結果の印をlocalStorage/sessionStorageに保存しない。旧`workout.active.v1:`・`workout.operation.v1:`・`workout.draft.v1:`の値は読み込み・移行・削除・送信しない。古い送信中の印によって現在のモック操作が停止することもない。

入力と連打防止のロックは画面内だけに保持する。再読込ではAPIサンプルを再取得し、以前の入力を復元したとは扱わない。画面離脱・プレビュー終了後の遅延応答で遷移や後続PATCHを起こさない。

## 種目マスターと他画面

種目マスターはフロント所有の [JSONファイル](../frontend/src/features/exercises/serverCatalogData.json)。16種目・6部位・5器具・15おすすめ対応、種目名検索、部位・器具のAND絞り込みを維持する。APIの固定`exercise-1`に合わせてマスターのUUIDを置き換えない。詳細は [種目マスター](exercise-master.md) を参照。

結果画面は [PR #27](https://github.com/jphacks/tkb_2605/pull/27) のUIを参照したGET接続版。[PR #30](https://github.com/jphacks/tkb_2605/pull/30) の投稿画面本体は未統合。認証ガードとDEV限定プレビュー、ホームの投稿取得・ページング・3タブを維持する。

## 検証

`frontend`で`npm test`・`npm run lint`・`npm run build`。バックエンドの現行URL・固定応答は`python manage.py test core.tests.test_note_urls`で検証する。実APIへの接続確認をDB保存の確認とは扱わない。
