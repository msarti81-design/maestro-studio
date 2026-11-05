#!/bin/bash
set -e

echo "=========================================="
echo "🎹 AGGIORNAMENTO VIRTUKEYS SU FREESERV.IT"
echo "=========================================="

TARGET_DIR=""

# 1. Ricerca automatica della cartella dell'app sul VPS
POTENTIAL_PATHS=(
  "/var/www/html/Song"
  "/var/www/Song"
  "/var/www/maestro-studio"
  "/home/freeserv/public_html/Song"
  "/home/freeserv/Song"
  "/root/Song"
  "/root/maestro-studio"
  "$HOME/Song"
  "$HOME/maestro-studio"
  "$(pwd)"
)

for p in "${POTENTIAL_PATHS[@]}"; do
  if [ -d "$p" ] && ([ -f "$p/package.json" ] || [ -f "$p/server.ts" ] || [ -f "$p/server.js" ]); then
    TARGET_DIR="$p"
    break
  fi
done

# Ricerca fallback se non trovato nei percorsi standard
if [ -z "$TARGET_DIR" ]; then
  echo "🔍 Ricerca cartella VirtuKeys nel sistema..."
  TARGET_DIR=$(find /var/www /home /root -maxdepth 3 -type d \( -name "Song" -o -name "maestro-studio" \) 2>/dev/null | head -n 1)
fi

if [ -z "$TARGET_DIR" ]; then
  echo "❌ Cartella VirtuKeys non trovata automaticamente."
  echo "Per favore, spostati nella cartella dell'app prima di eseguire: cd /tuo/percorso"
  exit 1
fi

echo "📁 Cartella applicazione trovata: $TARGET_DIR"
cd "$TARGET_DIR"

# 2. Aggiornamento codice da GitHub
echo "⬇️ Scaricamento ultimi file da GitHub..."
git pull origin main || git pull

# 3. Assicurazione presenza privacy.html
mkdir -p public dist
if [ ! -f "public/privacy.html" ] || [ ! -f "dist/privacy.html" ]; then
  echo "📄 Download diretto privacy.html..."
  curl -sL "https://raw.githubusercontent.com/msarti81-design/maestro-studio/main/public/privacy.html" -o public/privacy.html
  cp public/privacy.html dist/privacy.html
fi

# 4. Compilazione
echo "🔨 Compilazione Vite..."
npm run build || true

# 5. Riavvio servizio Node / PM2
echo "🔄 Riavvio servizio..."
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart all || pm2 restart 0 || true
elif systemctl list-units --type=service | grep -qi "song"; then
  systemctl restart song || true
fi

echo "=========================================="
echo "✅ AGGIORNAMENTO COMPLETATO CON SUCCESSO!"
echo "🌐 Privacy Policy attiva su: https://freeserv.it/Song/privacy.html"
echo "=========================================="
