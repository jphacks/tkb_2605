# いいね通知と投稿API

既存のPosts・Like・Notificationを使い、セッション認証で投稿者と操作ユーザーを決定します。通知先をクライアントから指定するAPIはありません。

- GET/POST /api/posts/：一覧と作成。post_typeは1（通常）、2（記録付き）、3（開始）。1/2は本文必須、最大2000文字。2のworkout_idは自分の記録のみ。user_idの入力に依存しません。
- GET /api/users/{user_id}/posts/：本人の投稿だけ。一覧はlimit 1〜100、offset 0以上、resultsとnext_offsetを返します。
- GET /api/posts/{post_id}/：保存済みの単一投稿。存在しないID・無効な投稿者は404。
- PUT /api/posts/{post_id}/like/：既存契約のトグル。post_id・like_count・is_likedを返します。書き込みはCSRF必須。フロントは自動再送しません。

いいねを追加した時だけ、トランザクション内で投稿者宛て通知を作成します。自分へのいいね・取り消しでは作成せず、同じ人が同じ投稿を再いいねしても通知は1回だけです。別の人のいいねは別通知です。取り消し後も過去の通知は保持し、投稿削除時は通知も消えます。

GET /api/notify/は開始通知と自分宛てのいいね通知を共通カーソルで返します。開始通知の4項目は変更しません。いいね通知はnotification_type: post_liked、post_id（UUID文字列）、post_excerpt（先頭100文字）を追加します。受信者以外には返しません。POST /api/notify/は従来どおり開始通知専用です。

GETは取得時にカーソルを進める既存仕様を維持します。履歴再取得、別端末への再配信、上限超過分の取りこぼし対策、OSプッシュ配送は追加しません。

## 移行

DBバックアップ後、通常のmanage.py migrateでposts.0002とnotifications.0003を適用します。既存投稿と開始通知を維持し、同一ユーザー・投稿の重複いいねだけ最小IDの1件に集約してから一意制約を追加します。Posts/Likeの既存文字列user_idは互換性のため維持し、APIでは認証IDのみ保存します。

検証: manage.py test、manage.py makemigrations --check --dry-run。通知先の隔離、CSRF、トグル、再いいね、ロールバック、投稿／記録の所有者をテストします。
