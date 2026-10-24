#!/bin/sh
# Consistent SQLite snapshot (sqlite3 .backup, safe while the app runs), keep 14 local copies,
# optionally encrypt with age and copy to R2 (R2_REMOTE + AGE_RECIPIENTS_FILE in the env file).
# Usage: ops/backup.sh [label]
# needs root: the SQLite files belong to the container user (uid 1000) and /srv/workout/.env is root-owned
[ "$(id -u)" = 0 ] || exec sudo "$0" "$@"
. "$(dirname "$0")/_common.sh"
set -eu
DB="$DATA_DIR/db.sqlite3"
[ -f "$DB" ] || { echo "no database at $DB" >&2; exit 1; }
mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/db-$(date +%Y%m%d-%H%M%S)${1:+-$1}.sqlite3"
sqlite3 "$DB" ".backup '$OUT'"
sqlite3 "$OUT" "PRAGMA integrity_check;" | grep -qx ok
gzip "$OUT"
echo "backup: $OUT.gz"
ls -1t "$BACKUP_DIR"/db-*.sqlite3.gz | tail -n +15 | xargs -r rm -f
if [ -n "${R2_REMOTE:-}" ]; then
  age -R "$AGE_RECIPIENTS_FILE" -o "$OUT.gz.age" "$OUT.gz"
  rclone copyto "$OUT.gz.age" "$R2_REMOTE/$(basename "$OUT.gz.age")"
  rm -f "$OUT.gz.age"
  echo "off-site: $R2_REMOTE/$(basename "$OUT.gz.age")"
fi
