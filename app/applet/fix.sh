#!/bin/bash
set -e
echo "=========================================================="
echo "  Aggiornamento Forzato + Build + HTTPS - Maestro Studio"
echo "=========================================================="

APP_DIR="/var/www/maestro-studio"
echo "=== Pulizia e aggiornamento repository ==="
sudo mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [ -d ".git" ]; then
    git fetch origin main
    git reset --hard origin/main
else
    git clone https://github.com/msarti81-design/maestro-studio.git .
fi

echo "=== Installazione dipendenze Node.js ==="
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi
npm install

echo "=== Compilazione applicazione (npm run build) ==="
npm run build

echo "=== Configurazione Nginx per /Song e /song su porta 5000 ==="
NGINX_CONF="/etc/nginx/sites-available/freeserv"
sudo bash -c "cat > $NGINX_CONF" << 'EOF'
server {
    listen 80;
    server_name freeserv.it www.freeserv.it;
    location /Song {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    location /song {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/freeserv /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "=== Riavvio PM2 su PORTA 5000 ==="
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi
pm2 delete maestro 2>/dev/null || true
pm2 delete maestro-studio 2>/dev/null || true
PORT=5000 pm2 start server.ts --interpreter tsx --name "maestro-studio" --update-env
pm2 save

echo "=========================================================="
echo " SUCCESSO! L'app è attiva sulla PORTA 5000"
echo " Raggiungibile su: http://freeserv.it/Song"
echo "=========================================================="
exit 0
