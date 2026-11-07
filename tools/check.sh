#!/usr/bin/env bash
# Type-check the API and the web app, then build the web app.
# Usage: tools/check.sh        (from anywhere inside the repo)
set -euo pipefail
cd "$(dirname "$0")/.."

echo "› api: prisma client + types"
npm --prefix apps/api run prisma:generate >/dev/null 2>&1
(cd apps/api && npx tsc --noEmit -p .)

echo "› web: types (incl. unused code) + build"
(cd apps/web && npx tsc --noEmit -p . --noUnusedLocals && npx vite build --logLevel error)

echo "✓ all good"
