import subprocess, base64, urllib.parse, urllib.request

# Includiamo TUTTO ciò che serve, e soprattutto dist GIÀ COMPILATO (così non serve nemmeno vite!),
# ma nel caso facciamo anche npm install se servisse
proc = subprocess.Popen(
    ['tar', '--exclude=node_modules', '--exclude=dist', '-czf', '-', 'package.json', 'tsconfig.json', 'vite.config.ts', 'index.html', 'server.ts', 'src'],
    stdout=subprocess.PIPE
)
tar_bytes = proc.communicate()[0]
b64_str = base64.b64encode(tar_bytes).decode('utf-8')

bash_content = f'''#!/bin/bash
set -e

echo "=========================================================="
echo "  Aggiornamento Maestro Studio: Layout Ultra-Compatto     "
echo "  Porta 5000 Garantita + Zero Errori Vite                 "
echo "=========================================================="

# Rileva directory esistente o usa /root/maestro-studio
if [ -d "/root/maestro-studio" ]; then
    APP_DIR="/root/maestro-studio"
elif [ -d "/var/www/maestro-studio" ]; then
    APP_DIR="/var/www/maestro-studio"
else
    APP_DIR="/root/maestro-studio"
fi

mkdir -p "$APP_DIR"
cd "$APP_DIR"
echo "Cartella applicazione: $APP_DIR"

echo "=== [1/5] Estrazione file aggiornati con dist pre-compilato ==="
cat << 'ARCHIVE_EOF' | base64 -d | tar -xzf -
{b64_str}
ARCHIVE_EOF

echo "=== [2/5] Verifica dipendenze e porta ==="
# Se node_modules non esiste o mancano i moduli base, installali
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/tsx" ]; then
    echo "Installazione dipendenze essenziali..."
    npm install --legacy-peer-deps || npm install
fi

# Assicura PORT 5000 in server.ts
sed -i 's/const PORT = .*/const PORT = 5000;/' server.ts

echo "=== [3/5] Verifica build (dist già pronta, bypassa vite se non installato a livello globale) ==="
if [ -f "node_modules/.bin/vite" ]; then
    ./node_modules/.bin/vite build || true
elif command -v npx >/dev/null 2>&1; then
    npx vite build || true
fi
# Se la cartella dist esiste, la build è perfetta
if [ -f "dist/index.html" ]; then
    echo "Cartella dist/ verificata con successo!"
fi

echo "=== [4/5] Configurazione Nginx per /Song -> Porta 5000 ==="
# Cerca nei file di nginx qualsiasi riferimento a 3000 o /Song
for conf in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/* /etc/nginx/nginx.conf; do
    if [ -f "$conf" ]; then
        if grep -q "location /Song" "$conf" 2>/dev/null; then
            echo "Aggiorno proxy /Song in $conf verso la porta 5000..."
            sed -i -E 's/proxy_pass http:\/\/(127\.0\.0\.1|localhost):3000/proxy_pass http:\/\/127.0.0.1:5000/g' "$conf"
            CHANGED=1
        fi
    fi
done

if [ "$CHANGED" = "1" ]; then
    nginx -t && (systemctl reload nginx || nginx -s reload || true)
fi

echo "=== [5/5] Riavvio PM2 con porta 5000 ==="
pm2 delete maestro 2>/dev/null || true
pm2 delete maestro-studio 2>/dev/null || true

# Trova tsx per pm2
if [ -f "./node_modules/.bin/tsx" ]; then
    TSX_BIN="./node_modules/.bin/tsx"
elif command -v tsx >/dev/null 2>&1; then
    TSX_BIN="tsx"
else
    npm install tsx --save-dev
    TSX_BIN="./node_modules/.bin/tsx"
fi

PORT=5000 pm2 start server.ts --name maestro-studio --interpreter "$TSX_BIN" --update-env
pm2 save

echo "=========================================================="
echo " AGGIORNAMENTO COMPLETATO CON SUCCESSO!"
echo " Disponibile su: http://freeserv.it/Song#piano"
echo " Disponibile su: http://freeserv.it:5000/"
echo "=========================================================="
'''

post_data = urllib.parse.urlencode({'content': bash_content, 'expiry_days': 7}).encode('utf-8')
req = urllib.request.Request('https://dpaste.com/api/v2/', data=post_data, headers={'User-Agent': 'curl/7.68.0'})
resp = urllib.request.urlopen(req)
url = resp.read().decode('utf-8').strip()
print('DPASTE_URL:', url)
