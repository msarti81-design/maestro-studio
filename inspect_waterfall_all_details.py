with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

# Let's inspect hit line and key guide lines
idx = text.find('// Target line is at 88% of canvas height')
print(text[idx-50:idx+600])
