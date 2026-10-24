#!/bin/sh
# Usage: ops/restart.sh [service...]   (no argument = all services)
. "$(dirname "$0")/_common.sh"
dc restart "$@"
dc ps
