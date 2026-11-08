const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!filePath.includes('node_modules') && !filePath.includes('.git') && !filePath.includes('dist') && !filePath.includes('.aistudio')) {
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
  // Skip output updater script itself to avoid infinite recursion
  if (relPath === 'public/update_v220.py' || relPath.startsWith('scripts/make_')) return;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    fileData[relPath] = content;
  } catch (e) {
    // binary or unreadable
  }
});

const jsonStr = JSON.stringify(fileData);
const compressed = zlib.deflateSync(Buffer.from(jsonStr, 'utf-8'));
const base64Payload = compressed.toString('base64');

const pythonScript = `import os, json, base64, zlib, subprocess

print("==========================================")
print("🎹 AGGIORNAMENTO MAESTRO STUDIO v1.0.220")
print("==========================================")

payload = "${base64Payload}"

print("📦 Decompressione e scrittura file in corso...")
compressed_bytes = base64.b64decode(payload)
json_bytes = zlib.inflate(compressed_bytes)
data = json.loads(json_bytes.decode('utf-8'))

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

const outputPath = path.join(rootDir, 'public', 'update_v220.py');
fs.writeFileSync(outputPath, pythonScript, 'utf-8');
console.log('Successfully generated public/update_v220.py, size:', pythonScript.length);
