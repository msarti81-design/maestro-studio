with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

idx_inner = text.find('// Clear background')
print(text[idx_inner-100:idx_inner+600])
