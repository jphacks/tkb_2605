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

- http://localhost:5173 を開き、ログイン画面の「画面をプレビュー」からホームへ進む。API・DB接続は http://localhost:5173/api/health/ が `{"status":"ok","database":"ok"}` を返すことを確認する。
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

今回はホーム画面のみを実装する。ユーザアイコンを頭に、2つのトレーニングボタンを胸元に配置し、首・肩のラインの下にタイムラインを表示する。胸元の囲いはボタンの枠だけにし、顔のアイコンは56〜80pxで表示する。上部は180〜224pxの高さを確保してボタンの見切れを防ぎ、通常の縦持ちでは下部ナビゲーションを除いた表示領域の約2/3をTLに割り当てる。高さの低い画面ではスクロールして表示する。幅760px以下は下部ナビゲーション、それより広い画面はスクロール可能なサイドメニューを使用する。

| URL | 画面・操作 |
|---|---|
| `/` | 投稿一覧API、追加読み込み、いいねトグル、各画面への導線、DEV限定サンプル表示 |

ホームのPRはホーム画面と導線のみを対象にする。種目・おすすめ・チャットは既存の `paths.exercises`・`paths.recommendations`・`paths.chats` へ接続する。投稿作成・投稿詳細／返信・プロフィール・設定・通知にもURLで遷移でき、画面本体が未実装の場合は準備中ページを表示する。プロフィールの具体的なルートは Issue #20 の別PRが提供する。既存のログインガードは維持する。

通常のタイムラインは Issue #10 の `GET /api/posts/?limit=20&offset=0` を使用し、`next_offset` で追加取得する。いいねはボディなしの `PUT /api/posts/{post_id}/like` でトグルし、応答の `like_count` と `is_liked` を表示する。通信失敗時はエラーを表示し、いいねの状態が不明な場合は再読み込みを案内する。認証・CSRFの詳細はAPI側との接続時に確認が必要。

画像・フォロー関係・通知のAPIは未定義のため、開発環境ではサンプル表示から開始する。フォロー中・フォロワー・通知タブを切り替えて確認でき、「投稿API表示」で実際のAPI取得に切り替わる。サンプルのいいねは画面内のみで、実APIへ送らない。自分のプロフィール表示は認証API接続まで表示例を使用する。投稿作成画面などの本体はこのPRに含まない。

投稿APIの契約テスト: `docker compose exec -T frontend node --experimental-strip-types --test tests/posts-api.test.ts`。

主な動作確認：フォロー中／フォロワーの切り替え → いいねの表示切り替え → 既存ルートへの遷移と未実装画面の準備中表示 → PC／スマートフォンでTLの表示比率と胸元のボタンの収まりを確認。静的チェックは `docker compose exec -T frontend npm run lint` と `docker compose exec -T frontend npm run build`。

### よくあるエラー

- **保存しても画面が変わらない（Windows）**：`.env` を作って `CHOKIDAR_USEPOLLING=true` を書き、`docker compose up` し直す。Djangoが反映されない場合はリポジトリをWSLのファイルシステム（`\\wsl$\...`）側に置く。
- **port is already allocated**：5173か8000を他のアプリが使っている。そのアプリを止めるか、`compose.yaml` の左側のポート番号を変える。
- **「Backend Unreachable」**：`docker compose logs backend` を見る。たいていは Python の構文エラーかmigrationの失敗。
- **`npm ci` で失敗する**：`package-lock.json` が `package.json` と合っていない。`docker compose exec frontend npm install` で作り直してコミットする。

## フロントエンドのルーティング

URLは `frontend/src/routes.ts`、画面の割り当ては `frontend/src/App.tsx` で管理する。

| 画面 | URL |
|---|---|
| ログイン | `/login` |
| ホーム・タイムライン | `/` |
| チャット一覧 | `/chats` |
| 初心者向けおすすめ | `/recommendations` |
| 種目選択 | `/exercises` |
| 種目ごとの記録 | `/workouts/:workoutId/exercises/:exerciseId` |
| 結果 | `/workouts/:workoutId/results` |

ログイン以外の上記画面は共通のガードを通す。認証APIは未実装のため、現在は開発環境の「画面をプレビュー」からのみ確認できる。本番ビルドにはプレビュー入口を表示せず、保護されたURLは `/login` に戻す。プレビュー状態はメモリ内のみで、再読み込みすると解除される。直接開いたURLのパス・検索条件・ハッシュはログイン画面を経由して引き継ぐ。

各画面はひな形であり、ログイン・グループ権限確認・記録の保存・共有は今後実装する。認証連携時にはガードを実際のセッションに接続し、バックエンドの各APIでもグループへのアクセス権を確認する。記録画面へ進む仮リンクでは `preview` をIDに使っており、API連携時に実際のIDへ置き換える。「別の種目を選ぶ」では `workoutId` を検索パラメータで引き継ぎ、同じトレーニングを継続する。チャット詳細は今回の対象外。

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
