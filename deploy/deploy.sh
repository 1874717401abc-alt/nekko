#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/nekko}"
PM2_APP="${PM2_APP:-nekko}"
HERMES_PM2_APP="${HERMES_PM2_APP:-hermes-gateway}"
BRANCH="${BRANCH:-main}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/api/health}"
BACKUP_DIR="${BACKUP_DIR:-/opt}"
BACKUP_RETENTION="${BACKUP_RETENTION:-5}"

cd "$APP_DIR"

timestamp="$(date +%Y%m%d-%H%M%S)"
backup="$BACKUP_DIR/nekko-data-backup-$timestamp.tgz"

echo "Creating backup: $backup"
if [ -d public/uploads ]; then
  tar -czf "$backup" data public/uploads 2>/dev/null || tar -czf "$backup" data
else
  tar -czf "$backup" data
fi

mapfile -t expired_backups < <(
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'nekko-data-backup-*.tgz' -print \
    | sort -r \
    | tail -n "+$((BACKUP_RETENTION + 1))"
)
if [ "${#expired_backups[@]}" -gt 0 ]; then
  echo "Removing ${#expired_backups[@]} expired backup(s)"
  rm -f -- "${expired_backups[@]}"
fi

echo "Fetching origin/$BRANCH"
git fetch origin "$BRANCH"
previous_revision="$(git rev-parse HEAD)"

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

dependencies_changed=0
if [ ! -x node_modules/.bin/next ]; then
  dependencies_changed=1
elif ! git diff --quiet "$previous_revision" HEAD -- package.json package-lock.json; then
  dependencies_changed=1
fi

if [ "$dependencies_changed" = "1" ]; then
  echo "Installing changed dependencies"
  NODE_OPTIONS="${INSTALL_NODE_OPTIONS:---max-old-space-size=768}" \
    npm_config_jobs=1 npm install --no-audit --no-fund
  git restore package-lock.json
else
  echo "Dependencies unchanged; skipping npm install"
fi

if ! node -e "require('better-sqlite3')" >/dev/null 2>&1; then
  echo "Rebuilding better-sqlite3 native binding"
  npm_config_jobs=1 npm rebuild better-sqlite3 --no-audit --no-fund
fi

echo "Building with a bounded Node.js heap"
NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1024}" NEXT_TELEMETRY_DISABLED=1 npm run build

echo "Restarting $PM2_APP"
pm2 restart "$PM2_APP" --update-env
restore_hermes

echo "Checking health: $HEALTH_URL"
for attempt in $(seq 1 30); do
  if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null; then
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
