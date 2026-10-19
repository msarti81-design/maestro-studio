#!/bin/bash
set -e
echo "=========================================================="
echo "  Aggiornamento Forzato Pulito + Build - Maestro Studio (Porta 5000)"
echo "=========================================================="

APP_DIR="/var/www/maestro-studio"

echo "=== Pulizia completa e clonazione pulita da zero ==="
sudo rm -rf "$APP_DIR"
sudo mkdir -p "$APP_DIR"
sudo chown -R $USER:$USER "$APP_DIR"
cd "$APP_DIR"

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

echo "=== Configurazione Nginx per /Song e /song su porta 5000 ==="
NGINX_CONF="/etc/nginx/sites-available/freeserv"
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
PORT=5000 NODE_ENV=production pm2 start server.ts --interpreter tsx --name "maestro-studio" --update-env
pm2 save

echo "=== DIAGNOSTICA LOCALE AUTOMATICA ==="
sleep 2
echo "Test HTTP locale su http://127.0.0.1:5000/Song/:"
curl -I http://127.0.0.1:5000/Song/ || echo "Attenzione: curl locale fallito"

echo "Stato PM2:"
pm2 status

echo "=========================================================="
echo " SUCCESSO! L'app è stata compilata e avviata sulla PORTA 5000"
echo " Raggiungibile su: http://freeserv.it/Song/"
echo "=========================================================="
exit 0
