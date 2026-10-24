# API・データ仕様との対応

ホーム・種目選択・おすすめ・記録・結果を統合し、[Issue #31](https://github.com/jphacks/tkb_2605/issues/31) の記録APIへ接続するフロント側の実装。2026-10-24時点で確認した [main `8a7523c`](https://github.com/jphacks/tkb_2605/tree/8a7523ce13ad38433c4504801bc9f8c3ab4a301a) には記録API・種目DBモデル・seedがなく、認証・現在ユーザー取得APIも未実装。記録APIの正常系・異常系は模擬応答で検証し、実バックエンドでの保存・再開は未検証である。

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

## 記録API

Issue #31 の末尾スラッシュ付きURLとJSON形式を使用する。

| 操作 | メソッド・URL | 本文 | 成功コード |
|---|---|---|---|
| 開始 | `POST /api/note/workouts/` | `{}` | 201 |
| 種目追加 | `POST /api/note/workouts/{workout_id}/exercises/` | `{ "exercise_id": "マスターのID" }` | 201 |
| 全セット保存 | `POST /api/note/workout-exercises/{workout_exercise_id}/sets/` | `{ "sets": [...] }` | 201 |
| 全記録取得 | `GET /api/note/workouts/{workout_id}/` | なし | 200 |
| 終了 | `PATCH /api/note/workouts/{workout_id}/` | `{ "is_completed": true }` | 200 |

`user_id` は整数、それ以外のIDは文字列。`workout_id`・`workout_exercise_id`・`workout_set_id` はサーバーの応答を使用する。開始日時と種目の `position` もサーバーが決める。重量は0以上・小数第1位までのdecimal文字列（例 `"42.5"`）、回数と `set_number` は1以上の整数とする。書き込みでは同一オリジンCookieと、存在する場合のDjango CSRF Cookieを使用する。

1. ホームの「トレーニング開始」で開始APIを呼ぶ。おすすめは閲覧時には開始せず、種目選択時に必要なトレーニングを開始する。種目選択画面を直接開いた場合も同じ扱いとする。
2. マスターの種目を追加し、返された `workout_exercise_id` を使って記録する。記録URLの `workoutExerciseId` クエリで、同じ種目を複数回追加した場合も区別する。`from=exercises` / `from=recommendations` は戻り先を保持する。
3. 入力中のセットはメモリに保持する。「別の種目」「終了」で、その種目の全セットを1回のPOSTにまとめる。保存応答のID付きセットで表示を置き換え、保存済みの入力は読み取り専用にする。編集・削除APIは実装しない。
4. 「別の種目」は保存成功後、同じ `workoutId` の選択画面へ戻る。「終了」は全セット保存成功後にPATCHし、終了成功後に結果画面へ進む。保存成功後にPATCHだけが失敗した場合は、セットを再送しない。
5. 記録・結果画面はGETで保存済みデータを復元する。種目は `position`、セットは `set_number` の順序で扱う。未送信の入力は再読み込み後に復元しない。

## 保持する状態と送信結果の確認

進行中IDは検証済み応答の整数ユーザーIDを使い、`localStorage` の `workout.active.v1:<user_id>` に保存する。完了時は該当IDだけを削除する。画面プレビューの仮ユーザーを利用せず、別ユーザーの保存キーを列挙して再開先を選ばない。

現在ユーザー取得APIがないため、ユーザーIDをまだ知らない状態でホームを直接再読み込みした場合、保存済みIDからの自動再開はできない。`workoutId` のある選択・記録・結果URLからはGETで復元できる。実際の所有権確認はバックエンドが担い、ブラウザ内のIDは認証の代わりにならない。

送信中の操作印は `sessionStorage` の `workout.operation.v1:` 配下に保持する。通信断や不正応答などでPOST結果が不明になった場合は自動再送せず、追加・セット保存はGETで保存状態を照合する。GETで未保存に見えてもPOSTが失敗したと断定して再送しない。開始POSTの応答を失ってIDが不明な場合は、進行中検索APIがないため画面からの復元を停止する。終了PATCHはGETで未完了を確認後、PATCHだけを再試行できる。

旧 `workout.draft.v1:` の値は保存先に残すが、新しい記録フローでは読み込まず、移行・削除・自動送信もしない。操作印は未送信入力の自動保存ではない。

## 種目マスターと他画面

種目マスターはフロント所有の [JSONファイル](../frontend/src/features/exercises/serverCatalogData.json)。16種目・6部位・5器具・15おすすめ対応を持ち、独立した取得APIは設けない。名称検索と部位・器具の単一選択AND絞り込みをフロントで行う。おすすめは明示的なキー→種目UUID対応を使い、サンプルslugや名前一致から送信用IDを生成しない。DBにも同じ固定IDの登録が必要だが、モデル・seedはまだ未実装。変更手順は [種目マスター](exercise-master.md) を参照。

結果画面は [PR #27](https://github.com/jphacks/tkb_2605/pull/27) の「今日のメニュー」一覧・共有/閉じるのUIを参照し、Issue #31 のGET形式に接続した。共有は完了済み記録の `/compose?workoutId=...` への導線までで、[PR #30](https://github.com/jphacks/tkb_2605/pull/30) の投稿画面本体は未統合。投稿先は既存の準備中画面である。

認証ガードとDEV限定プレビューを維持する。認証・現在ユーザー・フォロー・通知・画像・返信のHTTP契約は引き続き未定義。記録APIの実稼働確認には、バックエンド5操作の実装、同じ種目マスターの登録、認証連携が必要。

## 検証

`frontend` で `npm test`・`npm run lint`・`npm run build` を実行する。Dockerでは `docker compose exec -T frontend npm test` 等を使用する。契約テスト・ブラウザの模擬応答で検証した動作を、実バックエンドへの保存成功とは扱わない。
