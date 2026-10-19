#!/bin/bash
set -e

echo "=========================================================="
echo "  Aggiornamento Maestro Studio da Tarball (freeserv.it)"
echo "=========================================================="

APP_DIR="/var/www/maestro-studio"
sudo mkdir -p "$APP_DIR"
sudo chown -R $USER:$USER "$APP_DIR" 2>/dev/null || true
cd "$APP_DIR"

echo "=== [1/4] Scaricamento pacchetto aggiornato ==="
curl -sSL "https://ais-dev-46pafny63lep6zznudwcke-677880673222.europe-west1.run.app/maestro-studio.tar.gz" -o maestro-studio.tar.gz

echo "=== [2/4] Estrazione file ==="
tar -xzf maestro-studio.tar.gz
rm -f maestro-studio.tar.gz

echo "=== [3/4] Installazione dipendenze e build ==="
npm install
npm run build

echo "=== [4/4] Riavvio applicazione ==="
pm2 restart all || pm start

echo "=========================================================="
echo "  Aggiornamento completato con successo!"
echo "=========================================================="
