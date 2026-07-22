#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/nekko}"
ENV_FILE="$APP_DIR/.env.local"
RUN_URL="${AUTOMATION_RUN_URL:-http://127.0.0.1:3000/api/automations/run}"

[ -f "$ENV_FILE" ] || exit 0
secret="$(node -e '
const fs = require("fs");
const line = fs.readFileSync(process.argv[1], "utf8").split(/\r?\n/).find((entry) => entry.startsWith("RADAR_CRON_SECRET="));
if (!line) process.exit(0);
let value = line.slice(line.indexOf("=") + 1).trim();
if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("\x27") && value.endsWith("\x27"))) value = value.slice(1, -1);
process.stdout.write(value);
' "$ENV_FILE")"

[ -n "$secret" ] || exit 0
curl -fsS --max-time 180 -X POST \
  -H "Authorization: Bearer $secret" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "$RUN_URL" >/dev/null
