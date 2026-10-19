with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

# 1. Add waitingTargetNote state
old_state = "const [isCompleted, setIsCompleted] = useState<boolean>(false);"
new_state = """const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [waitingTargetNote, setWaitingTargetNote] = useState<string | null>(null);"""
assert old_state in text, "old_state not found"
text = text.replace(old_state, new_state, 1)

# 2. In learn mode pause:
old_pause = """              if (newTime >= n.time) {
                // Lock at note time until user presses key
                newTime = n.time;
                waitingNoteIndexRef.current = i;
                setIsPlaying(false);
                break;
              }"""

new_pause = """              if (newTime >= n.time) {
                // Lock at note time until user presses key
                newTime = n.time;
                waitingNoteIndexRef.current = i;
                setIsPlaying(false);
                setWaitingTargetNote(n.note);
                break;
              }"""
assert old_pause in text, "old_pause not found"
text = text.replace(old_pause, new_pause, 1)

# 3. In correct note hit unpause:
old_hit = """          hitNotesSetRef.current.add(waitingIdx);
          waitingNoteIndexRef.current = null;"""

new_hit = """          hitNotesSetRef.current.add(waitingIdx);
          waitingNoteIndexRef.current = null;
          setWaitingTargetNote(null);"""
assert old_hit in text, "old_hit not found"
text = text.replace(old_hit, new_hit, 1)

# 4. In handleReset and handleSeek:
old_reset = """    hitNotesSetRef.current.clear();
    waitingNoteIndexRef.current = null;
    setScore(0);"""
new_reset = """    hitNotesSetRef.current.clear();
    waitingNoteIndexRef.current = null;
    setWaitingTargetNote(null);
    setScore(0);"""
assert old_reset in text, "old_reset not found"
text = text.replace(old_reset, new_reset, 1)

old_seek = """    hitNotesSetRef.current.clear();
    waitingNoteIndexRef.current = null;
  };"""
new_seek = """    hitNotesSetRef.current.clear();
    waitingNoteIndexRef.current = null;
    setWaitingTargetNote(null);
  };"""
assert old_seek in text, "old_seek not found"
text = text.replace(old_seek, new_seek, 1)

# 5. Fix canvas DPI handling in resizeCanvas and render
# Currently:
# const resizeCanvas = () => {
#   if (containerRef.current && canvas) {
#     const rect = containerRef.current.getBoundingClientRect();
#     canvas.width = rect.width * window.devicePixelRatio;
#     canvas.height = rect.height * window.devicePixelRatio;
#     ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
#   }
# };
# Every time resizeCanvas was called or if not resetting transform, it causes issues!
# Let's fix resizeCanvas:
old_resize = """    const resizeCanvas = () => {
      if (containerRef.current && canvas) {
        const rect = containerRef.current.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };"""

new_resize = """    const resizeCanvas = () => {
      if (containerRef.current && canvas) {
        const rect = containerRef.current.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }
    };"""
assert old_resize in text, "old_resize not found"
text = text.replace(old_resize, new_resize, 1)

# 6. In render, set transform properly:
old_render_start = """    const render = (now: number) => {
      const dt = (now - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = now;

      const rect = containerRef.current?.getBoundingClientRect();
      const width = rect?.width || 800;
      const height = rect?.height || 260;"""

new_render_start = """    const render = (now: number) => {
      const dt = (now - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = now;

      const rect = containerRef.current?.getBoundingClientRect();
      const width = rect?.width || 800;
      const height = rect?.height || 260;
      const dpr = window.devicePixelRatio || 1;

      // Ensure canvas internal resolution matches CSS display size
      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);"""
assert old_render_start in text, "old_render_start not found"
text = text.replace(old_render_start, new_render_start, 1)

# And at the end of render before requestAnimationFrame:
old_render_end = """      // In learn mode, draw a banner if waiting for note
      if (waitingNoteIndexRef.current !== null && song.notes[waitingNoteIndexRef.current]) {
        const targetNote = song.notes[waitingNoteIndexRef.current].note;
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        const bannerW = 200;
        const bannerH = 34;
        const bannerX = width / 2 - bannerW / 2;
        const bannerY = hitLineY - 55;
        ctx.beginPath();
        ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`👉 PREMI ORA IL TASTO: ${targetNote}`, width / 2, bannerY + bannerH / 2);
        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(render);"""

new_render_end = """      ctx.restore(); // Restore dpr transform

      animationFrameRef.current = requestAnimationFrame(render);"""
assert old_render_end in text, "old_render_end not found"
text = text.replace(old_render_end, new_render_end, 1)

# 7. Add HTML Overlay for the prompt banner right over the hit line
# Let's inspect where the HTML overlays are placed:
old_overlay = """        {/* Live Feedback overlay (PERFECT! / GOOD!) */}
        {feedback && (
          <div
            key={feedback.id}
            className={`absolute top-4 left-1/2 -translate-x-1/2 font-extrabold text-sm sm:text-base pointer-events-none drop-shadow-md animate-bounce ${feedback.color}`}
          >
            {feedback.text}
          </div>
        )}"""

new_overlay = """        {/* Big Crisp Waiting Prompt Banner: Crystal clear, never squished, right above keys */}
        {waitingTargetNote && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center justify-center">
            <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-900/95 border-2 border-amber-400 rounded-full shadow-[0_0_25px_rgba(251,191,36,0.5)] backdrop-blur-md animate-pulse">
              <span className="text-sm font-extrabold text-amber-300 uppercase tracking-wide">
                Premi il tasto:
              </span>
              <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 font-black text-sm rounded-md shadow">
                {waitingTargetNote}
              </span>
            </div>
          </div>
        )}

        {/* Live Feedback overlay (PERFECT! / GOOD!) */}
        {feedback && (
          <div
            key={feedback.id}
            className={`absolute top-4 left-1/2 -translate-x-1/2 font-extrabold text-sm sm:text-base pointer-events-none drop-shadow-md animate-bounce ${feedback.color}`}
          >
            {feedback.text}
          </div>
        )}"""
assert old_overlay in text, "old_overlay not found"
text = text.replace(old_overlay, new_overlay, 1)

with open('src/components/FallingNotesWaterfall.tsx', 'w') as f:
    f.write(text)

print('Successfully patched FallingNotesWaterfall!')
