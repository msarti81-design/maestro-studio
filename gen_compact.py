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
echo "  Aggiornamento Maestro Studio: Layout Ultra-Compatto     "
echo "  Massimo spazio a Tastiera e Note a cascata, Menu (...)"
echo "  Porta 5000 dedicata senza interferenze                  "
echo "=========================================================="

APP_DIR="/root/maestro-studio"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

echo "=== [1/5] Estrazione file aggiornati ==="
cat << 'ARCHIVE_EOF' | base64 -d | tar -xzf -
{b64_str}
ARCHIVE_EOF

echo "=== [2/5] Verifica Porta 5000 in server.ts ==="
sed -i 's/const PORT = .*/const PORT = 5000;/' server.ts

echo "=== [3/5] Compilazione Vite ==="
npm run build

echo "=== [4/5] Configurazione Nginx per /Song verso Porta 5000 ==="
NGINX_CONF=$(grep -l -r "location /Song" /etc/nginx/ 2>/dev/null | head -n 1 || true)
if [ -n "$NGINX_CONF" ]; then
    echo "Trovata configurazione Nginx in $NGINX_CONF. Aggiorno proxy a porta 5000..."
    sed -i -E 's/proxy_pass http:\/\/(127\.0\.0\.1|localhost):3000;/proxy_pass http:\/\/127.0.0.1:5000;/' "$NGINX_CONF"
    nginx -t && systemctl reload nginx || nginx -s reload || true
else
    echo "Nessun file Nginx contenente /Song trovato direttamente. Controllo /etc/nginx/sites-enabled/..."
fi

echo "=== [5/5] Riavvio PM2 su Porta 5000 ==="
pm2 delete maestro 2>/dev/null || true
pm2 delete maestro-studio 2>/dev/null || true

PORT=5000 pm2 start server.ts --name maestro-studio --interpreter ./node_modules/.bin/tsx --update-env
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
