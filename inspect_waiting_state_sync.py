with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

# Let's see all state variables at top of component
idx = text.find('const [playMode')
print(text[idx:idx+1000])
