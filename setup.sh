#!/usr/bin/env bash
set -euo pipefail

SERVER="fjogen@192.168.88.250"
REPO="$(cd "$(dirname "$0")" && pwd)"

echo "==> Building frontend"
(cd "$REPO/frontend" && npm run build)

echo "==> Building backend"
(cd "$REPO/backend" && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o sommerlan .)

echo "==> Creating remote directories"
ssh "$SERVER" "mkdir -p ~/opt/sommerlan/{data,frontend/{dist,css,fonts,data,uploads/lan}} ~/log/nginx/sommerlan ~/.config/systemd/user"

echo "==> Syncing binary"
rsync -av "$REPO/backend/sommerlan" "$SERVER:~/opt/sommerlan/sommerlan"

echo "==> Syncing frontend"
rsync -av --delete "$REPO/frontend/dist/"   "$SERVER:~/opt/sommerlan/frontend/dist/"
rsync -av          "$REPO/frontend/"*.html  "$SERVER:~/opt/sommerlan/frontend/"
rsync -av          "$REPO/frontend/css/"    "$SERVER:~/opt/sommerlan/frontend/css/"
rsync -av          "$REPO/frontend/fonts/"  "$SERVER:~/opt/sommerlan/frontend/fonts/"
rsync -av          "$REPO/frontend/data/"   "$SERVER:~/opt/sommerlan/frontend/data/"

echo "==> Syncing database"
rsync -av "$REPO/backend/sommerlan.db" "$SERVER:~/opt/sommerlan/data/sommerlan.db"

echo "==> Syncing uploads"
rsync -av --delete "$REPO/frontend/uploads/" "$SERVER:~/opt/sommerlan/frontend/uploads/"

echo "==> Staging config files"
rsync -av "$REPO/sommerlan.service" "$REPO/sommerlan.conf" "$SERVER:~/"

echo ""
echo "Done. Run these on the server to finish:"
echo ""
echo "  # Install imagemagick (needed for image processing)"
echo "  sudo apt install -y imagemagick"
echo ""
echo "  # Systemd user service"
echo "  cp ~/sommerlan.service ~/.config/systemd/user/"
echo "  systemctl --user daemon-reload"
echo "  systemctl --user enable --now sommerlan"
echo "  loginctl enable-linger fjogen"
echo ""
echo "  # Nginx"
echo "  sudo cp ~/sommerlan.conf /etc/nginx/sites-available/sommerlan.conf"
echo "  sudo ln -sf /etc/nginx/sites-available/sommerlan.conf /etc/nginx/sites-enabled/"
echo "  sudo nginx -t && sudo systemctl reload nginx"
echo "  sudo certbot --nginx -d sommerlan.sleeperop.com -d sommerlan.anno1337.com"
echo ""
echo "Also make sure ~/opt/sommerlan/.env exists on the server."
