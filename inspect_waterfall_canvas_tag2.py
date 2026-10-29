with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

idx = text.rfind('<canvas')
print(text[idx:idx+1200])
