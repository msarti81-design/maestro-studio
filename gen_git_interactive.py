import os
import subprocess
import base64
import urllib.request
import urllib.parse

# 1. Build project
subprocess.run(["npm", "run", "build"], check=True)

# 2. Package project
proc = subprocess.Popen(
    ['tar', '--exclude=node_modules', '-czf', '-', '.github', 'scripts', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'capacitor.config.json', 'index.html', 'server.ts', 'server.js', 'dist', 'src', 'public'],
    stdout=subprocess.PIPE
)
tar_bytes = proc.communicate()[0]
b64_str = base64.b64encode(tar_bytes).decode('utf-8')

bash_script = f"""#!/bin/bash

echo "=========================================================="
echo "  MAESTRO STUDIO: SYNC & AUTOMATION GITHUB ACTIONS        "
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

echo "=== [1/4] Estrazione del codice e dei file di GitHub Actions ==="
cat << 'ARCHIVE_EOF' | base64 -d | tar -xzf -
{b64_str}
ARCHIVE_EOF
echo "OK: File sorgenti estrapolati in $APP_DIR."

echo ""
echo "=== [2/4] Inizializzazione e Sync Git ==="
if [ ! -d ".git" ]; then
    git init
    git branch -M main
fi

git config user.name "msarti81-design"
git config user.email "msarti81@gmail.com"

git add -A .
git commit -m "Aggiornamento Maestro Studio + Sync APK Actions ($(date '+%Y-%m-%d %H:%M:%S'))" || true

TARGET_REPO="https://github.com/msarti81-design/maestro-studio.git"

git remote add origin "$TARGET_REPO" 2>/dev/null || git remote set-url origin "$TARGET_REPO"

echo ""
echo "=== [3/4] Invio del codice a GitHub ($TARGET_REPO) ==="
echo "In corso il 'git push --force' verso GitHub..."
if git push -u origin main --force; then
    echo ""
    echo "✅ SUCCESS: Codice inviato a GitHub con successo!"
    echo "Le GitHub Actions per l'APK Android sono partite ORA su GitHub!"
else
    echo ""
    echo "⚠️ Se richiede autenticazione o token, inserisci il tuo Username e Personal Access Token."
fi

echo ""
echo "=== [4/4] Riavvio WebApp (Porta 5000 /Song) ==="
PORT=5000 pm2 restart maestro-studio --update-env 2>/dev/null || PORT=5000 pm2 start server.js --name "maestro-studio" --cwd "$APP_DIR"

echo "=========================================================="
echo " AGGIORNAMENTO COMPLETATO CON SUCCESSO!"
echo "=========================================================="
"""

with open("update.sh", "w") as f:
    f.write(bash_script)
os.chmod("update.sh", 0o755)

import ssl
ctx = ssl._create_unverified_context()
post_data = urllib.parse.urlencode({'content': bash_script, 'expiry_days': 7}).encode('utf-8')
req = urllib.request.Request('https://dpaste.com/api/v2/', data=post_data, headers={'User-Agent': 'curl/7.68.0'})
resp = urllib.request.urlopen(req, context=ctx)
raw_url = resp.read().decode('utf-8').strip()
clean_url = raw_url if raw_url.endswith('.txt') else raw_url + '.txt'

print(f"COMMAND: curl -skL {clean_url} | bash")

with open("latest_command.txt", "w") as f:
    f.write(f"curl -skL {clean_url} | bash\n")
