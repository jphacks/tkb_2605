# API・データ仕様との対応

記録APIはIssue #31のURL・JSON構造を維持し、DB保存とセッション認証に接続している。投稿APIは[PR #60](https://github.com/jphacks/tkb_2605/pull/60)の実装を基準に、いいね通知と投稿詳細を追加した。

## 投稿API（DB接続）

| 操作 | URL | 成功コード |
|---|---|---|
| POST 投稿作成 | /api/posts/ | 201 |
| GET 投稿一覧 | /api/posts/ | 200 |
| GET ユーザー別投稿 | /api/users/{user_id}/posts/ | 200 |
| GET 投稿詳細 | /api/posts/{post_id}/ | 200 |
| PUT いいね追加 | /api/posts/{post_id}/like/ | 200 |

セッション認証と書き込み時のCSRFが必須。投稿IDはDBで採番したUUID文字列をそのまま使う。投稿者・いいね実行者はログインユーザーから決定する。本文は500文字まで。記録付き投稿は本人の記録のみ添付でき、本文は省略できる。

一覧はlimit=1〜100（既定20）、offset=0以上（既定0）。ホームは応答のnext_offsetを次の取得に使い、nullだけを終端とする。プロフィールはユーザー別一覧を取得する。失敗時は取得済み投稿とoffsetを保持し、同じ位置で再試行する。投稿IDで重複を除去する。ホームのマスメイトタブは現在全員の投稿を表示し、関係による絞り込みは未実装。

いいねは本文なしPUTで追加する。再実行は追加済みの状態を返し、取り消し機能はない。フロントは返された件数と状態を表示し、いいね済みボタンを無効にする。初回だけ投稿者宛の通知を同じトランザクションで保存する。詳細・移行手順は[投稿・いいね通知API](like-notifications-api.md)を参照。

Postsのuser_idは既存の文字列カラムを維持する。user_name・like_count・is_likedはAPIで補完し、生のDB行とは区別する。既存の数値でないユーザーIDも安全に扱い、存在しないユーザー名は「不明なユーザー」、通知先が無効な場合はいいねだけを保存する。

通知は[通知仕様](notifications.md)のGETへ接続し、空の差分で既存表示を消さない。ログアウトやアカウント変更で取得済みデータを破棄する。

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
