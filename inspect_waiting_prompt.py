with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

# Let's see if waitingNote is also displayed in HTML/DOM overlay or anywhere else
import re
for m in re.finditer(r'waitingNote', text):
    print(m.start(), text[m.start()-30:m.start()+70])
