#!/bin/bash
set -e

APP_DIR="/var/www/maestro-studio"
sudo mkdir -p "$APP_DIR"
sudo chown -R $USER:$USER "$APP_DIR"
cd "$APP_DIR"

echo "=== [1/5] Aggiornamento sistema e strumenti ==="
sudo apt update || true
sudo apt install -y curl git build-essential nginx || true

echo "=== [2/5] Installazione di Node.js 20 LTS ==="
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "Node.js è già installato ($(node -v))"
fi

echo "=== [3/5] Configurazione dipendenze di produzione ==="
cat << 'EOF' > package.json
{
  "name": "maestro-studio",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@google/genai": "^2.4.0",
    "dotenv": "^17.2.3",
    "express": "^4.21.2"
  }
}
EOF
npm install --production --legacy-peer-deps || npm install --production --force || true

echo "=== [4/5] Configurazione Nginx e PM2 ==="
NGINX_CONF="/etc/nginx/sites-available/freeserv"
if [ -f "$NGINX_CONF" ]; then
    sudo python3 -c '
conf_path = "/etc/nginx/sites-available/freeserv"
with open(conf_path, "r") as f:
    content = f.read()

song_block = """
    # App Song sulla porta 5000
    location /Song {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection '\''upgrade'\'';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    location /song {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection '\''upgrade'\'';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
"""

if "location /Song" not in content and "server_name freeserv.it" in content:
    idx = content.find("server_name freeserv.it")
    brace_idx = content.find("}", idx)
    if brace_idx != -1:
        content = content[:brace_idx] + song_block + "\n" + content[brace_idx:]
        with open(conf_path, "w") as f:
            f.write(content)
        print("Nginx config patched successfully preserving subdomains.")
'
fi

sudo ln -sf /etc/nginx/sites-available/freeserv /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi
pm2 kill || true
rm -f ~/.pm2/dump.pm2
PORT=5000 pm2 start server.js --name "maestro-studio" --cwd "$APP_DIR"
pm2 save

echo "===================================================================="
echo " AGGIORNAMENTO COMPLETATO CON SUCCESSO!"
echo "==================================================================="
