# 種目マスター

正本はフロントが所有する [serverCatalogData.json](../frontend/src/features/exercises/serverCatalogData.json) です。16種目・6部位・5器具・15おすすめ対応を収録します。独立した取得APIや実行時のID生成は行いません。

| フィールド | 内容 |
|---|---|
| `exercises` | 固定 `exercise_id`、`display_name`、関連する `body_part_ids`・`equipment_ids` |
| `body_parts` | 固定 `body_part_id` と部位名 |
| `equipment` | 固定 `equipment_id` と器具名 |
| `recommendations` | おすすめカードのキー→固定 `exercise_id` の明示的な対応 |

ファイル内のUUIDは一度決めたIDとして保持します。表示名を変えても再生成しません。おすすめキー（例 `bench-press`）は表示構成上の識別子で、APIに送信する種目IDではありません。名前一致によるID変換は行いません。

[serverCatalog.ts](../frontend/src/features/exercises/serverCatalog.ts) がIDの重複、部位・器具の参照、おすすめの参照先を検証し、画面用の構造へ変換します。検証に失敗したデータからは種目を選択できません。検索は種目名のみ、部位と器具は単一選択のAND条件で絞り込みます。器具の条件は「その器具に関連する種目」を表し、その器具だけで実施できるという意味ではありません。

変更時は既存IDを維持し、関連・おすすめ対応を更新して `cd frontend` → `npm test` を実行してください。おすすめ理由・コメントと画像の仮枠は画面側にあります。おすすめキーを追加する場合は画面のメニュー構成と検証対象も合わせて更新します。

記録APIはDBの種目マスターを参照します。存在しない種目IDの追加は404になります。モックの例示IDに合わせてJSONのIDを書き換えたり、既存IDを別の種目へ割り当てたりしないでください。

## DBへの初期投入・更新

リポジトリのルートで実行します。

```bash
docker compose exec -T backend python manage.py migrate
docker compose exec -T backend python manage.py seed_exercises - < frontend/src/features/exercises/serverCatalogData.json
```

[seed_exercises](../backend/note/management/commands/seed_exercises.py)は、種目・部位・器具をUUIDで登録・更新し、対象種目の部位・器具との関連をJSONに一致させます。何度実行しても重複せず、既存の記録・セットやJSONにないマスターは削除しません。名称変更は同じUUIDの行へ反映するため、その種目を参照する過去の記録にも新しい名称が表示されます。

JSONの形式・UUID・IDや部位/器具名の重複・参照先・名称の長さを検証し、不正なデータはエラーにします。DB更新は1トランザクションで行い、別UUIDで同じ部位/器具名が登録済みなどの競合時は全件ロールバックします。既存IDを名前一致で付け替えることはありません。おすすめの対応も検証しますが、DBには保存せずフロントで保持します。

正本JSONを複製せず、標準入力でコンテナへ渡します。コンテナ内のファイルを使う場合は`python manage.py seed_exercises /path/to/catalog.json`も使用できます。本番も同じJSONを`docker compose -f compose.prod.yaml exec -T backend python manage.py seed_exercises -`の標準入力へ渡します。起動時の自動実行は行わないため、初回・マスター変更時に明示的に実行してください。
