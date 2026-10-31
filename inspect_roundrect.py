with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

# Let's see how roundRect is called across the file
idx = 0
while True:
    pos = text.find('.roundRect', idx)
    if pos == -1: break
    print(text[pos-40:pos+80])
    idx = pos + 1
