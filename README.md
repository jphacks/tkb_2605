# Workout App（JPHACK 筋トレWebアプリ）

| | |
|---|---|
| frontend | React + TypeScript + Vite、Tailwind CSS、React Router、Recharts |
| backend | Django + Django REST Framework |
| DB | SQLite（DBコンテナなし） |
| 本番 | 自宅Proxmoxの専用VM（512MB）、Nginx + Gunicorn、Cloudflare Tunnel |

## 開発環境

ホーム・種目選択・おすすめ・記録・結果のAPI接続と未実装範囲は [API・データ仕様との対応](docs/api-compatibility.md)、フロント所有の種目データは [種目マスター](docs/exercise-master.md) を参照。

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
| 種目マスター投入・更新 | `docker compose exec -T backend python manage.py seed_exercises - < frontend/src/features/exercises/serverCatalogData.json` |
| 管理ユーザー作成 | `docker compose exec backend python manage.py createsuperuser`（http://localhost:8000/admin/） |
| テスト | `docker compose exec backend python manage.py test` |
| **DBを空にする** | `docker compose down -v` ⚠ SQLiteのデータが全部消える（node_modulesも消えるので次回起動は遅い） |

DBは `sqlite-data` というDockerのボリュームに保存されるので、`docker compose down` や再起動では消えない。消えるのは `-v` を付けた時だけ。

### 画面とAPI接続

ホームはユーザアイコンを頭に、2つのトレーニングボタンを胸元に配置し、首・肩のラインの下にタイムラインを表示する。胸元の囲いはボタンの枠だけにし、顔のアイコンは56〜80pxで表示する。上部は180〜224pxの高さを確保してボタンの見切れを防ぎ、通常の縦持ちでは表示領域の約2/3をTLに割り当てる。高さの低い画面ではスクロールして表示する。スマートフォンの下部メニューバーは表示せず、投稿用の＋ボタンを画面右下に配置する。幅760pxを超える画面ではスクロール可能なサイドメニューを使用する。

| URL | 画面・操作 |
|---|---|
| `/` | 投稿一覧APIの常時取得、追加読み込み、いいね、トレーニング開始 |
| `/exercises` | マスターの種目名検索・部位/器具絞り込み、種目追加API |
| `/recommendations` | 5メニュー・各3候補から選択し、同じ種目追加APIへ接続 |
| `/workouts/:workoutId/exercises/:exerciseId` | 保存済みセット表示、全セット保存、別の種目／終了 |
| `/workouts/:workoutId/results` | DBの記録による「今日のメニュー」、閉じる（共有は未実装） |

記録フローは [Issue #31](https://github.com/jphacks/tkb_2605/issues/31) の5操作をDBへ接続する。URLは `/api/workouts/`・`/api/workout-exercises/` 配下で、`/note/` は付かない。開始・種目追加・セット保存・取得・終了を永続化し、所有者を確認する。Djangoセッション認証と書き込み時のCSRFが必須で、プレビューだけでは利用できない。開発確認はmigration適用後、上記コマンドで種目を投入し、同一ホストの`/admin/`でログインする。専用ログインAPI・フロント認証統合は未実装。seedは初回・マスター変更時に手動実行する。種目マスターはフロントのJSONを維持し、名称検索と部位/器具のAND絞り込みをローカルで行う。独立したマスター取得APIは設けない。

通知画面は `/notifications` で一覧の自動取得・新着表示・全員への筋トレ通知送信に対応する（[通知APIの接続](docs/notifications.md)）。Webプッシュ通知のフロントも実装済みで、端末の許可・登録・解除・バックグラウンド受信に対応する。購読APIと配送はバックエンド側の接続が必要（[Web Pushの接続契約](docs/web-push.md)）。投稿作成・投稿詳細／返信・プロフィール・設定には既存URLで遷移し、未実装画面は準備中表示を維持する。結果画面はPR #27のUIを参照したGET接続版を採用する。「共有」はPR #30の投稿ダイアログを開き、記録IDと取得済みメニューを渡す。添付内容にもサンプルである旨を表示し、閉じると結果画面に戻る。投稿APIは固定応答のため、記録付き投稿の作成成功はバックエンド対応後に確認する。既存のログインガードは維持する。

タイムラインは開発環境でも常に Issue #10 の投稿APIから取得し、初回は `GET /api/posts/?limit=20&offset=0` を呼ぶ。「もっと見る」では `limit=20` を維持し、応答の `next_offset` をそのまま次の `offset` に使う。`next_offset: null` が履歴の終端であり、取得結果が空でも次のoffsetがあれば追加取得できる。取得に失敗した場合は表示済みの投稿とoffsetを維持し、同じ位置から再試行する。重複した `post_id` は同じページ内・ページ間ともに除去し、表示済み投稿のいいね状態を保持する。

いいねはボディなしの `PUT /api/posts/{post_id}/like/` でトグルを要求し、応答の `like_count` と `is_liked` を表示する。mainは固定応答のため、永続化・実トグルの確認はバックエンド実装後に行う。通信失敗時はエラーを表示し、いいねの状態が不明な場合は再読み込みを案内する。認証・CSRFの詳細はAPI側との接続時に確認が必要。

「フォロー中・フォロワー・通知」のタブは表示する。フォロー関係のAPIは未定義のため、投稿2タブは分類が準備中であることを明記して同じ投稿一覧APIの結果を表示し、通知タブは [通知API](docs/notifications.md) の一覧を表示する。タブを切り替えても取得済み投稿・次のoffset・いいね状態を保持する。サンプル投稿・通知やサンプル/APIの切り替えは使用しない。自分の頭部アイコンとサイドバーのプロフィールは、認証・ユーザー情報APIの定義まで表示用のプレースホルダーを使用する。

フロントの契約・状態管理・マスターテスト: `docker compose exec -T frontend npm test`。

主な動作確認：投稿の取得・ページング・再試行、ログイン後の開始 → 種目追加 → 全セット保存 → 別の種目／終了 → DB記録取得、通信失敗後の手動再試行、連打・離脱後の遷移防止。記録APIは `docker compose exec -T backend python manage.py test core.tests` で検証する。PC／スマートフォンで各画面の収まりも確認する。静的チェックは `docker compose exec -T frontend npm run lint` と `docker compose exec -T frontend npm run build`。

### よくあるエラー

- **保存しても画面が変わらない（Windows）**：`.env` を作って `CHOKIDAR_USEPOLLING=true` を書き、`docker compose up` し直す。Djangoが反映されない場合はリポジトリをWSLのファイルシステム（`\\wsl$\...`）側に置く。
- **port is already allocated**：5173か8000を他のアプリが使っている。そのアプリを止めるか、`compose.yaml` の左側のポート番号を変える。
- **「Backend Unreachable」**：`docker compose logs backend` を見る。たいていは Python の構文エラーかmigrationの失敗。
- **`dependency failed to start: container ... is unhealthy`**：ビルドではなくバックエンドの起動・ヘルスチェックの失敗。`docker compose logs --tail=100 backend` で原因を確認する。コード更新後に `ImportError` が残っている場合は `docker compose exec backend python manage.py check` を実行し、成功するなら `docker compose restart backend` → `docker compose up -d --wait` で復旧する。チェックが失敗する場合は表示されたコード・設定のエラーを先に直す。`docker compose down -v` はDBを削除するため復旧目的では使わない。
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

記録はAPI応答のIDを使用し、`workoutExerciseId` クエリで応答内の種目を特定する。現在はどの種目を選んでも固定のベンチプレスが返る。「別の種目」では同じ `workoutId` を引き継ぎ、`from` クエリに応じて種目選択・おすすめへ戻る。「終了」はセットPOST後にPATCHし、結果をGETする。PATCHのtrueは保存されないため完了表示に置き換えない。詳細は [記録画面](frontend/RECORD_SCREEN.md) を参照。

固定IDを進行中記録や認証済みユーザーとして保持せず、記録フローではlocalStorage/sessionStorageを使わない。旧 `workout.active.v1:`・`workout.operation.v1:`・`workout.draft.v1:` の値は読み込み・変更・送信しない。入力はメモリだけに保持し、再読込ではAPIサンプルを再取得する。保存・再開、認証連携、投稿・共有の永続化、チャット詳細は未実装である。

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
