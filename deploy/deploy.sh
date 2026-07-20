#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/nekko}"
PM2_APP="${PM2_APP:-nekko}"
BRANCH="${BRANCH:-main}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/login}"
BACKUP_DIR="${BACKUP_DIR:-/opt}"

cd "$APP_DIR"

timestamp="$(date +%Y%m%d-%H%M%S)"
backup="$BACKUP_DIR/nekko-data-backup-$timestamp.tgz"

echo "Creating backup: $backup"
if [ -d public/uploads ]; then
  tar -czf "$backup" data public/uploads 2>/dev/null || tar -czf "$backup" data
else
  tar -czf "$backup" data
fi

echo "Fetching origin/$BRANCH"
git fetch origin "$BRANCH"

if ! git diff --quiet -- package-lock.json; then
  echo "Resetting server-generated package-lock.json changes"
  git checkout -- package-lock.json
fi

git pull --ff-only origin "$BRANCH"

echo "Installing dependencies"
npm install

echo "Building"
npm run build

echo "Restarting $PM2_APP"
pm2 restart "$PM2_APP" --update-env

echo "Checking health: $HEALTH_URL"
curl -fsSI --max-time 15 "$HEALTH_URL" >/dev/null

pm2 list
echo "Deploy complete."
