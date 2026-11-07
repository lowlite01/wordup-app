#!/usr/bin/env bash
# Wait until the live web app and/or API run the current commit (HEAD).
# Usage: tools/wait-deploy.sh web api     (either or both; ~10 min max)
set -uo pipefail
cd "$(dirname "$0")/.."

WEB_URL="https://wordup-app-api.vercel.app/"
API_URL="https://wordup-api.onrender.com/api/health"
head=$(git rev-parse --short=7 HEAD)

live() {
  case "$1" in
    web) curl -s "$WEB_URL" | sed -n 's/.*<meta name="build" content="\([0-9a-f]*\)".*/\1/p' ;;
    api) curl -s "$API_URL" | sed -n 's/.*"commit":"\([0-9a-z]*\)".*/\1/p' ;;
  esac
}

status=0
for what in "$@"; do
  ok=""
  for _ in $(seq 1 40); do
    if [ "$(live "$what")" = "$head" ]; then ok=1; break; fi
    sleep 15
  done
  if [ -n "$ok" ]; then echo "✓ $what is live at $head"; else echo "✗ $what is still not at $head (now: $(live "$what"))"; status=1; fi
done
exit $status
