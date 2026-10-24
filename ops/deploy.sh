#!/bin/sh
# Usage: ops/deploy.sh <image tag = git commit SHA, or "latest">
# pull -> backup -> stop backend -> migrate -> start -> health check. On failure: ops/deploy.sh <previous tag>
# and, if a migration changed the schema, ops/restore.sh <the pre-deploy backup>.
# needs root: the SQLite files belong to the container user (uid 1000) and /srv/workout/.env is root-owned
[ "$(id -u)" = 0 ] || exec sudo "$0" "$@"
# one deploy at a time: waits for a running ops/auto-deploy.sh (which takes the same lock and calls this script)
[ -n "${WORKOUT_DEPLOY_LOCKED:-}" ] || exec env WORKOUT_DEPLOY_LOCKED=1 flock -w 900 /run/workout-deploy.lock "$0" "$@"
. "$(dirname "$0")/_common.sh"
set -eu
NEW="${1:?usage: ops/deploy.sh <tag>}"
# compose.prod.yaml and ops/ come from git; the checkout is root-owned and pulls with the VM's read-only deploy key
git -C "$APP_DIR" pull --ff-only
OLD="${IMAGE_TAG:-}"
export IMAGE_TAG="$NEW"
dc pull
if [ -f "$DATA_DIR/db.sqlite3" ]; then
  "$(dirname "$0")/backup.sh" "pre-deploy-$NEW"
fi
dc run --rm --no-deps backend python manage.py migrate --plan
dc stop backend
dc run --rm --no-deps backend python manage.py migrate --noinput
dc up -d --remove-orphans
i=0
until dc exec -T backend python -c "import urllib.request,sys;sys.exit(0 if urllib.request.urlopen('http://localhost:8000/api/health/').status==200 else 1)" 2>/dev/null; do
  i=$((i + 1)); [ "$i" -ge 20 ] && { echo "health check failed; previous tag was ${OLD:-unknown}" >&2; exit 1; }
  sleep 3
done
# remember the deployed tag for the next `docker compose` run (only the IMAGE_TAG line changes)
sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$NEW/" "$ENV_FILE"
docker image prune -f >/dev/null
echo "deployed $NEW (previous: ${OLD:-none})"
