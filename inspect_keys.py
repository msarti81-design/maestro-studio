with open('src/components/PianoView.tsx', 'r') as f:
    text = f.read()

idx = text.find('h-36 sm:h-44 md:h-52')
print('Found new white key class:', idx)
print(text[idx-50:idx+200])

idx_black = text.find('h-22 sm:h-28 md:h-34')
print('Found new black key class:', idx_black)
print(text[idx_black-50:idx_black+200])
