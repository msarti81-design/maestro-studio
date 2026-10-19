with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

idx_scale = text.find('ctx.scale')
print('scale:', text[idx_scale-50:idx_scale+100])

idx_resize = text.find('const resizeCanvas')
print('resizeCanvas full:')
print(text[idx_resize:idx_resize+350])
