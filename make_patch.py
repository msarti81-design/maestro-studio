import tarfile, base64, io

files_to_pack = [
    'src/utils/versionInfo.ts',
    'src/components/FallingNotesWaterfall.tsx',
    'src/components/CanvasPiano.tsx',
    'src/components/MidiTrackSelectorModal.tsx',
    'src/utils/midiParser.ts',
    'src/utils/songPlaybackState.ts',
    '.github/workflows/build-apk.yml',
    '.github/workflows/build.yml',
    'package.json'
]

buf = io.BytesIO()
with tarfile.open(fileobj=buf, mode='w:gz') as tar:
    for f in files_to_pack:
        tar.add(f)

b64_data = base64.b64encode(buf.getvalue()).decode('utf-8')

script = f"""cd /var/www/maestro-studio && python3 -c "
import base64, tarfile, io
data = base64.b64decode('{b64_data}')
with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as tar:
    tar.extractall()
print('Extract v1.0.220 success!')
" && git add . && git commit -m "Update v1.0.220 with waterfall colors & demo key sync" && git push origin main --force && npm run build && pm2 restart maestro-studio
"""

with open('public/install_v220.sh', 'w') as out:
    out.write(script)

print("Created public/install_v220.sh, size:", len(script))
