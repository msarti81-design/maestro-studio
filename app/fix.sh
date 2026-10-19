#!/bin/bash
set -e
echo "=========================================================="
echo "  Aggiornamento Forzato Maestro Studio - Auto SSL & Build"
echo "=========================================================="

APP_DIR="/var/www/maestro-studio"

echo "=== Pulizia e clonazione repository ==="
cd /
sudo rm -rf "$APP_DIR"
sudo mkdir -p "$APP_DIR"
sudo chown -R $USER:$USER "$APP_DIR"
cd "$APP_DIR"
git clone https://github.com/msarti81-design/maestro-studio.git .

echo "=== Installazione dipendenze e build ==="
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi
npm install
npm run build

if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "ERRORE: Build fallita, dist/index.html mancante!"
    exit 1
fi

echo "=== Ricerca automatica certificati SSL Let's Encrypt ==="
SSL_CERT=""
SSL_KEY=""

if [ -f "/etc/letsencrypt/live/freeserv.it/fullchain.pem" ]; then
    SSL_CERT="/etc/letsencrypt/live/freeserv.it/fullchain.pem"
    SSL_KEY="/etc/letsencrypt/live/freeserv.it/privkey.pem"
else
    FOUND_CERT=$(find /etc/letsencrypt/live -name "fullchain.pem" | head -n 1)
    FOUND_KEY=$(find /etc/letsencrypt/live -name "privkey.pem" | head -n 1)
    if [ -n "$FOUND_CERT" ] && [ -n "$FOUND_KEY" ]; then
        SSL_CERT="$FOUND_CERT"
        SSL_KEY="$FOUND_KEY"
    fi
fi

NGINX_CONF="/etc/nginx/sites-available/freeserv"

if [ -n "$SSL_CERT" ] && [ -n "$SSL_KEY" ]; then
    echo "Trovati certificati SSL: $SSL_CERT"
    sudo bash -c "cat > $NGINX_CONF" << EOF
server {
    listen 80;
    server_name freeserv.it www.freeserv.it;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name freeserv.it www.freeserv.it;

    ssl_certificate $SSL_CERT;
    ssl_certificate_key $SSL_KEY;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location = /Song {
        return 301 /Song/;
    }
    location = /song {
        return 301 /song/;
    }

    location /Song/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass \$http_upgrade;
    }
    location /song/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
else
    echo "Nessun certificato SSL trovato. Configurazione HTTP standard."
    sudo bash -c "cat > $NGINX_CONF" << 'EOF'
server {
    listen 80;
    server_name freeserv.it www.freeserv.it;

    location = /Song {
        return 301 /Song/;
    }
    location = /song {
        return 301 /song/;
    }

    location /Song/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    location /song/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
fi

sudo rm -f /etc/nginx/sites-enabled/*le-ssl.conf 2>/dev/null || true
sudo ln -sf /etc/nginx/sites-available/freeserv /etc/nginx/sites-enabled/freeserv
sudo nginx -t && sudo systemctl restart nginx

echo "=== Riavvio PM2 su PORTA 5000 ==="
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi
pm2 delete maestro 2>/dev/null || true
pm2 delete maestro-studio 2>/dev/null || true
PORT=5000 NODE_ENV=production pm2 start server.ts --interpreter tsx --name "maestro-studio" --update-env
pm2 save

echo "=========================================================="
echo " SUCCESSO! L'app è attiva e aggiornata."
echo "=========================================================="
exit 0
