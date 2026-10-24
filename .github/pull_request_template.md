## 何を変えたか

<!-- 1〜3行で。関連Issueがあれば「Closes #番号」 -->

## 確認したこと

- [ ] `docker compose up --build` で起動し、画面で動きを確認した
- [ ] モデルを変えた場合、`makemigrations` で作ったmigrationを含めた
- [ ] 列の削除・名前変更を含む場合、2回のリリースに分けた（README「本番運用」）

<!-- mainへSquash mergeすると、CI成功後にイメージがGHCRへpushされ、5分以内に本番（https://kintore.reindeer39.dev）へ自動デプロイされる -->
