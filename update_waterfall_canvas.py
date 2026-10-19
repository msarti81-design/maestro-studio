with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

# Let's inspect the canvas drawing and DPI handling
idx_setup = text.find('const resizeCanvas = () => {')
print('resizeCanvas code:')
print(text[idx_setup:idx_setup+500])

