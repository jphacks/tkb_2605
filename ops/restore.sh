#!/bin/sh
# Usage: ops/restore.sh <backup file (.sqlite3, .sqlite3.gz or .sqlite3.gz.age)>
# Stops the backend, keeps the current DB as db.sqlite3.before-restore-<time>, swaps in the backup, starts again.
# needs root: the SQLite files belong to the container user (uid 1000) and /srv/workout/.env is root-owned
[ "$(id -u)" = 0 ] || exec sudo "$0" "$@"
. "$(dirname "$0")/_common.sh"
set -eu
SRC="${1:?usage: ops/restore.sh <backup file>}"
TMP="$(mktemp "$BACKUP_DIR/restore-XXXXXX")"
case "$SRC" in
  *.age) age -d -i "${AGE_IDENTITY:?set AGE_IDENTITY to your ssh private key}" "$SRC" | gunzip > "$TMP" ;;
  *.gz) gunzip -c "$SRC" > "$TMP" ;;
  *) cp "$SRC" "$TMP" ;;
esac
sqlite3 "$TMP" "PRAGMA integrity_check;" | grep -qx ok
dc stop backend
STAMP="$(date +%Y%m%d-%H%M%S)"
for f in db.sqlite3 db.sqlite3-wal db.sqlite3-shm; do
  [ -e "$DATA_DIR/$f" ] && mv "$DATA_DIR/$f" "$DATA_DIR/$f.before-restore-$STAMP"
done
mv "$TMP" "$DATA_DIR/db.sqlite3"
chown 1000:1000 "$DATA_DIR/db.sqlite3"
dc up -d
echo "restored $SRC (previous DB kept as $DATA_DIR/db.sqlite3.before-restore-$STAMP)"
