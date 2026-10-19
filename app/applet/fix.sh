#!/bin/bash
set -e
echo "=========================================================="
echo "  Aggiornamento Forzato HTTPS + Build - Maestro Studio"
echo "=========================================================="

APP_DIR="/var/www/maestro-studio"

echo "=== 1. Pulizia completa e clonazione pulita da zero ==="
cd /
sudo rm -rf "$APP_DIR"
sudo mkdir -p "$APP_DIR"
sudo chown -R $USER:$USER "$APP_DIR"
cd "$APP_DIR"
git clone https://github.com/msarti81-design/maestro-studio.git .

echo "=== 2. Installazione dipendenze Node.js ==="
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi
npm install

echo "=== 3. Compilazione Frontend (Vite Build) ==="
npm run build
if [ ! -f "dist/index.html" ]; then
    echo "ERRORE: La build non ha generato dist/index.html!"
    exit 1
fi
echo "Build completata con successo in dist/"

echo "=== 4. Configurazione Nginx (HTTP 80 + HTTPS 443 SSL con Proxy Pass) ==="
NGINX_CONF="/etc/nginx/sites-available/freeserv"
sudo bash -c "cat > $NGINX_CONF" << 'EOF'
server {
    listen 80;
    server_name freeserv.it www.freeserv.it;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name freeserv.it www.freeserv.it;

    ssl_certificate /etc/letsencrypt/live/freeserv.it/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/freeserv.it/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location = /Song {
        return 301 https://$host/Song/;
    }
    location = /song {
        return 301 https://$host/song/;
    }

    location /Song/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /song/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location / {
        proxy_pass http://127.0.0.1:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/freeserv /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "=== 5. Riavvio PM2 su PORTA 5000 ==="
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi
pm2 delete maestro 2>/dev/null || true
pm2 delete maestro-studio 2>/dev/null || true
PORT=5000 pm2 start server.ts --interpreter tsx --name "maestro-studio" --update-env
pm2 save

echo "=========================================================="
echo " SUCCESSO! L'app è attiva in HTTPS su freeserv.it/Song/"
echo "=========================================================="
exit 0
