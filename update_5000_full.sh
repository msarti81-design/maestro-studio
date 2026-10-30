#!/bin/bash
echo "=========================================================="
echo "  MAESTRO STUDIO: SYNC & UPDATE FROM GITHUB MAIN          "
echo "=========================================================="

# 1. Determine workspace directory
if [ -f "server.ts" ] || [ -f "package.json" ]; then
    APP_DIR="$(pwd)"
elif [ -d "/var/www/maestro-studio" ]; then
    APP_DIR="/var/www/maestro-studio"
elif [ -d "/root/maestro-studio" ]; then
    APP_DIR="/root/maestro-studio"
elif [ -d "/home/maestro-studio" ]; then
    APP_DIR="/home/maestro-studio"
else
    APP_DIR="$(pwd)"
fi

cd "$APP_DIR" || exit 1
echo "=== Working directory: $(pwd) ==="

# 2. Pull latest clean code & precompiled dist from GitHub
echo "=== [1/3] Fetching latest build & code from GitHub main ==="
git fetch origin main || git fetch --all
git reset --hard origin/main || git pull origin main --ff-only

# 3. Ensure dependencies are present
echo "=== [2/3] Verifying npm dependencies ==="
if [ ! -d "node_modules" ]; then
    npm install --omit=dev --no-audit --no-fund || npm install --no-audit --no-fund
fi

# 4. Restart server process
echo "=== [3/3] Restarting node server ==="
if command -v pm2 &> /dev/null; then
    pm2 restart all || pm2 restart server || pm2 start "npm start" --name "maestro-studio"
elif command -v systemctl &> /dev/null; then
    systemctl restart maestro-studio || systemctl restart song || true
else
    echo "PM2 or systemctl not found. Please restart node server manually if needed."
fi

echo "=========================================================="
echo "  SUCCESS! MAESTRO STUDIO UPDATED TO LATEST VERSION       "
echo "=========================================================="
