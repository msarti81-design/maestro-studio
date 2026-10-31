with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

idx1 = text.find('const resizeCanvas = () => {')
idx2 = text.find('// Target line is at 88% of canvas height')
print(text[idx1:idx2+150])
