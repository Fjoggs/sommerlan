#!/usr/bin/env bash
set -euo pipefail

SERVER="fjogen@192.168.88.250"
REPO="$(cd "$(dirname "$0")" && pwd)"

echo "==> Building frontend"
(cd "$REPO/frontend" && npm run build)

echo "==> Building backend"
(cd "$REPO/backend" && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o sommerlan .)

echo "==> Syncing binary"
rsync -av "$REPO/backend/sommerlan" "$SERVER:~/opt/sommerlan/sommerlan"

echo "==> Syncing frontend"
rsync -av --delete "$REPO/frontend/dist/"   "$SERVER:~/opt/sommerlan/frontend/dist/"
rsync -av          "$REPO/frontend/"*.html  "$SERVER:~/opt/sommerlan/frontend/"
rsync -av          "$REPO/frontend/css/"    "$SERVER:~/opt/sommerlan/frontend/css/"
rsync -av          "$REPO/frontend/fonts/"  "$SERVER:~/opt/sommerlan/frontend/fonts/"
rsync -av          "$REPO/frontend/data/"   "$SERVER:~/opt/sommerlan/frontend/data/"

echo "==> Restarting service"
ssh "$SERVER" 'systemctl --user restart sommerlan'

echo "==> Done"
