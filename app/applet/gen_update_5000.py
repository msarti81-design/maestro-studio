import os
import tarfile
import base64
import io

output_script = "update_5000_full.sh"
target_dir = "."

print("Creating tar.gz archive in memory...")
tar_buffer = io.BytesIO()
with tarfile.open(fileobj=tar_buffer, mode="w:gz") as tar:
    for root, dirs, files in os.walk(target_dir):
        dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', 'dist', '.aistudio', 'tmp']]
        for file in files:
            if file in [output_script, 'deploy_5000.sh', 'update.sh', 'gen_update_5000.py']:
                continue
            full_path = os.path.join(root, file)
            arcname = os.path.relpath(full_path, target_dir)
            tar.add(full_path, arcname=arcname)

tar_bytes = tar_buffer.getvalue()
tar_b64 = base64.b64encode(tar_bytes).decode('utf-8')

# Wrap lines at 76 chars
wrapped_b64 = "\n".join([tar_b64[i:i+76] for i in range(0, len(tar_b64), 76)])

script_content = f"""#!/bin/bash
set -e
echo "=========================================================="
echo "  Aggiornamento Maestro Studio su PORTA 5000 (freeserv.it)"
echo "=========================================================="

APP_DIR="/var/www/maestro-studio"
sudo mkdir -p "$APP_DIR"
sudo chown -R $USER:$USER "$APP_DIR"
cd "$APP_DIR"

echo "=== [1/5] Estrazione codice aggiornato ==="
python3 - << 'PY_EXTRACT'
import base64, tarfile, io

b64_data = \"\"\"
{wrapped_b64}
\"\"\"

print("Decodifica ed estrazione archivio in corso...")
tar_bytes = base64.b64decode(b64_data.strip())
with tarfile.open(fileobj=io.BytesIO(tar_bytes), mode="r:gz") as tar:
    tar.extractall('.')
print("Estrazione completata con successo.")
PY_EXTRACT

echo "=== [2/5] Installazione / Verifica dipendenze Node.js ==="
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

if [ ! -d "node_modules" ]; then
    npm install
fi

echo "=== [3/5] Configurazione Nginx per /Song e /song su porta 5000 ==="
NGINX_CONF="/etc/nginx/sites-available/freeserv"
sudo bash -c "cat > $NGINX_CONF" << 'EOF'
server {
    listen 80;
    server_name freeserv.it www.freeserv.it;

    location /Song {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /song {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/freeserv /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "=== [4/5] Riavvio PM2 su PORTA 5000 ==="
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

pm2 delete maestro 2>/dev/null || true
pm2 delete maestro-studio 2>/dev/null || true
PORT=5000 pm2 start server.ts --interpreter tsx --name "maestro-studio" --update-env
pm2 save

echo "=========================================================="
echo " SUCCESSO! L'app è attiva sulla PORTA 5000"
echo " Raggiungibile su: http://freeserv.it/Song"
echo "=========================================================="
exit 0
"""

with open(output_script, "w") as f:
    f.write(script_content)

print(f"Generated {output_script} successfully with self-contained Python extraction.")
