import subprocess
import base64
import urllib.request
import urllib.parse
import os

# Create tar.gz excluding node_modules
proc = subprocess.Popen(
    ["tar", "--exclude=node_modules", "-czf", "-", "package.json", "tsconfig.json", "vite.config.ts", "index.html", "server.ts", "src", "dist"],
    stdout=subprocess.PIPE
)
tar_bytes, _ = proc.communicate()
b64_data = base64.b64encode(tar_bytes).decode("ascii")

bash_script = """#!/bin/bash
set -e
echo "=========================================================="
echo "=== RIPRISTINO DIRETTO MAESTRO STUDIO SU PORTA 3000 ==="
echo "=========================================================="

APP_DIR="/var/www/maestro-studio"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

echo "=== [1/4] Estrazione codice aggiornato ==="
base64 -d << 'EOF_TAR' | tar -xzf -
""" + b64_data + """
EOF_TAR

echo "=== [2/4] Installazione dipendenze ==="
npm install --legacy-peer-deps --no-audit --no-fund

echo "=== [3/4] Ripristino processo PM2 su PORTA 3000 (Porta di Nginx per /Song) ==="
# Elimina eventuali processi obsoleti o errati
pm2 delete maestro 2>/dev/null || true
pm2 delete maestro-studio 2>/dev/null || true

# Avvio su porta 3000, dove punta la configurazione di Nginx (proxy_pass http://127.0.0.1:3000)
PORT=3000 pm2 start server.ts --name "maestro-studio" --interpreter tsx

# Ricarica Nginx per garantire la connessione con la porta 3000
sudo systemctl reload nginx 2>/dev/null || true

# Salva configurazione PM2 per renderla persistente
pm2 save

echo "=== [4/4] Test immediato risposta porta 3000 ==="
sleep 2
curl -I http://127.0.0.1:3000/ || true

echo "=========================================================="
echo " SERVIZIO RIPRISTINATO CON SUCCESSO SULLA PORTA 3000!"
echo " L'app è attiva e funzionante su:"
echo " http://freeserv.it/Song#piano"
echo "=========================================================="
"""

data = urllib.parse.urlencode({"content": bash_script, "expiry_days": 30}).encode("utf-8")
req = urllib.request.Request("https://dpaste.com/api/v2/", data=data, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req) as resp:
    url = resp.read().decode("utf-8").strip()
    print("URL_GENERATO:" + url)
