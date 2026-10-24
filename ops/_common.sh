# Shared settings for ops/*.sh (sourced, not executed). Run the scripts from anywhere on the VM.
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-/srv/workout/.env}"
if [ ! -r "$ENV_FILE" ]; then
  echo "cannot read $ENV_FILE (are you in the docker group?)" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a
DATA_DIR="${DATA_DIR:-/srv/workout/data}"
BACKUP_DIR="${BACKUP_DIR:-/srv/workout/backup}"
dc() { docker compose -f "$APP_DIR/compose.prod.yaml" --env-file "$ENV_FILE" "$@"; }
