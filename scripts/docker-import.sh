#!/usr/bin/env bash
# Load vrc-gallery-image.tar on another machine, then start with docker compose.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE_TAR="${1:-$ROOT/vrc-gallery-image.tar}"

if [[ ! -f "$IMAGE_TAR" ]]; then
  echo "Image file not found: $IMAGE_TAR"
  exit 1
fi

docker load -i "$IMAGE_TAR"
mkdir -p "$ROOT/photos" "$ROOT/data"
cd "$ROOT"
docker compose up -d

echo "Gallery running at http://localhost:8787"
