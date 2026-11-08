import os, json, base64, zlib

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

py_script = f"""import os, json, base64, zlib

payload = "{payload}"
decompressed = zlib.decompress(base64.b64decode(payload))
data = json.loads(decompressed.decode('utf-8'))

for file_path, content in data.items():
    dir_name = os.path.dirname(file_path)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {{file_path}}")

print("All v1.0.220 files updated successfully!")
"""

with open('public/v220_update.py', 'w', encoding='utf-8') as f:
    f.write(py_script)

print("Created compressed public/v220_update.py, size:", len(py_script))
