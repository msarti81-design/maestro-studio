#!/bin/bash
set -e

echo "=========================================================="
echo "  MAESTRO STUDIO: TOKEN-BASED GITHUB PUSH                 "
echo "=========================================================="

APP_DIR="/var/www/maestro-studio"
if [ ! -d "$APP_DIR" ]; then
    APP_DIR="/root/maestro-studio"
fi

if [ ! -d "$APP_DIR" ]; then
    echo "❌ Errore: Cartella dell'applicazione non trovata."
    exit 1
fi

cd "$APP_DIR"

echo ""
echo "Inserisci il tuo GitHub Personal Access Token (PAT):"
read -s GITHUB_TOKEN

if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ Token non inserito. Annullato."
    exit 1
fi

echo "Configurazione remote con autenticazione via Token..."
git remote set-url origin https://${GITHUB_TOKEN}@github.com/msarti81-design/maestro-studio.git
git config user.name "msarti81-design"
git config user.email "msarti81@gmail.com"

echo "Preparazione commit..."
git add -A .
git commit -m "Fix: AudioEngine direct-path pristine acoustic piano sound ($(date '+%Y-%m-%d %H:%M:%S'))" || echo "Nessuna nuova modifica da committare."

echo "Invio dei sorgenti su GitHub (push)..."
git push -u origin main || git push -u origin master

echo "----------------------------------------------------------"
echo " ✓ PUSH ESEGUITO CON SUCCESSO!"
echo " ✓ La GitHub Action è ora in esecuzione per compilare l'APK!"
echo "----------------------------------------------------------"
