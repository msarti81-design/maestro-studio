#!/bin/bash
# ==============================================================================
# Maestro Studio - Automated Deployment Script for Aruba Cloud VPS / Ubuntu
# Configures Node.js, PM2, Nginx, and proxy routing for freeserv.it/Song
# ==============================================================================

echo "=== [1/5] Updating system packages & installing dependencies ==="
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential nginx

echo "=== [2/5] Installing Node.js 20 LTS ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "=== [3/5] Setting up application directory ==="
APP_DIR="/var/www/maestro-studio"
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# Copy current project files to APP_DIR if running inside project
if [ -f "package.json" ]; then
    cp -r . $APP_DIR/
fi

cd $APP_DIR
npm install

echo "=== [4/5] Configuring Nginx reverse proxy for /Song ==="
# Create Nginx configuration snippet routing /Song to port 3000
NGINX_CONF="/etc/nginx/sites-available/freeserv"

sudo bash -c "cat > $NGINX_CONF" << 'EOF'
server {
    listen 80;
    server_name freeserv.it www.freeserv.it;

    location /Song {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /song {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/freeserv /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

echo "=== [5/5] Starting application with PM2 ==="
sudo npm install -g pm2
pm2 delete maestro-studio 2>/dev/null || true
PORT=3000 pm2 start server.ts --interpreter tsx --name "maestro-studio"
pm2 startup
pm2 save

echo "=============================================================================="
echo " Deployment Complete! Maestro Studio is now running on freeserv.it/Song"
echo "=============================================================================="
