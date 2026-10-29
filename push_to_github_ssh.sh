#!/bin/bash
set -e

echo "=========================================================="
echo "  MAESTRO STUDIO: GITHUB DEPLOYMENT HELPER (SSH KEY)      "
echo "=========================================================="

APP_DIR="/var/www/maestro-studio"
if [ ! -d "$APP_DIR" ]; then
    APP_DIR="/root/maestro-studio"
fi

if [ ! -d "$APP_DIR" ]; then
    echo "❌ Errore: Cartella dell'applicazione non trovata in /var/www/maestro-studio o /root/maestro-studio"
    exit 1
fi

cd "$APP_DIR"

echo "=== [1/3] Configurazione Git Remote con SSH ==="
# Imposta l'URL di GitHub in formato SSH (evita di chiedere password/token se hai una chiave SSH configurata su Aruba)
git remote set-url origin git@github.com:msarti81-design/maestro-studio.git || git remote add origin git@github.com:msarti81-design/maestro-studio.git

git config user.name "msarti81-design"
git config user.email "msarti81@gmail.com"

echo "=== [2/3] Commit delle ultime modifiche audio ==="
git add -A .
git commit -m "Fix: AudioEngine direct path pristine sound & update ($(date '+%Y-%m-%d %H:%M:%S'))" || echo "Nessuna nuova modifica da committare."

echo "=== [3/3] Push su GitHub via SSH ==="
if git push -u origin main || git push -u origin master; then
    echo "----------------------------------------------------------"
    echo " ✓ PUSH ESEGUITO CON SUCCESSO SU GITHUB!"
    echo " ✓ La GitHub Action compilerà automaticamente l'APK."
    echo "----------------------------------------------------------"
else
    echo ""
    echo "⚠️ ATTENZIONE: Git ha richiesto l'autenticazione SSH."
    echo "Se non hai ancora associato la chiave SSH di Aruba su GitHub, fai così:"
    echo "1. Copia questa chiave pubblica sul server eseguendo:"
    echo "   cat ~/.ssh/id_rsa.pub"
    echo "2. Incollala su GitHub in Settings -> SSH and GPG keys -> New SSH key."
    echo "3. Rilancia questo script."
    echo ""
    echo "Oppure, se preferisci usare un Personal Access Token (PAT) via HTTPS:"
    echo "   git remote set-url origin https://<TUO_TOKEN>@github.com/msarti81-design/maestro-studio.git"
    echo "   git push -u origin main"
    exit 1
fi
