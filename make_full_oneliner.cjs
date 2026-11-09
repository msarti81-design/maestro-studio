const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

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
      if (!filePath.endsWith('.log') && !filePath.includes('.DS_Store') && !filePath.endsWith('.tar.gz')) {
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
  if (relPath === 'public/oneliner_v220.txt' || relPath === 'make_full_oneliner.cjs') return;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    fileData[relPath] = content;
  } catch (e) {}
});

const jsonBytes = Buffer.from(JSON.stringify(fileData), 'utf-8');
const compressed = zlib.deflateSync(jsonBytes);
const base64Payload = compressed.toString('base64');

console.log('Total files packed:', Object.keys(fileData).length);
console.log('Payload base64 size:', base64Payload.length);

const pyCode = `import os,json,base64,zlib,subprocess
p = "${base64Payload}"
data = json.loads(zlib.decompress(base64.b64decode(p)).decode('utf-8'))
for path, content in data.items():
    d = os.path.dirname(path)
    if d and not os.path.exists(d): os.makedirs(d, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f: f.write(content)
    print(f"  ✓ {path}")
print("📦 npm install...")
subprocess.run(["npm", "install"], check=True)
print("🔨 npm run build...")
subprocess.run(["npm", "run", "build"], check=True)
print("🔄 pm2 restart...")
subprocess.run(["pm2", "restart", "maestro-studio"], check=False)
subprocess.run(["pm2", "restart", "all"], check=False)
print("✅ AGGIORNAMENTO COMPLETATO!")`;

const oneLinerCommand = `cd /var/www/maestro-studio && python3 -c "${pyCode.replace(/\n/g, '; ')}"`;

fs.writeFileSync(path.join(rootDir, 'public', 'oneliner_v220.txt'), oneLinerCommand, 'utf-8');
console.log('Successfully generated public/oneliner_v220.txt');
