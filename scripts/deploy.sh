#!/usr/bin/env bash
# Manual deploy script for the SAAD STUDIO VPS.
# Usage (on the server):
#   cd /var/www/saadstudio
#   bash scripts/deploy.sh
set -euo pipefail

APP_NAME="${APP_NAME:-saadstudio}"

echo "==> Pulling latest code from origin/main"
git fetch --all --prune
git reset --hard origin/main

echo "==> Installing dependencies"
npm ci --legacy-peer-deps

echo "==> Generating Prisma client (skip on failure)"
npx prisma generate || true

echo "==> Building Next.js"
npm run build

echo "==> Restarting PM2 process: $APP_NAME"
pm2 restart "$APP_NAME" --update-env
pm2 save

echo "==> Deploy finished at commit: $(git rev-parse --short HEAD)"
