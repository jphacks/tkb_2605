# 記録画面

[PR #44](https://github.com/jphacks/tkb_2605/pull/44) のDB版APIに接続します。詳細・境界・検証は [DB版記録API](../docs/workout-api.md) を参照してください。

- URLは/api/workouts/・/api/workout-exercises/配下。認証済みの同一オリジンCookieとCSRFを使います。
- 選択したマスター種目を保存し、workout_exercise_idで対象を特定します。GETの保存内容を入力欄へ復元します。
- 重量0〜99999.9kg・小数第1位まで、回数は正整数。追加行は0kg・回数空欄です。
- 「別の種目」「終了」で全セットを保存します。入力と応答が異なる場合は成功扱いにしません。
- セット保存後の終了PATCHだけ失敗した場合はPATCHのみ再試行します。通信結果不明時はGETで確認し、自動再送しません。
- 終了済みの記録は読み取り専用。結果画面で保存済み内容を表示し、終了済みで空でない記録を共有できます。
- 入力は画面内のみ。再読み込み時はDB保存済み内容に戻ります。旧localStorageの下書きは読み込み・変更・送信しません。
- 認証画面の接続は別作業。DEVプレビューだけではDjangoのログインになりません。

検証: npm test、npm run lint、npm run build、独立したSQLiteと検証セッションでの実API往復。
