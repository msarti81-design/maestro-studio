import urllib.request
import urllib.parse
import subprocess
import base64
import os

print("=== [1/3] Building Vite Production Bundle ===")
subprocess.run(['npm', 'run', 'build'], check=True)

print("=== [2/3] Creating Optimized Production Archive ===")
proc = subprocess.Popen(
    [
        'tar',
        '--exclude=*.tar.gz',
        '--exclude=*.gz',
        '--exclude=node_modules',
        '--exclude=.git',
        '--exclude=tmp',
        '-czf', '-',
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
        'index.html',
        'server.ts',
        'dist',
        'src',
        'data'
    ],
    stdout=subprocess.PIPE
)
tar_bytes = proc.communicate()[0]
b64_str = base64.b64encode(tar_bytes).decode('utf-8')

bash_script = f"""#!/bin/bash
set -e

echo "=========================================================="
echo "  Aggiornamento Maestro Studio su PORTA 5000 (freeserv.it)"
echo "=========================================================="

APP_DIR="/var/www/maestro-studio"
sudo mkdir -p "$APP_DIR"
sudo chown -R $USER:$USER "$APP_DIR" 2>/dev/null || true
cd "$APP_DIR"

echo "=== [1/5] Estrazione codice aggiornato ==="
cat << 'ARCHIVE_EOF' | base64 -d | tar -xzf -
{b64_str}
ARCHIVE_EOF

echo "=== [2/5] Verifica dipendenze di sistema ==="
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

if [ ! -d "node_modules" ]; then
    npm install --production=false
fi

echo "=== [3/5] Configurazione Nginx per freeserv.it (/Song) ==="
NGINX_CONF="/etc/nginx/sites-available/freeserv"
sudo bash -c "cat > $NGINX_CONF" << 'EOF'
server {{
    listen 80;
    server_name freeserv.it www.freeserv.it;

    location /Song {{
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }}

    location /song {{
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }}
}}
EOF

sudo ln -sf /etc/nginx/sites-available/freeserv /etc/nginx/sites-enabled/ 2>/dev/null || true
sudo nginx -t && sudo systemctl reload nginx 2>/dev/null || true

echo "=== [4/5] Riavvio PM2 su PORTA 5000 ==="
pm2 delete maestro 2>/dev/null || true
pm2 delete maestro-studio 2>/dev/null || true

PORT=5000 pm2 start server.ts --interpreter tsx --name "maestro-studio" --update-env 2>/dev/null || PORT=5000 pm2 start server.ts --name "maestro-studio" --update-env
pm2 save

echo "=========================================================="
echo " SUCCESSO! L'app e' attiva sulla PORTA 5000"
echo " Raggiungibile su: http://freeserv.it/Song"
echo "=========================================================="
exit 0
"""

# Also save update_5000_full.sh locally
with open("update_5000_full.sh", "w") as f:
    f.write(bash_script)

print("Saved update_5000_full.sh locally.")

print("=== [3/3] Uploading Script to dpaste.org ===")
try:
    post_data = urllib.parse.urlencode({'content': bash_script, 'format': 'url'}).encode('utf-8')
    req = urllib.request.Request('https://dpaste.org/api/', data=post_data, headers={'User-Agent': 'curl/7.68.0'})
    with urllib.request.urlopen(req) as resp:
        url = resp.read().decode('utf-8').strip()
        raw_url = url if url.endswith('/raw') else url + '/raw'
        print("\n" + "="*60)
        print(" COMANDO PER TERMIUS SUL TUO VPS:")
        print(f" curl -sL {raw_url} | bash")
        print("="*60 + "\n")
        with open("latest_command.txt", "w") as f_cmd:
            f_cmd.write(f"curl -sL {raw_url} | bash\n")
except Exception as e:
    print("dpaste.org error:", e)
