with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

idx = text.find('Ultra-compact single-line sub-header')
print(text[idx:idx+1500])
