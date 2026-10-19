with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

idx = text.find('hitNotesSetRef.current.add(waitingIdx);')
print(text[idx:idx+400])
