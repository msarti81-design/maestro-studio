import os, json, urllib.request, subprocess

print("==========================================")
print("🎹 AGGIORNAMENTO MAESTRO STUDIO v1.0.220")
print("==========================================")

url = "https://ais-dev-46pafny63lep6zznudwcke-677880673222.europe-west1.run.app/v220_files.json"
print("⬇️ Download file aggiornati da AI Studio...")

try:
    req = urllib.request.urlopen(url)
    data = json.loads(req.read().decode('utf-8'))
except Exception as e:
    print(f"❌ Errore download: {e}")
    exit(1)

for rel_path, content in data.items():
    dir_name = os.path.dirname(rel_path)
    if dir_name and not os.path.exists(dir_name):
        os.makedirs(dir_name, exist_ok=True)
    with open(rel_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  ✓ Aggiornato: {rel_path}")

print("📦 Installazione dipendenze npm...")
subprocess.run(["npm", "install"], check=True)

print("🔨 Compilazione applicazione (Vite build & server)...")
subprocess.run(["npm", "run", "build"], check=True)

print("🔄 Riavvio servizio PM2 (maestro-studio)...")
subprocess.run(["pm2", "restart", "maestro-studio"], check=False)
subprocess.run(["pm2", "restart", "all"], check=False)

print("==========================================")
print("✅ AGGIORNAMENTO MAESTRO STUDIO COMPLETATO!")
print("==========================================")
