#!/usr/bin/env bash
# Start production server (requires npm run build first).
# Loads .env if present, then runs npm start (prestart syncs catalog).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f client/dist/index.html ]] || [[ ! -f server/dist/index.js ]]; then
  echo "Missing build output. Run: npm run build" >&2
  exit 1
fi

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

exec npm start
