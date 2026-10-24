# 記録画面

[Issue #22](https://github.com/jphacks/tkb_2605/issues/22) の入力UIを、更新後の [Issue #31](https://github.com/jphacks/tkb_2605/issues/31) のモックAPIへ接続しています。

- URLは `/api/workouts/`・`/api/workout-exercises/` 配下。旧 `/api/note/` は使用しません。
- 種目追加の応答IDで記録画面に進み、GETで返された固定サンプルを入力欄に表示します。現在は選択した種目に関係なくベンチプレス3セットです。
- 「セット1」等の表記、矢印なしの重量・回数入力、行追加・2行目以降の削除を維持します。新しい行は0 kg・回数空欄です。
- 「別の種目」「終了」で全入力をPOSTします。応答が入力の件数・値と異なっても、仕様どおりの固定サンプルとして受け取ります。
- 「終了」はセットPOSTの応答を確認してからPATCHし、結果画面でGETを呼びます。PATCH失敗後の再試行では、同じ画面内のセットPOSTを繰り返しません。
- PATCHのtrueは保存されず、GETはfalseを返します。完了・保存済みという表示にせず、サンプルである旨を記録・結果画面に明記し、結果の共有は無効にします。
- 通信失敗時はエラーを表示し、自動再送せず、利用者による再試行を可能にします。画面離脱後は遷移や後続PATCHをしません。
- 現在のAPIには保存・再開・認証がないため、固定IDをlocalStorage/sessionStorageへ保持しません。旧キーの値も読み込み・変更しません。入力はメモリのみで、再読込ではAPIサンプルを表示します。

種目マスターは [フロントのJSON](src/features/exercises/serverCatalogData.json) のままです。APIの例示IDに合わせてマスターを変更しません。将来の永続化APIの契約・DBとの同期は、その仕様が定義された時点で接続します。

検証コマンド（`frontend` 内）: `npm test`、`npm run lint`、`npm run build`。
