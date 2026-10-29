with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

idx = text.find('if (waitingNoteIndexRef.current !== null && song.notes[waitingNoteIndexRef.current])')
print(text[idx:idx+900])
