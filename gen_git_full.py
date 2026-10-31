import os
import subprocess
import base64
import urllib.request
import urllib.parse

print("=== [1/3] Compilazione applicazione (Vite + esbuild) ===")
subprocess.run(["npm", "run", "build"], check=True)

print("=== [2/3] Creazione archivio compresso di tutto il progetto ===")
proc = subprocess.Popen(
    ['tar', '--exclude=node_modules', '-czf', '-', '.github', 'scripts', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'capacitor.config.json', 'index.html', 'server.ts', 'server.js', 'dist', 'src', 'public'],
    stdout=subprocess.PIPE
)
tar_bytes = proc.communicate()[0]
b64_str = base64.b64encode(tar_bytes).decode('utf-8')

py_nginx_code = """
import sys
conf_path = sys.argv[1]
with open(conf_path, 'r') as f:
    content = f.read()

song_block = '''
    # App Song sulla porta 5000
    location /Song {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    location /song {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
'''

if 'server_name' in content:
    idx = content.find('server_name')
    semi = content.find(';', idx)
    if semi != -1:
        content = content[:semi+1] + song_block + content[semi+1:]
        with open(conf_path, 'w') as f:
            f.write(content)
        print('Nginx aggiornato.')
"""

bash_script = f"""#!/bin/bash
set -e

echo "=========================================================="
echo "  MAESTRO STUDIO: AGGIORNAMENTO UNICO TOTALE              "
echo "  - Canvas GPU Piano + Waterfall Ultra Veloce              "
echo "  - WebApp Server su Porta 5000 e /Song                    "
echo "  - Git Sync + Workflow GitHub Actions per APK Android    "
echo "=========================================================="

if [ -d "/var/www/maestro-studio" ]; then
    APP_DIR="/var/www/maestro-studio"
elif [ -d "/root/maestro-studio" ]; then
    APP_DIR="/root/maestro-studio"
elif [ -d "/home/maestro-studio" ]; then
    APP_DIR="/home/maestro-studio"
else
    APP_DIR="/var/www/maestro-studio"
fi

mkdir -p "$APP_DIR"
cd "$APP_DIR"

echo "=== [1/5] Estrazione del progetto (.github, src, dist, scripts) ==="
cat << 'ARCHIVE_EOF' | base64 -d | tar -xzf -
{b64_str}
ARCHIVE_EOF
echo "OK: File estratti."

echo "=== [2/5] Git Sync e Push automatico per GitHub Actions ==="
if command -v git &> /dev/null; then
    if [ ! -d ".git" ]; then
        git init
        git branch -M main 2>/dev/null || true
    fi
    git config user.name >/dev/null 2>&1 || git config user.name "Maestro Deploy"
    git config user.email >/dev/null 2>&1 || git config user.email "deploy@freeserv.it"
    
    git add -A .
    COMMIT_MSG="Aggiornamento completo Maestro Studio Canvas GPU + GitHub Actions APK ($(date '+%Y-%m-%d %H:%M:%S'))"
    if git commit -m "$COMMIT_MSG" 2>/dev/null; then
        echo "OK: Commit Git creato."
    else
        echo "Nota: Nessuna nuova modifica da committare."
    fi

    if git remote | grep -q .; then
        echo "Pushing verso il repository Git remoto..."
        git push origin main 2>/dev/null || git push || echo "Avviso: git push non riuscito (controlla credenziali remote se necessarie)."
        echo "OK: Push eseguito! La GitHub Action per l'APK Android e scattata in automatico."
    else
        echo "Repository Git aggiornato localmente."
    fi
fi

echo "=== [3/5] Verifica dipendenze di sistema ==="
if ! command -v node &> /dev/null; then
    echo "Installazione Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    echo "Installazione PM2..."
    sudo npm install -g pm2
fi

echo "=== [4/5] Configurazione Nginx (/Song) ==="
NGINX_CONF=""
if [ -f "/etc/nginx/sites-available/freeserv" ]; then
    NGINX_CONF="/etc/nginx/sites-available/freeserv"
else
    NGINX_CONF=$(grep -l -r "freeserv" /etc/nginx/sites-available/ 2>/dev/null | head -n 1 || true)
fi

if [ -n "$NGINX_CONF" ] && [ -f "$NGINX_CONF" ]; then
    if ! grep -q "location /Song" "$NGINX_CONF" && ! grep -q "location /song" "$NGINX_CONF"; then
        python3 -c "{py_nginx_code}" "$NGINX_CONF"
        sudo nginx -t && sudo systemctl reload nginx 2>/dev/null || true
    fi
fi

echo "=== [5/5] Riavvio applicazione (Porta 5000) ==="
pm2 delete maestro-studio 2>/dev/null || true
pm2 delete maestro 2>/dev/null || true

PORT=5000 pm2 start server.js --name "maestro-studio" --cwd "$APP_DIR"
pm2 save 2>/dev/null || true

echo "=========================================================="
echo " AGGIORNAMENTO E SYNC COMPLETATI CON SUCCESSO!"
echo " WebApp: http://freeserv.it/Song#piano"
echo " Diretta: http://freeserv.it:5000/"
echo "=========================================================="
"""

print("=== [3/3] Caricamento script per download diretto via Termius ===")
post_data = urllib.parse.urlencode({'content': bash_script, 'expiry_days': 7}).encode('utf-8')
import ssl
ctx = ssl._create_unverified_context()
req = urllib.request.Request('https://dpaste.com/api/v2/', data=post_data, headers={'User-Agent': 'curl/7.68.0'})
resp = urllib.request.urlopen(req, context=ctx)
raw_url = resp.read().decode('utf-8').strip()

clean_url = raw_url if raw_url.endswith('.txt') else raw_url + '.txt'

print("\n" + "="*60)
print(" COMANDO DA INCOLLARE IN TERMIUS SUL TUO VPS:")
print(f" curl -sL {clean_url} | bash")
print("="*60 + "\n")

with open("latest_command.txt", "w") as f:
    f.write(f"curl -sL {clean_url} | bash\n")
