with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

# Let's see how waitingNote could be tracked in React state
idx = text.find('const [isCompleted, setIsCompleted] = useState<boolean>(false);')
print(text[idx-200:idx+300])
