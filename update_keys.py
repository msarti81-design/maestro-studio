with open('src/components/PianoView.tsx', 'r') as f:
    text = f.read()

# Make white keys and black keys taller and more prominent (giving keys more space vs waterfall)
text = text.replace(
    'relative flex-1 h-28 sm:h-36 md:h-44 rounded-b-lg border border-slate-300',
    'relative flex-1 h-36 sm:h-44 md:h-52 rounded-b-lg border border-slate-300'
)

text = text.replace(
    'w-6 sm:w-8 md:w-10 h-16 sm:h-24 md:h-28 rounded-b-md border border-slate-900',
    'w-6 sm:w-8 md:w-10 h-22 sm:h-28 md:h-34 rounded-b-md border border-slate-900'
)

with open('src/components/PianoView.tsx', 'w') as f:
    f.write(text)

print('Updated PianoView keys successfully!')
