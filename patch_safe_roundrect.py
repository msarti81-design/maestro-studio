with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

# Add a helper for safe rounded rectangle so older mobile browsers won't crash or distort
old_block = """          // Note pill
          ctx.beginPath();
          ctx.roundRect(noteX, yTop, noteWidth, noteHeight, 6);
          ctx.fill();"""

new_block = """          // Note pill
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(noteX, yTop, noteWidth, noteHeight, 6);
          } else {
            ctx.rect(noteX, yTop, noteWidth, noteHeight);
          }
          ctx.fill();"""

text = text.replace(old_block, new_block)

with open('src/components/FallingNotesWaterfall.tsx', 'w') as f:
    f.write(text)

print('Updated safe rounded rectangle!')
