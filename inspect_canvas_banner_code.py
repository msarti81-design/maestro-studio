with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

idx = text.find('// In learn mode, draw a banner if waiting for note')
print(text[idx:idx+900])
