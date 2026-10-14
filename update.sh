#!/bin/bash
set -e

echo "=== [1/5] Aggiornamento sistema e installazione strumenti di base ==="
sudo apt update && sudo apt install -y curl git build-essential nginx

echo "=== [2/5] Installazione di Node.js 20 LTS ==="
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "Node.js è già installato ($(node -v))"
fi

echo "=== [3/5] Configurazione directory e dipendenze ==="
APP_DIR="/var/www/maestro-studio"
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR
cd $APP_DIR

if [ -f "package.json" ]; then
    npm install
else
    echo "ATTENZIONE: Metti i file del progetto in $APP_DIR prima di eseguire lo script."
    exit 1
fi

echo "=== [4/5] Configurazione Nginx per freeserv.it/Song sulla PORTA 5000 ==="
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
sudo nginx -t && sudo systemctl restart nginx

echo "=== [5/5] Avvio / Riavvio applicazione con PM2 sulla PORTA 5000 ==="
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

pm2 delete maestro-studio 2>/dev/null || true
PORT=5000 pm2 start server.ts --interpreter tsx --name "maestro-studio"
pm2 save

echo "===================================================================="
echo " AGGIORNAMENTO COMPLETATO SU PORTA 5000!"
echo " Il sito è ora attivo e raggiungibile su: http://freeserv.it/Song"
echo "===================================================================="
