#!/bin/sh
# Containers, health endpoint and memory at a glance.
. "$(dirname "$0")/_common.sh"
dc ps
echo
echo "IMAGE_TAG=$IMAGE_TAG"
dc exec -T backend python -c "import urllib.request;print(urllib.request.urlopen('http://localhost:8000/api/health/').read().decode())" || echo "health: FAILED"
echo
free -m
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}'
