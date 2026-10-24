# API・データ仕様との対応

2026-10-24時点の [main `8a7523c`](https://github.com/jphacks/tkb_2605/tree/8a7523ce13ad38433c4504801bc9f8c3ab4a301a) と全12件のIssue本文・コメントを照合した記録。対象はホーム・種目選択・おすすめ・記録の4画面で、各PRは独立しているため、単独ブランチでは他画面がひな形の場合がある。

照合したIssue：[#3](https://github.com/jphacks/tkb_2605/issues/3)、[#5](https://github.com/jphacks/tkb_2605/issues/5)、[#6](https://github.com/jphacks/tkb_2605/issues/6)、[#7](https://github.com/jphacks/tkb_2605/issues/7)、[#10](https://github.com/jphacks/tkb_2605/issues/10)、[#14](https://github.com/jphacks/tkb_2605/issues/14)、[#18](https://github.com/jphacks/tkb_2605/issues/18)、[#19](https://github.com/jphacks/tkb_2605/issues/19)、[#20](https://github.com/jphacks/tkb_2605/issues/20)、[#21](https://github.com/jphacks/tkb_2605/issues/21)、[#22](https://github.com/jphacks/tkb_2605/issues/22)、[#23](https://github.com/jphacks/tkb_2605/issues/23)。

## 定義済みの投稿API

[Issue #10](https://github.com/jphacks/tkb_2605/issues/10) と [mainのURL定義](https://github.com/jphacks/tkb_2605/blob/8a7523ce13ad38433c4504801bc9f8c3ab4a301a/backend/posts/urls.py)・[実装](https://github.com/jphacks/tkb_2605/blob/8a7523ce13ad38433c4504801bc9f8c3ab4a301a/backend/posts/views.py)には次の相違がある。

| 操作 | mainのURL | Issueの成功コード | mainの成功コード |
|---|---|---|---|
| POST 投稿作成 | `/api/posts/` | 200 | 201 |
| GET 投稿一覧 | `/api/posts/` | 201 | 200 |
| GET ユーザー別投稿 | `/api/users/{user_id}/posts/` | 201 | 200 |
| PUT いいね | `/api/posts/{post_id}/like/` | 200 | 200 |

ホームの投稿クライアントは2xxを受け付け、JSONの形・投稿型・対象投稿IDを検証する。いいねは末尾スラッシュ付きURLへのボディなしPUT。ユーザー別投稿URLはIssueでは末尾スラッシュなしだが、mainはスラッシュありであり、今回のホームからは呼ばない。`limit` は1〜100、`offset` は0以上、履歴終端は `next_offset: null` とする。書き込みでは既存の同一オリジンCookieと、取得できる場合のDjango標準 `csrftoken` / `X-CSRFToken` を使用する。

ホームは開発環境でも常に投稿APIを取得し、フロントのサンプル投稿・通知と表示モード切り替えは使用しない。初回は `limit=20&offset=0`、追加取得は `limit=20` と応答の `next_offset` を使い、offsetをフロントで加算しない。空のページでも `next_offset` があれば次へ進め、`null` のときだけ終端とする。失敗時は取得済み投稿とoffsetを保持し、同じ位置で再試行する。投稿は `post_id` でページ内・ページ間の重複を除去し、既存投稿のいいね状態を維持する。

mainは固定のサンプル応答を返すスタブで、投稿の永続化・いいねの実トグルは未実装。POSTは入力によらず `post_type: 1` を返すため、タイプ2・3の作成応答はフロントの型一致検証で拒否する。PUTも固定の投稿ID・件数・状態を返す。接続確認の成功を、保存やトグルの完成とは扱わない。

## HTTP契約が未定義の範囲

種目・部位・器具・おすすめの取得、ワークアウト作成・保存・取得、認証、ユーザー情報、フォロー、通知、画像、返信のHTTP契約は未定義。[Issue #14](https://github.com/jphacks/tkb_2605/issues/14)はテーブル仕様であり、送信先URLやJSON形式ではない。[Issue #10のコメント](https://github.com/jphacks/tkb_2605/issues/10#issuecomment-6380407998)にも最新ワークアウト・記録取得APIの予定はあるが、HTTP契約はない。推測したAPIは追加しない。

認証ガードとDEV限定プレビューを維持する。ローカルUUIDは下書きを区別するためのIDで、サーバーが作成した `workout_id` ではない。サンプルの種目IDや仮のユーザーIDを、保存済みの実データとして送信・共有しない。

## 種目・おすすめ・記録の対応

- 共通catalogの `exercise_id`・`display_name`・複数の `body_parts` はローカル表示モデル。サンプルの名称・ID・関連であり、確定したマスターやHTTP応答形式ではない。検索は種目名だけを対象にする。[Issue #21](https://github.com/jphacks/tkb_2605/issues/21)で実装待ちとされる部位・器具フィルターは無効のまま維持する。
- 記録への遷移は既存URLを使い、`from=exercises` / `from=recommendations` で戻り先を保持する。従来の画面遷移stateにも対応し、「別の種目」では同じ `workoutId` を引き継ぐ。
- 記録は端末内の下書きのみ。v2では `performed_at` を初回の保存成功時に設定して以後維持し、`updated_at` は保存ごとに更新する。種目の `position` と種目内の `set_number` は別々に1から付ける。重量は0以上・小数第1位まで、回数は1以上の整数とする。
- 既存キー `workout.draft.v1:<エンコード済みworkoutId>` を維持し、値の `version` でv1/v2を判定する。v1読込時は配列順から `position` を付け、唯一残る日時 `updated_at` を `performed_at` の移行用推定値にする。元の開始時刻を復元したものではない。読込だけでは書き換えず、次の保存成功時にv2へ更新する。破損データは上書きしない。

結果画面（[Issue #18](https://github.com/jphacks/tkb_2605/issues/18)・[PR #27](https://github.com/jphacks/tkb_2605/pull/27)）、投稿画面（[Issue #19](https://github.com/jphacks/tkb_2605/issues/19)・[PR #30](https://github.com/jphacks/tkb_2605/pull/30)）、プロフィール（[Issue #20](https://github.com/jphacks/tkb_2605/issues/20)）は別PRの範囲。未マージの実装・仮のデータ形式を正式契約として取り込まず、既存の遷移先を維持する。
