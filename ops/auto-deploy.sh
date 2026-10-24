#!/bin/sh
# Continuous deployment, run by workout-auto-deploy.timer every 5 minutes. The VM accepts no inbound
# connections, so instead of GitHub pushing to it, it polls: when origin/main has moved and both images
# for that commit are on GHCR (Publish images only pushes after CI passed), run ops/deploy.sh <sha>.
# It acts only when main moves, so a manual rollback (ops/deploy.sh <older sha>) stays until the next merge,
# and a commit whose deploy failed is rolled back and not retried (retry by hand: ops/deploy.sh <sha>).
# Pause: sudo touch /srv/workout/auto-deploy.disabled   Resume: sudo rm /srv/workout/auto-deploy.disabled
[ "$(id -u)" = 0 ] || exec sudo "$0" "$@"
[ -n "${WORKOUT_DEPLOY_LOCKED:-}" ] || exec env WORKOUT_DEPLOY_LOCKED=1 flock -n /run/workout-deploy.lock "$0" "$@"
. "$(dirname "$0")/_common.sh"
set -eu
STATE_DIR="${STATE_DIR:-/srv/workout}"
[ -e "$STATE_DIR/auto-deploy.disabled" ] && { echo "auto-deploy is paused ($STATE_DIR/auto-deploy.disabled)"; exit 0; }

notify() {
  echo "$1"
  # optional: a Discord webhook URL in the env file
  [ -n "${DEPLOY_NOTIFY_URL:-}" ] || return 0
  msg=$(printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g')
  curl -fsS -m 10 -H 'Content-Type: application/json' -d "{\"content\":\"[kintore] $msg\"}" "$DEPLOY_NOTIFY_URL" >/dev/null || true
}

git -C "$APP_DIR" fetch -q origin main
TARGET=$(git -C "$APP_DIR" rev-parse origin/main)
CURRENT="${IMAGE_TAG:-}"
LAST_FILE="$STATE_DIR/auto-deploy.last-main"
LAST=$(cat "$LAST_FILE" 2>/dev/null || echo "$CURRENT")
[ "$TARGET" = "$LAST" ] && exit 0
[ "$TARGET" = "$CURRENT" ] && { echo "$TARGET" > "$LAST_FILE"; exit 0; }
for svc in web backend; do
  if ! docker manifest inspect "ghcr.io/reindeer39/kintore-app-$svc:$TARGET" >/dev/null 2>&1; then
    echo "waiting for ghcr.io/reindeer39/kintore-app-$svc:$TARGET (CI or Publish images not finished)"
    exit 0
  fi
done

SUBJECT=$(git -C "$APP_DIR" log -1 --format=%s "$TARGET")
echo "$TARGET" > "$LAST_FILE"
if "$(dirname "$0")/deploy.sh" "$TARGET"; then
  notify "deployed $(echo "$TARGET" | cut -c1-7) $SUBJECT"
else
  if [ -n "$CURRENT" ]; then
    IMAGE_TAG="$CURRENT" dc up -d --remove-orphans || true
  fi
  notify "deploy of $(echo "$TARGET" | cut -c1-7) failed, rolled back to $(echo "$CURRENT" | cut -c1-7). If a migration ran, check the data and use ops/restore.sh with the pre-deploy backup. Logs: journalctl -u workout-auto-deploy"
  exit 1
fi
