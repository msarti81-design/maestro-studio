import os
import subprocess
import base64
import urllib.request
import urllib.parse
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

print("=== [1/3] Compilazione applicazione (Vite) ===")
subprocess.run(["npm", "run", "build"], check=True)

print("=== [2/3] Creazione archivio compresso di tutto il progetto ===")
proc = subprocess.Popen(
    ['tar', '--exclude=node_modules', '-czf', '-', '.github', 'scripts', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'capacitor.config.json', 'index.html', 'server.ts', 'server.js', 'dist', 'src', 'public'],
    stdout=subprocess.PIPE
)
tar_bytes = proc.communicate()[0]
b64_str = base64.b64encode(tar_bytes).decode('utf-8')

bash_script = f"""#!/bin/bash
set -e

echo "=========================================================="
echo "  MAESTRO STUDIO: BUILD APK & GITHUB ACTIONS SYNC         "
echo "  Target Repo: msarti81-design / maestro-studio           "
echo "=========================================================="

if [ -d "/var/www/maestro-studio" ]; then
    APP_DIR="/var/www/maestro-studio"
elif [ -d "/root/maestro-studio" ]; then
    APP_DIR="/root/maestro-studio"
elif [ -d "/home/maestro-studio" ]; then
    APP_DIR="/home/maestro-studio"
else
    APP_DIR="/var/www/maestro-studio"
fi

mkdir -p "$APP_DIR"
cd "$APP_DIR"

echo "=== [1/4] Estrazione del codice sorgente aggiornato e Workflow GitHub ==="
cat << 'ARCHIVE_EOF' | base64 -d | tar -xzf -
{b64_str}
ARCHIVE_EOF
echo "OK: File estratti con successo."

echo "=== [2/4] Configurazione Git e Push su GitHub ==="
if command -v git &> /dev/null; then
    if [ ! -d ".git" ]; then
        git init
        git branch -M main 2>/dev/null || true
    fi
    git config user.name >/dev/null 2>&1 || git config user.name "msarti81-design"
    git config user.email >/dev/null 2>&1 || git config user.email "msarti81@gmail.com"

    CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || true)
    if [ -z "$CURRENT_REMOTE" ]; then
        echo "Impostazione remote origin a https://github.com/msarti81-design/maestro-studio.git..."
        git remote add origin https://github.com/msarti81-design/maestro-studio.git
    fi

    git add -A .
    COMMIT_MSG="Feat: Build APK Android + Canvas GPU Waterfall + Mano Dx/Sx ($(date '+%Y-%m-%d %H:%M:%S'))"
    if git commit -m "$COMMIT_MSG" 2>/dev/null; then
        echo "OK: Commit Git creato."
    else
        echo "Nota: File gia allineati all'ultimo commit."
    fi

    echo "Push delle modifiche su GitHub (branch main)..."
    if git push -u origin main 2>/dev/null || git push origin main 2>/dev/null || git push -u origin master 2>/dev/null || git push 2>/dev/null; then
        echo "----------------------------------------------------------"
        echo " ✓ PUSH SU GITHUB ESEGUITO CON SUCCESSO!"
        echo " ✓ LA GITHUB ACTION PER LA COMPILAZIONE DELL'APK E PARTITA!"
        echo "----------------------------------------------------------"
    else
        echo "⚠️ Se GitHub richiede credenziali o token per il push:"
        echo "Esegui semplicemente:"
        echo "  cd $APP_DIR"
        echo "  git push origin main"
    fi
fi

echo "=== [3/4] Aggiornamento servizio WebApp (Porta 5000) ==="
if command -v pm2 &> /dev/null; then
    pm2 delete maestro-studio 2>/dev/null || true
    PORT=5000 pm2 start server.js --name "maestro-studio" --cwd "$APP_DIR"
    pm2 save 2>/dev/null || true
    echo "OK: WebApp riavviata."
fi

echo "=========================================================="
echo "  TUTTO PRONTO!"
echo "  1. Vai su: https://github.com/msarti81-design/maestro-studio/actions"
echo "  2. Troverai il workflow 'Build Android APK' attivo."
echo "     (Puoi anche cliccare 'Run workflow' se desideri rigenerarlo in qualsiasi momento)"
echo "  3. Al termine della compilazione automatica troverai il file APK:"
echo "     'Maestro-Piano-Studio-APK' pronto da scaricare e installare!"
echo "=========================================================="
"""

print("=== [3/3] Caricamento script su dpaste.org per esecuzione diretta ===")
try:
    post_data = urllib.parse.urlencode({'content': bash_script, 'format': 'url'}).encode('utf-8')
    req = urllib.request.Request('https://dpaste.org/api/', data=post_data, headers={'User-Agent': 'curl/7.68.0'})
    with urllib.request.urlopen(req) as resp:
        url = resp.read().decode('utf-8').strip()
        raw_url = url if url.endswith('/raw') else url + '/raw'
        print("\n" + "="*60)
        print(" COMANDO DA INCOLLARE SUL TUO SERVER (TERMIUS / SSH):")
        print(f" curl -sL {raw_url} | bash")
        print("="*60 + "\n")
        with open("latest_command.txt", "w") as f_cmd:
            f_cmd.write(f"curl -sL {raw_url} | bash\n")
except Exception as e:
    print("Errore upload dpaste:", e)
