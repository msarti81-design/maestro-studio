with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

idx = text.rfind('<canvas')
print(text[idx-100:idx+350])
