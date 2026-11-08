import json, base64, zlib

files = [
    'package.json',
    '.github/workflows/build-apk.yml',
    '.github/workflows/build.yml',
    'src/utils/versionInfo.ts',
    'src/utils/midiParser.ts',
    'src/utils/songPlaybackState.ts',
    'src/components/MidiTrackSelectorModal.tsx',
    'src/components/CanvasPiano.tsx',
    'src/components/FallingNotesWaterfall.tsx'
]

file_data = {}
for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        file_data[path] = f.read()

json_bytes = json.dumps(file_data).encode('utf-8')
compressed_bytes = zlib.compress(json_bytes, level=9)
payload = base64.b64encode(compressed_bytes).decode('utf-8')

cmd = f"""python3 -c "import os,json,base64,zlib;[os.makedirs(os.path.dirname(p),exist_ok=True) if os.path.dirname(p) else None for p in json.loads(zlib.decompress(base64.b64decode('{payload}')).decode('utf-8')).keys()];[open(p,'w',encoding='utf-8').write(c) for p,c in json.loads(zlib.decompress(base64.b64decode('{payload}')).decode('utf-8')).items()];print('Extract v1.0.220 OK!')" """

with open('public/oneliner.txt', 'w', encoding='utf-8') as f:
    f.write(cmd)

print("One-liner length:", len(cmd))
