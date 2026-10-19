with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

# Let's see the learn mode pause detection:
idx = text.find('if (newTime >= n.time) {')
print(text[idx-200:idx+350])
