import os
import subprocess
import base64
import urllib.request
import urllib.parse

# 1. Build project
subprocess.run(["npm", "run", "build"], check=True)

# 2. Package project
proc = subprocess.Popen(
    ['tar', '--exclude=node_modules', '--exclude=dist', '--exclude=*.tar.gz', '-czf', '-', '.github', 'scripts', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'capacitor.config.json', 'index.html', 'server.ts', 'server.js', 'src', 'public'],
    stdout=subprocess.PIPE
)
tar_bytes = proc.communicate()[0]
b64_str = base64.b64encode(tar_bytes).decode('utf-8')

bash_script = f"""#!/bin/bash

echo "=========================================================="
echo "  MAESTRO STUDIO: DIAGNOSTICA & PUSH GIT / GITHUB ACTIONS "
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

echo "=== [1/4] Estrazione codice sorgente e .github/workflows ==="
cat << 'ARCHIVE_EOF' | base64 -d | tar -xzf -
{b64_str}
ARCHIVE_EOF
echo "OK: Sorgenti ed Action estratte."

echo ""
echo "=== [2/4] Controllo configurazione Git locale ==="
if [ ! -d ".git" ]; then
    git init
    git branch -M main
fi

git config user.name >/dev/null 2>&1 || git config user.name "Maestro Deploy"
git config user.email >/dev/null 2>&1 || git config user.email "deploy@freeserv.it"

git add -A .
git commit -m "Aggiornamento e Sync Workflow GitHub Actions ($(date '+%Y-%m-%d %H:%M:%S'))" || true

echo ""
echo "=== [3/4] Controllo Remote Git ==="
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")

if [ -z "$REMOTE_URL" ]; then
    echo "⚠️ ATTENZIONE: Nessun remote Git 'origin' impostato su questo server!"
    echo "Per collegare il server al tuo repository GitHub, esegui:"
    echo "  git remote add origin https://github.com/TUO_UTENTE/TUO_REPO.git"
    echo "  git push -u origin main"
    echo ""
else
    echo "Remote trovato: $REMOTE_URL"
    echo "Tentativo di Push verso GitHub (mostrando eventuali errori)..."
    echo "----------------------------------------------------------"
    git push -u origin main || git push -u origin master || echo "⚠️ PUSH FALLITO: Verifica se servono credenziali o un Personal Access Token GitHub."
    echo "----------------------------------------------------------"
fi

echo ""
echo "=== [4/4] Riavvio servizio su porta 5000 ==="
PORT=5000 pm2 restart maestro-studio 2>/dev/null || PORT=5000 pm2 start server.js --name "maestro-studio" --cwd "$APP_DIR"

echo ""
echo "=========================================================="
echo "  DIAGNOSTICA COMPLETATA!"
echo "=========================================================="
"""

import ssl
ssl_ctx = ssl._create_unverified_context()

post_data = urllib.parse.urlencode({'content': bash_script, 'expiry_days': 7}).encode('utf-8')
req = urllib.request.Request('https://dpaste.com/api/v2/', data=post_data, headers={'User-Agent': 'curl/7.68.0'})
resp = urllib.request.urlopen(req, context=ssl_ctx)
raw_url = resp.read().decode('utf-8').strip()
clean_url = raw_url if raw_url.endswith('.txt') else raw_url + '.txt'

print(f"COMMAND: curl -sL {clean_url} | bash")

with open("latest_command.txt", "w") as f:
    f.write(f"curl -sL {clean_url} | bash\n")
