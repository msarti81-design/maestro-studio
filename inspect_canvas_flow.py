with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

idx_start = text.find('const resizeCanvas = () => {')
idx_end = text.find('window.removeEventListener(\'resize\', resizeCanvas);')
print(text[idx_start:idx_start+800])
print('...')
print(text[idx_end-400:idx_end+200])
