#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../frontend"

if [[ -z "${VITE_API_BASE_URL:-}" ]]; then
  echo "Set VITE_API_BASE_URL to the backend Front Door URL before building." >&2
  exit 1
fi

export VITE_API_BASE_URL
npm install
npm run build
echo "Build output: frontend/dist/"
