const fs = require('fs');
const path = require('path');

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!filePath.includes('node_modules') && !filePath.includes('.git') && !filePath.includes('dist') && !filePath.includes('.aistudio') && !filePath.includes('scripts')) {
        getAllFiles(filePath, fileList);
      }
    } else {
      if (!filePath.endsWith('.log') && !filePath.includes('.DS_Store')) {
        fileList.push(filePath);
      }
    }
  });
  return fileList;
}

const rootDir = process.cwd();
const allPaths = getAllFiles(rootDir);
const fileData = {};

allPaths.forEach(filePath => {
  const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
  if (relPath === 'public/v220_files.json' || relPath === 'public/update_v220.py' || relPath === 'make_v220_json.cjs') return;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    fileData[relPath] = content;
  } catch (e) {}
});

const jsonOutputPath = path.join(rootDir, 'public', 'v220_files.json');
fs.writeFileSync(jsonOutputPath, JSON.stringify(fileData, null, 2), 'utf-8');
console.log('Successfully generated public/v220_files.json, total files:', Object.keys(fileData).length);

const pythonScript = `import os, json, urllib.request, subprocess

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
`;

const pyOutputPath = path.join(rootDir, 'public', 'update_v220.py');
fs.writeFileSync(pyOutputPath, pythonScript, 'utf-8');
console.log('Successfully generated public/update_v220.py');
