import subprocess, base64, urllib.parse, urllib.request

# Dynamic tar archive including dist and all source files
proc = subprocess.Popen(
    ['tar', '--exclude=node_modules', '-czf', '-', 'package.json', 'tsconfig.json', 'vite.config.ts', 'index.html', 'server.ts', 'dist', 'src'],
    stdout=subprocess.PIPE
)
tar_bytes = proc.communicate()[0]
b64_str = base64.b64encode(tar_bytes).decode('utf-8')

bash_content = f'''#!/bin/bash
set -e

echo "=========================================================="
echo "  Aggiornamento Maestro Studio: Layout & Git Sync         "
echo "  Porta 5000 + Git Commit/Push + Nginx + PM2              "
echo "=========================================================="

# 1. Cartella dell'applicazione sul server
if [ -d "/root/maestro-studio" ]; then
    APP_DIR="/root/maestro-studio"
elif [ -d "/var/www/maestro-studio" ]; then
    APP_DIR="/var/www/maestro-studio"
elif [ -d "/home/maestro-studio" ]; then
    APP_DIR="/home/maestro-studio"
else
    APP_DIR="/root/maestro-studio"
fi

mkdir -p "$APP_DIR"
cd "$APP_DIR"
echo "Cartella applicazione: $APP_DIR"

echo ""
echo "=== [1/6] Estrazione codice sorgente e build dist ==="
cat << 'ARCHIVE_EOF' | base64 -d | tar -xzf -
{b64_str}
ARCHIVE_EOF
echo "OK: File estratti con successo."

echo ""
echo "=== [2/6] Aggiornamento Repository Git ==="
if command -v git >/dev/null 2>&1; then
    if [ ! -d ".git" ]; then
        echo "Inizializzazione repository Git locale in $APP_DIR..."
        git init
        git branch -M main 2>/dev/null || true
    fi

    # Configura utente git se non presente
    git config user.name >/dev/null 2>&1 || git config user.name "Maestro Deploy"
    git config user.email >/dev/null 2>&1 || git config user.email "deploy@freeserv.it"

    echo "Aggiunta file al tracking Git..."
    git add -A .
    
    COMMIT_MSG="Aggiornamento Maestro Studio: Tasti ridimensionati, waterfall velocizzato, note on/off layout ($(date '+%Y-%m-%d %H:%M:%S'))"
    if git commit -m "$COMMIT_MSG"; then
        echo "OK: Commit Git creato con successo!"
    else
        echo "Nota: Nessuna modifica da committare su Git."
    fi

    # Se c'è un remote configurato, fai push
    if git remote | grep -q .; then
        echo "Invio modifiche al repository Git remoto (git push)..."
        git push origin main 2>/dev/null || git push || echo "Avviso: git push non completato (verifica credenziali remote se necessario)."
    else
        echo "Repository Git aggiornato localmente (nessun remote configurato)."
    fi
else
    echo "Avviso: Git non è installato sul server. Passaggio successivo."
fi

echo ""
echo "=== [3/6] Verifica Porta 5000 e Dipendenze ==="
sed -i 's/const PORT = .*/const PORT = 5000;/' server.ts 2>/dev/null || true

if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/tsx" ]; then
    echo "Installazione dipendenze essenziali..."
    npm install --legacy-peer-deps || npm install || true
fi

echo ""
echo "=== [4/6] Controllo Nginx (/Song -> 5000) ==="
CHANGED=0
for conf in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/* /etc/nginx/nginx.conf; do
    if [ -f "$conf" ]; then
        if grep -q "location /Song" "$conf" 2>/dev/null; then
            if grep -q "proxy_pass http://127.0.0.1:3000" "$conf" 2>/dev/null || grep -q "proxy_pass http://localhost:3000" "$conf" 2>/dev/null; then
                echo "Aggiorno proxy_pass /Song in $conf verso la porta 5000..."
                sed -i -E 's/proxy_pass http:\/\/(127\.0\.0\.1|localhost):3000/proxy_pass http:\/\/127.0.0.1:5000/g' "$conf"
                CHANGED=1
            fi
        fi
    fi
done

if [ "$CHANGED" = "1" ]; then
    nginx -t && (systemctl reload nginx || nginx -s reload || true)
fi

echo ""
echo "=== [5/6] Riavvio Processo PM2 ==="
pm2 delete maestro 2>/dev/null || true
pm2 delete maestro-studio 2>/dev/null || true

if [ -f "./node_modules/.bin/tsx" ]; then
    TSX_BIN="./node_modules/.bin/tsx"
elif command -v tsx >/dev/null 2>&1; then
    TSX_BIN="tsx"
else
    npm install tsx --save-dev || true
    TSX_BIN="./node_modules/.bin/tsx"
fi

PORT=5000 pm2 start server.ts --name maestro-studio --interpreter "$TSX_BIN" --update-env
pm2 save 2>/dev/null || true

echo ""
echo "=========================================================="
echo " AGGIORNAMENTO E GIT SYNC COMPLETATI CON SUCCESSO!"
echo " App online su: http://freeserv.it/Song#piano"
echo " App diretta su: http://freeserv.it:5000/"
echo "=========================================================="
'''

post_data = urllib.parse.urlencode({'content': bash_content, 'expiry_days': 7}).encode('utf-8')
req = urllib.request.Request('https://dpaste.com/api/v2/', data=post_data, headers={'User-Agent': 'curl/7.68.0'})
resp = urllib.request.urlopen(req)
url = resp.read().decode('utf-8').strip()
print('DPASTE_URL:', url)
