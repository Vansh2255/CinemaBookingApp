#!/usr/bin/env bash
set -euo pipefail

REGISTRY="${ACR_NAME:-leetamcr}"
IMAGE_NAME="${IMAGE_NAME:-cinema-backend}"
TAG="${IMAGE_TAG:-v2}"

az acr login --name "$REGISTRY"
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag "${REGISTRY}.azurecr.io/${IMAGE_NAME}:${TAG}" \
  --push ./backend

echo "Pushed ${REGISTRY}.azurecr.io/${IMAGE_NAME}:${TAG}"
