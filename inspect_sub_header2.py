with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

idx = text.find('Ultra-compact single-line sub-header')
print(text[idx+1400:idx+2500])
