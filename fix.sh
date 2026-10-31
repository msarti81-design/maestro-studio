#!/bin/bash
set -e
echo "=========================================================="
echo "  Aggiornamento Forzato + Build + Nginx + PM2 (Maestro)"
echo "=========================================================="

APP_DIR="/var/www/maestro-studio"
echo "=== 1. Aggiornamento codice da GitHub ==="
sudo mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [ -d ".git" ]; then
    git fetch origin main
    git reset --hard origin/main
else
    git clone https://github.com/msarti81-design/maestro-studio.git .
fi

echo "=== 2. Installazione dipendenze & TSX/PM2 globali ==="
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

npm install
sudo npm install -g tsx pm2

echo "=== 3. Compilazione app (npm run build) ==="
npm run build

echo "=== 4. Configurazione Nginx pulita ==="
# Rimuoviamo il sito di default per evitare "conflicting server name"
sudo rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-available/default

# Controlliamo se esistono certificati SSL Let's Encrypt
SSL_CERT=""
SSL_KEY=""
if [ -f "/etc/letsencrypt/live/freeserv.it/fullchain.pem" ]; then
    SSL_CERT="/etc/letsencrypt/live/freeserv.it/fullchain.pem"
    SSL_KEY="/etc/letsencrypt/live/freeserv.it/privkey.pem"
elif [ -d "/etc/letsencrypt/live" ]; then
    FOUND_CERT=$(find /etc/letsencrypt/live -name "fullchain.pem" | head -n 1)
    if [ -n "$FOUND_CERT" ]; then
        SSL_CERT="$FOUND_CERT"
        SSL_KEY=$(dirname "$FOUND_CERT")/privkey.pem
    fi
fi

NGINX_CONF="/etc/nginx/sites-available/freeserv"

if [ -n "$SSL_CERT" ] && [ -f "$SSL_KEY" ]; then
    echo "Rilevati certificati SSL: $SSL_CERT"
    sudo bash -c "cat > $NGINX_CONF" << EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name freeserv.it www.freeserv.it _;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name freeserv.it www.freeserv.it _;

    ssl_certificate $SSL_CERT;
    ssl_certificate_key $SSL_KEY;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
else
    echo "Configurazione HTTP standard (Porta 80)..."
    sudo bash -c "cat > $NGINX_CONF" << EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name freeserv.it www.freeserv.it _;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
fi

sudo ln -sf /etc/nginx/sites-available/freeserv /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

echo "=== 5. Avvio/Riavvio PM2 su porta 5000 ==="
pm2 delete maestro 2>/dev/null || true
pm2 delete maestro-studio 2>/dev/null || true
PORT=5000 pm2 start server.ts --interpreter tsx --name "maestro-studio" --update-env || PORT=5000 npx pm2 start server.ts --interpreter tsx --name "maestro-studio" --update-env
pm2 save

echo "=== STATO PM2 ==="
pm2 status

echo "=========================================================="
echo " OK! Applicazione aggiornata e attiva sulla porta 5000"
echo " Apri nel browser: https://freeserv.it/Song oppure http://freeserv.it/Song"
echo "=========================================================="
exit 0
