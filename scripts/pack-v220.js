import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPartScript(files, partNum) {
  const bundle = {};
  for (const f of files) {
    if (fs.existsSync(f)) {
      bundle[f] = fs.readFileSync(f, 'utf8');
    }
  }
  const jsonStr = JSON.stringify(bundle);
  const compressed = zlib.deflateSync(Buffer.from(jsonStr, 'utf8'), { level: 9 });
  const b64 = compressed.toString('base64');
  const wrappedB64 = b64.match(/.{1,76}/g).join('\\\n');

  return `import os, json, base64, zlib

payload = "${wrappedB64}"

data = json.loads(zlib.decompress(base64.b64decode(payload)).decode('utf-8'))
for filepath, content in data.items():
    dirname = os.path.dirname(filepath)
    if dirname:
        os.makedirs(dirname, exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
print("Parte ${partNum} aggiornata con successo! (" + str(len(data)) + " file)")
`;
}

const part1Files = [
  'src/utils/versionInfo.ts',
  'src/utils/songPlaybackState.ts',
  'package.json',
  '.github/workflows/build-apk.yml',
  '.github/workflows/build.yml',
  'server.ts'
];

const part2Files = [
  'src/utils/midiParser.ts',
  'src/components/MidiTrackSelectorModal.tsx',
  'src/components/FallingNotesWaterfall.tsx',
  'src/components/CanvasPiano.tsx'
];

fs.writeFileSync('public/part1.py', createPartScript(part1Files, 1));
fs.writeFileSync('public/part2.py', createPartScript(part2Files, 2));

console.log('Created public/part1.py and public/part2.py');
