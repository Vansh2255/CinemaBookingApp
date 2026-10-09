#!/usr/bin/env bash
set -euo pipefail

STORAGE_ACCOUNT="${STORAGE_ACCOUNT:-leetamstrgacc}"
FRONTEND_DIR="$(cd "$(dirname "$0")/../frontend" && pwd)"

if [[ ! -d "$FRONTEND_DIR/dist" ]]; then
  echo "No frontend/dist found. Run scripts/build-frontend.sh first." >&2
  exit 1
fi

az storage blob upload-batch \
  --account-name "$STORAGE_ACCOUNT" \
  --destination '$web' \
  --source "$FRONTEND_DIR/dist" \
  --auth-mode login \
  --overwrite
