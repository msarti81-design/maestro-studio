#!/bin/bash
set -e
echo "=========================================================="
echo "  DIAGNOSTICA AVANZATA - Maestro Studio (HTTPS White Page)"
echo "=========================================================="

APP_DIR="/var/www/maestro-studio"

echo "=== 1. Stato di PM2 e log recenti ==="
pm2 status
pm2 logs maestro-studio --lines 20 --nostream || true

echo "=== 2. Test HTTP locale su porta 5000 ==="
curl -i http://127.0.0.1:5000/ || echo "Fallito HTTP locale 5000"
curl -i http://127.0.0.1:5000/Song/ || echo "Fallito HTTP locale 5000 /Song/"

echo "=== 3. Ultime righe di Nginx Error Log ==="
sudo tail -n 30 /var/log/nginx/error.log || echo "Impossibile leggere error.log"

echo "=== 4. Test HTTPS locale con curl ==="
curl -sk https://127.0.0.1/Song/ -H "Host: freeserv.it" -I || echo "HTTPS locale fallito"

echo "=== 5. Verifica contenuto cartella dist sul server ==="
if [ -d "$APP_DIR/dist" ]; then
    echo "Contenuto di $APP_DIR/dist:"
    ls -la "$APP_DIR/dist"
    echo "Contenuto di $APP_DIR/dist/assets:"
    ls -la "$APP_DIR/dist/assets" || true
else
    echo "ATTENZIONE: La cartella dist/ non esiste in $APP_DIR!"
fi

echo "=========================================================="
echo "  Fine Diagnostica. Copia/incolla l'output se persiste."
echo "=========================================================="
exit 0
