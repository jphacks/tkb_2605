#!/bin/sh
# Usage: ops/logs.sh [service] [extra docker compose logs args]   e.g. ops/logs.sh backend --since 10m
. "$(dirname "$0")/_common.sh"
dc logs --tail 200 "$@"
