with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

# Let's inspect from canvas setup to end of useEffect
idx1 = text.find('const canvas = canvasRef.current;')
idx2 = text.find('}, [song, songDuration, numWhiteKeys, getKeyPosition, getTransposedNote]);')
print(text[idx1:idx1+1200])
print('=== MIDDLE TO END ===')
print(text[idx2-1000:idx2+80])
