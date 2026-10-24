# Workout App（JPHACK 筋トレWebアプリ）

| | |
|---|---|
| frontend | React + TypeScript + Vite、Tailwind CSS、React Router、Recharts |
| backend | Django + Django REST Framework |
| DB | SQLite（DBコンテナなし） |
| 本番 | 自宅Proxmoxの専用VM（512MB）、Nginx + Gunicorn、Cloudflare Tunnel |

## 開発環境

必要なもの：Git と Docker Desktop（Windows は WSL2 バックエンド）。Node や Python をPCに入れる必要はない。

```bash
git clone https://github.com/jphacks/tkb_2605.git
cd tkb_2605
docker compose up --build
```

- http://localhost:5173 を開くとホーム画面が表示される。接続状態は http://localhost:5173/status で確認でき、「Backend Connected」「Database Ready」が出れば成功。
- 初回はイメージのビルドとnpmのインストールで数分かかる。DBのmigrateは起動時に自動で走る。
- React（`frontend/src`）とDjango（`backend/`）のコードは保存すると自動で反映される。

| やりたいこと | コマンド |
|---|---|
| 起動（バックグラウンド） | `docker compose up -d` |
| 停止 | `docker compose down` |
| ログを見る | `docker compose logs -f backend`（または `frontend`） |
| 依存を変えた後の再ビルド | `docker compose up --build` |
| npmパッケージ追加 | `docker compose exec frontend npm install <pkg>`（`package.json` と `package-lock.json` をコミット） |
| Pythonパッケージ追加 | `backend/requirements.txt` にバージョン固定で追記 → `docker compose up --build` |
| migrationを作る | `docker compose exec backend python manage.py makemigrations` |
| 管理ユーザー作成 | `docker compose exec backend python manage.py createsuperuser`（http://localhost:8000/admin/） |
| テスト | `docker compose exec backend python manage.py test` |
| **DBを空にする** | `docker compose down -v` ⚠ SQLiteのデータが全部消える（node_modulesも消えるので次回起動は遅い） |

DBは `sqlite-data` というDockerのボリュームに保存されるので、`docker compose down` や再起動では消えない。消えるのは `-v` を付けた時だけ。

### ホーム画面

ユーザアイコンを頭、2つのトレーニングボタンを胸元に配置し、首・肩のラインの下にタイムラインを表示する。PCはサイドメニュー、スマートフォンは画面下部のナビゲーションを使用する。

| URL | 画面・操作 |
|---|---|
| `/` | フォロー中／フォロワーの投稿、画像、いいね、通知への導線 |
| `/training` | 部位別の種目選択、メニューの確定 |
| `/training/recommended` | おすすめメニューの選択、確定 |
| `/compose` | 投稿作成（500文字、画像1枚・2MBまで） |
| `/posts/:postId` | 投稿詳細、返信 |
| `/profile/:userId` | プロフィール、投稿一覧、フォロー切り替え |
| `/settings` | 自分の表示名・自己紹介の編集 |
| `/notifications` | 通知一覧、一括既読 |
| `/status` | 開発環境のAPI・DB接続確認 |

現段階のソーシャル機能はフロントエンドのデモ実装。初期の投稿・通知・ユーザーはサンプルで、自分のユーザーIDは `me`。投稿・返信・いいね・フォロー・プロフィール変更・通知の既読状態はブラウザの `localStorage`（キー `workout.social.v1`）へ保存する。別の端末やユーザーとの共有、認証、投稿API、通知のリアルタイム配信は未接続。保存できない場合は画面に警告を表示し、そのタブ内では操作を継続できる。トレーニング画面は選択・メニュー確定までで、実施中の計測・記録は含まない。

主な動作確認：ホームの各ボタンから遷移 → 投稿・返信 → リロード後の保存確認 → ユーザアイコンからプロフィール → 表示名の編集 → 通知の既読。静的チェックは `docker compose exec -T frontend npm run lint` と `docker compose exec -T frontend npm run build`。`docker compose exec -T frontend npm run test:social` で保存・復元、入力検証、フォローの整合性、保存失敗からの復旧を含む6件の自動テストを実行できる。

### よくあるエラー

- **保存しても画面が変わらない（Windows）**：`.env` を作って `CHOKIDAR_USEPOLLING=true` を書き、`docker compose up` し直す。Djangoが反映されない場合はリポジトリをWSLのファイルシステム（`\\wsl$\...`）側に置く。
- **port is already allocated**：5173か8000を他のアプリが使っている。そのアプリを止めるか、`compose.yaml` の左側のポート番号を変える。
- **「Backend Unreachable」**：`docker compose logs backend` を見る。たいていは Python の構文エラーかmigrationの失敗。
- **`npm ci` で失敗する**：`package-lock.json` が `package.json` と合っていない。`docker compose exec frontend npm install` で作り直してコミットする。

## 開発の流れ（GitHub Flow）

1. `main` から `feature/<内容>` ブランチを切る（`main` へ直接pushはできない）
2. コミットしてPull Requestを作る。GitHub Actions の CI が走る
   - `frontend`：`npm ci`・lint・build
   - `backend`：`manage.py check`・migration漏れの検出（`makemigrations --check`）・migrate・test
   - `compose`：開発用 `docker compose up --build` が起動し、Vite経由で `/api/health/` が返る
   - `prod`：本番用イメージをビルドし、nginx経由でSPAと `/api/health/` が返る
3. CIが全部緑になり、レビューで1人以上のApproveを得たら **Squash merge**（マージ後ブランチは自動で消える）
4. `main` のCIが通ると、本番用イメージがGHCRにpushされる（`ghcr.io/jphacks/tkb_2605-{web,backend}:<commit SHA>`）
5. 本番VMが5分ごとに `main` を確認し、新しいイメージがあれば自動でデプロイする（バックアップ→migrate→起動→health確認。失敗したら前の版に戻す）

依存パッケージの更新はDependabotが毎週月曜にまとめてPRを作る（メジャーアップデートは来ないので、必要なら自分でブランチを切る）。
`.github/`・`ops/`・`compose.prod.yaml`・`frontend/nginx.conf` を変えるPRは本番に直結するため、オーナーがレビューする（CODEOWNERS）。

## 本番運用

構成：`cloudflared` → `web`（nginx。Reactのビルド済みファイルを配信し、`/api/`・`/admin/`・`/static/` を backend へ）→ `backend`（Gunicorn 1 worker）→ `/srv/workout/data/db.sqlite3`。
VMはメモリ512MBなので**VM上ではビルドしない**。イメージはGitHub Actionsで作り、VMはpullするだけ。

VMへの入り方：Tailscaleで共有を受けて `ssh <自分のユーザー名>@jphack-workout`（オーナーから招待リンクをもらう）。

| やりたいこと | コマンド（VM上、`/srv/workout/app` で） |
|---|---|
| 状態・health・メモリ確認 | `ops/status.sh` |
| ログ | `ops/logs.sh backend --since 10m` |
| 再起動 | `ops/restart.sh`（特定のサービスだけなら `ops/restart.sh backend`） |
| デプロイ | 通常は不要（mainへのマージ後5分以内に自動）。手動なら `ops/deploy.sh <mainのcommit SHA>`（git pull→イメージpull→バックアップ→migrate→起動→health確認） |
| 自動デプロイの様子 | `journalctl -u workout-auto-deploy -n 50` |
| 自動デプロイを止める・再開 | `sudo touch /srv/workout/auto-deploy.disabled` ／ `sudo rm /srv/workout/auto-deploy.disabled` |
| 前の版に戻す | `ops/deploy.sh <前のSHA>`（自動デプロイは次にmainが進むまでこの版のまま）。migrationでDBが変わっていたら、続けて `ops/restore.sh <pre-deployのバックアップ>` |
| 手動バックアップ | `ops/backup.sh` |
| バックアップから戻す | `ops/restore.sh /srv/workout/backup/db-....sqlite3.gz` |

- `deploy.sh`・`backup.sh`・`restore.sh` は内部で `sudo` する（DBファイルと `.env` がroot・コンテナ所有のため）。
- 本番の秘密情報は `/srv/workout/.env`（`.env.example` の production 節）。Gitには入れない。
- 自動デプロイ（`ops/auto-deploy.sh`、`ops/systemd/workout-auto-deploy.timer`）は、VMが外から接続を受けない構成のため、GitHubから押し込むのではなくVMが取りに行く。失敗した版は自動で前の版に戻し、同じ版を再試行しない。`.env` の `DEPLOY_NOTIFY_URL` にDiscordのWebhook URLを入れると結果が通知される。
- バックアップは1時間ごと（`ops/systemd/workout-backup.timer`）、VM内に14世代。R2への暗号化コピーは `R2_REMOTE` を設定すると有効になる。
- migrationで列を消す・名前を変える変更は、2回のリリースに分ける（先にコードを旧列に依存しない形にしてから消す）。

### 障害時

| 症状 | まずやること |
|---|---|
| サイトが500・応答なし | `ops/status.sh` → `ops/logs.sh backend` → `ops/restart.sh` |
| 直前のデプロイから壊れた | `ops/deploy.sh <前のSHA>`、またはmainでrevertのPRをマージ（自動で再デプロイされる） |
| データがおかしい | `ops/restore.sh <直近のバックアップ>` |
| Dockerが動いていない | `sudo systemctl restart docker` |
| VMにSSHできない・自宅ごと落ちた | オーナーに連絡。急ぐ場合は下の「自宅外への移行」 |

### 自宅外への移行

自宅のVMに届かない時、Dockerが動く任意のマシンで同じURLのまま立ち上げられる（Cloudflare Tunnelは同じトークンならどこで動かしても同じホスト名につながる）。

1. **自宅のVMが動いている可能性があるなら、先にオーナーにTunnelトークンを再発行してもらう**（2か所で同時に動くとアクセスが振り分けられ、DBが2つに分かれる）
2. このリポジトリをclone、チームの保管庫から `.env` を取り出して置き、`DATA_DIR`・`BACKUP_DIR` を手元のパスにする
3. R2から最新の `*.sqlite3.gz.age` を取り、`age -d -i ~/.ssh/id_ed25519 <file> | gunzip > <DATA_DIR>/db.sqlite3`
4. `docker login ghcr.io` → `docker compose -f compose.prod.yaml --env-file .env up -d`
5. `https://<PUBLIC_HOST>/api/health/` が `{"status":"ok","database":"ok"}` を返すことを確認
6. 自宅が戻ったら、オーナーと相談するまで自宅側は起動しない（移行先のDBを自宅へ戻してから切り替える）
