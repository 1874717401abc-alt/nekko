#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/nekko}"
PM2_APP="${PM2_APP:-nekko}"
HERMES_PM2_APP="${HERMES_PM2_APP:-hermes-gateway}"
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

hermes_was_online=0
hermes_pid="$(pm2 pid "$HERMES_PM2_APP" 2>/dev/null || true)"
if [ -n "$hermes_pid" ] && [ "$hermes_pid" != "0" ]; then
  hermes_was_online=1
  echo "Pausing $HERMES_PM2_APP during install and build"
  pm2 stop "$HERMES_PM2_APP"
fi

restore_hermes() {
  if [ "$hermes_was_online" = "1" ]; then
    echo "Restoring $HERMES_PM2_APP"
    pm2 restart "$HERMES_PM2_APP" --update-env
    hermes_was_online=0
  fi
}
trap restore_hermes EXIT

echo "Installing dependencies"
npm ci

echo "Building with a bounded Node.js heap"
NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1024}" NEXT_TELEMETRY_DISABLED=1 npm run build

echo "Restarting $PM2_APP"
pm2 restart "$PM2_APP" --update-env
restore_hermes

echo "Checking health: $HEALTH_URL"
for attempt in $(seq 1 30); do
  if curl -fsSI --max-time 5 "$HEALTH_URL" >/dev/null; then
    echo "Health check passed on attempt $attempt."
    pm2 list
    echo "Deploy complete."
    exit 0
  fi
  sleep 1
done

pm2 list
pm2 logs "$PM2_APP" --lines 40 --nostream
echo "Health check failed after 30 attempts."
exit 1
