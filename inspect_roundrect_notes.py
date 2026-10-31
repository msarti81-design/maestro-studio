with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

idx = text.find('roundRect(')
while idx != -1:
    print(text[idx-30:idx+80])
    print('---')
    idx = text.find('roundRect(', idx+1)
