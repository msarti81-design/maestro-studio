with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

# Let's inspect where roundRect is used and add a polyfill/helper function
idx = text.find('const canvas = canvasRef.current;')
print(text[idx-200:idx+300])
