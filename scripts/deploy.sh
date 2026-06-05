#!/usr/bin/env bash
# First-time or update deploy: install deps, build, sync catalog.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

npm ci

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example — review before going live."
fi

mkdir -p photos data

npm run build
npm run sync-photos:prod

echo "Deploy build complete. Start with: ./scripts/prod.sh  (or: npm start)"
