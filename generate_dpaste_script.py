import subprocess
import base64
import os

print("=== [1/3] Compiling and Bundling ===")
subprocess.run(['rm', '-f', 'dist/frame_1.png', 'dist/frame_2.png', 'dist/frame_3.png'], check=False)
subprocess.run(['npm', 'run', 'build'], check=True)
subprocess.run(['npx', 'esbuild', 'server.ts', '--bundle', '--platform=node', '--format=esm', '--packages=external', '--outfile=server.js'], check=True)

# Remove any test files inside dist
subprocess.run(['rm', '-f', 'dist/frame_1.png', 'dist/frame_2.png', 'dist/frame_3.png'], check=False)

print("=== [2/3] Creating Ultra-Compact Production Archive ===")
p_tar = subprocess.Popen(
    [
        'tar',
        '--exclude=*.png',
        '--exclude=*.mp4',
        '--exclude=*.map',
        '--exclude=dist/assets/aistudio',
        '--exclude=public/assets/aistudio',
        '--exclude=node_modules',
        '--exclude=.git',
        '-cf', '-',
        'package.json',
        'server.js',
        'dist',
        'data'
    ],
    stdout=subprocess.PIPE
)
p_gzip = subprocess.Popen(['gzip', '-9'], stdin=p_tar.stdout, stdout=subprocess.PIPE)
p_tar.stdout.close()
tar_bytes = p_gzip.communicate()[0]
b64_str = base64.b64encode(tar_bytes).decode('utf-8')
print(f"Archive created: {len(tar_bytes)} bytes compressed ({len(b64_str)} base64 chars)")

py_nginx_code = """
import sys
conf_path = sys.argv[1]
with open(conf_path, 'r') as f:
    content = f.read()

song_block = '''
    # App Song sulla porta 5000
    location /Song {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    location /song {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
'''

if 'server_name' in content:
    idx = content.find('server_name')
    semi = content.find(';', idx)
    if semi != -1:
        content = content[:semi+1] + song_block + content[semi+1:]
        with open(conf_path, 'w') as f:
            f.write(content)
        print('Nginx aggiornato.')
"""

bash_script = f"""#!/bin/bash
set -e

echo "=========================================================="
echo "  Aggiornamento Maestro Studio su PORTA 5000 (freeserv.it)"
echo "=========================================================="

cd /root
APP_DIR="/var/www/maestro-studio"
sudo mkdir -p "$APP_DIR"
cd "$APP_DIR"

echo "=== [1/4] Estrazione codice ottimizzato ==="
cat << 'ARCHIVE_EOF' | base64 -d | tar -xzf -
{b64_str}
ARCHIVE_EOF

echo "=== [2/4] Verifica dipendenze di sistema ==="
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

echo "=== [3/4] Configurazione Nginx per freeserv.it (/Song) ==="
NGINX_CONF="/etc/nginx/sites-available/freeserv"
if [ ! -f "$NGINX_CONF" ]; then
    NGINX_CONF=$(grep -l -r "server_name.*freeserv" /etc/nginx/sites-available/ 2>/dev/null | head -n 1 || true)
fi

if [ -n "$NGINX_CONF" ] && [ -f "$NGINX_CONF" ]; then
    if ! grep -q "location /Song" "$NGINX_CONF" && ! grep -q "location /song" "$NGINX_CONF"; then
        sudo python3 -c "{py_nginx_code}" "$NGINX_CONF"
        sudo nginx -t && sudo systemctl reload nginx 2>/dev/null || true
    fi
fi

echo "=== [4/4] Riavvio PM2 su PORTA 5000 ==="
pm2 delete maestro 2>/dev/null || true
pm2 delete maestro-studio 2>/dev/null || true

NODE_ENV=production PORT=5000 pm2 start server.js --name "maestro-studio" --update-env
pm2 save

echo "=========================================================="
echo " SUCCESSO! L'app e' attiva sulla PORTA 5000"
echo " Raggiungibile su: http://freeserv.it/Song"
echo "=========================================================="
exit 0
"""

with open("update_5000_full.sh", "w") as f:
    f.write(bash_script)

print("Saved update_5000_full.sh locally.")

print("=== [3/3] Uploading Script to dpaste.org ===")
p = subprocess.run(
    ['curl', '-sk', '-X', 'POST', 'https://dpaste.org/api/', '--data-urlencode', 'content@update_5000_full.sh', '-d', 'format=url'],
    capture_output=True,
    text=True
)
url = p.stdout.strip()
if url.startswith('http'):
    raw_url = url if url.endswith('/raw') else url + '/raw'
    print("\n" + "="*60)
    print(" COMANDO PER TERMIUS SUL TUO VPS:")
    print(f" curl -sL {raw_url} | bash")
    print("="*60 + "\n")
    with open("latest_command.txt", "w") as f_cmd:
        f_cmd.write(f"curl -sL {raw_url} | bash\n")
else:
    print("Upload error:", p.stdout, p.stderr)
