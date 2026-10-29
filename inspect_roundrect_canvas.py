with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

idx = text.find('roundRect')
print('Remaining roundRect occurrences:')
while idx != -1:
    print(text[idx-30:idx+60])
    idx = text.find('roundRect', idx+1)
