with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

# Let's inspect where keys[idx] or note labels are drawn inside the waterfall canvas
idx = text.find('ctx.fillText')
while idx != -1:
    print('fillText at:', idx, repr(text[idx-40:idx+80]))
    idx = text.find('ctx.fillText', idx+1)
