# 記録画面

[Issue #22](https://github.com/jphacks/tkb_2605/issues/22) の入力UIを、[Issue #31](https://github.com/jphacks/tkb_2605/issues/31) の記録APIへ接続しています。中央の種目名、重量・回数のセット行、追加・削除、別の種目／終了の配置を維持します。

- 未保存の種目は重量0 kg・回数空欄の1セットから開始します。2セット目以降は削除できます。重量は0以上・小数第1位まで、回数は1以上の整数です。
- `/workouts/:workoutId/exercises/:exerciseId?workoutExerciseId=...&from=...` からGETで種目を特定します。マスターの `exercise_id` と、追加された種目の `workout_exercise_id` は別IDです。
- 入力はメモリだけに保持し、「別の種目」「終了」で全セットをまとめてPOSTします。重量は `"0.0"`・`"42.5"` のようなdecimal文字列で送信します。
- 保存成功後はサーバーのID付きセットで表示を置き換え、読み取り専用にします。保存済みセットの編集・削除は対象外です。
- 「別の種目」は保存後に同じ `workoutId` の種目選択へ戻ります。`from=recommendations` の場合はおすすめへ戻ります。
- 「終了」は全セット保存後に `is_completed: true` をPATCHします。終了成功後に結果画面へ遷移し、結果はGETで取得します。PATCHだけが失敗してもセットを再POSTしません。
- 送信結果が不明な場合は操作を停止し、「保存状態を確認」からGETで照合します。連打・不明なPOSTの自動再送を防ぎます。確定済み応答を得るまで保存成功として遷移しません。
- 再読み込みではサーバーに保存済みの内容を復元します。未送信入力は復元しません。旧 `workout.draft.v1:` の下書きは読み込み・移行・削除・自動送信せず、そのまま残します。

進行中IDはユーザー別のlocalStorage、送信中操作の印はsessionStorageに保持します。現在ユーザー取得APIがないため、ホームの直接再読み込みからの自動再開には制約があります。詳細は [API・データ仕様との対応](../docs/api-compatibility.md) を参照してください。

main `8a7523c` には記録API・種目DBモデル・seedがありません。フロントの契約検証と実稼働確認は別であり、実バックエンドへの保存・認証連携は未検証です。種目IDは [フロントのマスター](src/features/exercises/serverCatalogData.json) とDBを一致させる必要があります。

検証コマンド（`frontend` 内）: `npm test`、`npm run lint`、`npm run build`。
