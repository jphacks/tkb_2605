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

DBにもこのファイルと同じID・名称・関連の登録が必要です。現時点では種目DBモデル・seedは未実装であり、このJSONを作成しただけではDBに登録されません。記録APIの稼働前に同じマスターを登録し、既存IDを別の種目へ割り当てないようにします。
