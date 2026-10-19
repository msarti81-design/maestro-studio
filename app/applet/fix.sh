#!/bin/bash
set -e
echo "=========================================================="
echo "  Aggiornamento Forzato HTTPS Definitivo - Maestro Studio"
echo "=========================================================="

APP_DIR="/var/www/maestro-studio"

echo "=== Spostamento in / e rimozione sicura della cartella precedente ==="
cd /
sudo rm -rf "$APP_DIR"
sudo mkdir -p "$APP_DIR"
sudo chown -R $USER:$USER "$APP_DIR"
cd "$APP_DIR"

echo "=== Clonazione repository ==="
git clone https://github.com/msarti81-design/maestro-studio.git .

echo "=== Installazione dipendenze Node.js ==="
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

npm install

echo "=== Compilazione Frontend (npm run build) ==="
npm run build

echo "=== Verifica esistenza cartella dist ==="
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "ERRORE: La cartella dist/ o dist/index.html non è stata generata!"
    exit 1
else
    echo "SUCCESS: dist/index.html generata correttamente."
fi

echo "=== Configurazione Nginx HTTPS pulita e senza conflitti ==="
NGINX_CONF="/etc/nginx/sites-available/freeserv"

sudo bash -c "cat > $NGINX_CONF" << 'EOF'
server {
    listen 80;
    server_name freeserv.it www.freeserv.it;

    location = /Song {
        return 301 https://$host$request_uri/;
    }
    location = /song {
        return 301 https://$host$request_uri/;
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

server {
    listen 443 ssl;
    server_name freeserv.it www.freeserv.it;

    ssl_certificate /etc/letsencrypt/live/freeserv.it/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/freeserv.it/privkey.pem;

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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
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
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/freeserv /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

echo "=== Riavvio PM2 su PORTA 5000 ==="
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi
pm2 delete maestro 2>/dev/null || true
pm2 delete maestro-studio 2>/dev/null || true
PORT=5000 NODE_ENV=production pm2 start server.ts --interpreter tsx --name "maestro-studio" --update-env
pm2 save

echo "=== DIAGNOSTICA LOCALE AUTOMATICA ==="
sleep 2
echo "Test HTTP locale su http://127.0.0.1:5000/:"
curl -I http://127.0.0.1:5000/ || echo "Attenzione: curl locale fallito"

echo "Stato PM2:"
pm2 status

echo "=========================================================="
echo " SUCCESSO! L'app è attiva su HTTPS per freeserv.it/Song/"
echo "=========================================================="
exit 0
