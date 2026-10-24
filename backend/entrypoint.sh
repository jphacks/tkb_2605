#!/bin/sh
# Apply migrations before starting so a fresh clone works with a single `docker compose up --build`.
# Prod deploys run migrations explicitly (ops/deploy.sh) and set SKIP_MIGRATE=1.
set -e
if [ "${SKIP_MIGRATE:-0}" != "1" ]; then
  python manage.py migrate --noinput
fi
exec "$@"
