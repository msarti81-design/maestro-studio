with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

# Let's inspect where waitingNoteIndexRef is updated
idx = 0
while True:
    pos = text.find('waitingNoteIndexRef.current =', idx)
    if pos == -1: break
    print(text[pos-100:pos+150])
    print('---')
    idx = pos + 1
