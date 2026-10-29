#!/bin/bash
set -e

echo "=========================================================="
echo "  MAESTRO STUDIO: DIRECT PUSH CON TOKEN CONFIGURATO       "
echo "=========================================================="

APP_DIR="/var/www/maestro-studio"
if [ ! -d "$APP_DIR" ]; then
    APP_DIR="/root/maestro-studio"
fi

cd "$APP_DIR"

# Token inserito direttamente per evitare problemi di input interattivo su mobile/Termius
GITHUB_TOKEN="ghp_vostrotokenreale"

echo "Configurazione remote con token..."
git remote set-url origin https://${GITHUB_TOKEN}@github.com/msarti81-design/maestro-studio.git
git config user.name "msarti81-design"
git config user.email "msarti81@gmail.com"

echo "Commit e Push automatico..."
git add -A .
git commit -m "Fix: AudioEngine direct-path pristine acoustic piano sound" || echo "Nulla da committare."
git push -u origin main || git push -u origin master

echo "----------------------------------------------------------"
echo " ✓ FATTO! I sorgenti sono su GitHub e l'APK è in compilazione!"
echo "----------------------------------------------------------"
