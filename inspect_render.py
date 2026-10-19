with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

idx = text.find('const render = (now: number)')
print(text[idx:idx+800])
