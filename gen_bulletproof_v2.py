import subprocess, base64, urllib.parse, urllib.request

proc = subprocess.Popen(
    ['tar', '--exclude=node_modules', '-czf', '-', 'package.json', 'tsconfig.json', 'vite.config.ts', 'index.html', 'server.ts', 'dist', 'src'],
    stdout=subprocess.PIPE
)
tar_bytes = proc.communicate()[0]
b64_str = base64.b64encode(tar_bytes).decode('utf-8')

bash_content = f'''#!/bin/bash
set -e

echo "=========================================================="
echo "  Aggiornamento Maestro Studio: Tasti Ingranditi +         "
echo "  Banner 'Premi il tasto' Nitido (Zero Schiacciamento)    "
echo "  Porta 5000 Garantita                                     "
echo "=========================================================="

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

echo "=== [1/4] Estrazione codice aggiornato e dist pre-compilato ==="
cat << 'ARCHIVE_EOF' | base64 -d | tar -xzf -
{b64_str}
ARCHIVE_EOF

echo "=== [2/4] Verifica Porta 5000 in server.ts ==="
sed -i 's/const PORT = .*/const PORT = 5000;/' server.ts

# Se node_modules non esiste o manca tsx, installa
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/tsx" ]; then
    echo "Installazione dipendenze essenziali..."
    npm install --legacy-peer-deps || npm install
fi

echo "=== [3/4] Verifica file di produzione ==="
if [ -f "dist/index.html" ]; then
    echo "Applicazione compilata verificata con successo in dist/ !"
fi

echo "=== [4/4] Riavvio PM2 su Porta 5000 ==="
pm2 delete maestro 2>/dev/null || true
pm2 delete maestro-studio 2>/dev/null || true

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
echo " Oppure diretto su: http://freeserv.it:5000/"
echo "=========================================================="
'''

post_data = urllib.parse.urlencode({'content': bash_content, 'expiry_days': 7}).encode('utf-8')
req = urllib.request.Request('https://dpaste.com/api/v2/', data=post_data, headers={'User-Agent': 'curl/7.68.0'})
resp = urllib.request.urlopen(req)
url = resp.read().decode('utf-8').strip()
print('DPASTE_URL:', url)
