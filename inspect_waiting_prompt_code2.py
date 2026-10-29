with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

# Let's see the note press matching in handleKeyPress/lastPlayedNote
idx = text.find('if (playModeRef.current === \'learn\') {')
print(text[idx-100:idx+450])
