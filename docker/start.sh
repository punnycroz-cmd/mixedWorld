#!/usr/bin/env bash
set -euo pipefail

mkdir -p /data

# Signing secrets: honor explicit env vars; otherwise generate a random
# secret once and persist it on the data volume so sessions survive restarts.
persist_secret() {
  local name="$1" file="/data/.secret_$1" current_value="${!1:-}"
  if [ -n "$current_value" ]; then
    printf '%s' "$current_value"
    return
  fi
  if [ ! -s "$file" ]; then
    head -c 48 /dev/urandom | base64 | tr -d '=+/' | head -c 48 > "$file"
    chmod 600 "$file"
  fi
  cat "$file"
}

export API_SESSION_SECRET="${API_SESSION_SECRET:-$(persist_secret API_SESSION_SECRET)}"
export MIXEDWORLD_SESSION_SECRET="${MIXEDWORLD_SESSION_SECRET:-$(persist_secret MIXEDWORLD_SESSION_SECRET)}"
export AGENT_SHARED_SALT="${AGENT_SHARED_SALT:-$(persist_secret AGENT_SHARED_SALT)}"

# FastAPI: internal-only, the Next app proxies /api/* to it.
cd /app
uvicorn app.main:app --host 127.0.0.1 --port 8001 &
API_PID=$!

# Next.js standalone server: the only public port.
cd /app/apps/web
node server.js &
WEB_PID=$!

shutdown() {
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
}
trap shutdown TERM INT

wait -n
shutdown
exit 0
