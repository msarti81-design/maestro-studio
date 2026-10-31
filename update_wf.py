with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

start_str = 'return (\n    <div className="flex flex-col w-full bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden shrink-0 my-1">'
end_marker = '{/* Waterfall Visual Canvas Container */}\n      <div ref={containerRef} className="relative w-full h-36 sm:h-52 bg-slate-950 overflow-hidden">'

p1 = text.find(start_str)
p2 = text.find(end_marker)
assert p1 != -1 and p2 != -1

new_header = '''return (
    <div className="flex flex-col flex-1 w-full bg-slate-950 overflow-hidden min-h-0">
      {/* Ultra-compact single-line sub-header */}
      <div className="flex items-center justify-between px-2 py-0.5 bg-slate-900/90 border-b border-slate-800 text-[11px] shrink-0 h-7">
        {/* Song info */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-amber-400 truncate max-w-[130px] sm:max-w-[200px]">🎵 {song.title}</span>
          <span className="text-[10px] text-slate-400 hidden sm:inline">• {song.author}</span>
        </div>

        {/* Compact Mode & Transport buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center bg-slate-950 rounded border border-slate-800 p-0.5">
            <button
              onClick={() => { setPlayMode('learn'); handleReset(); }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${playMode === 'learn' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
              title="Aspetta che premi il tasto corretto"
            >
              Impara
            </button>
            <button
              onClick={() => { setPlayMode('arcade'); handleReset(); }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${playMode === 'arcade' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'}`}
              title="A tempo in tempo reale"
            >
              Arcade
            </button>
            <button
              onClick={() => { setPlayMode('demo'); handleReset(); }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${playMode === 'demo' ? 'bg-purple-500 text-white' : 'text-slate-400'}`}
              title="Ascolta demo automatica"
            >
              Demo
            </button>
          </div>

          <div className="text-[10px] font-bold text-amber-300 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
            {score} pts
          </div>
          {combo > 1 && (
            <span className="text-[10px] font-bold text-amber-400 animate-pulse hidden sm:inline">
              {combo}x
            </span>
          )}

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 hover:bg-slate-800 text-slate-200 rounded transition-colors"
            title={isPlaying ? 'Pausa' : 'Riproduci'}
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          <button
            onClick={handleReset}
            className="p-1 hover:bg-slate-800 text-slate-200 rounded transition-colors"
            title="Ricomincia"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded transition-colors"
            title="Chiudi spartito a cascata"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Waterfall Visual Canvas Container - dynamically fills available flex height */}
      <div ref={containerRef} className="relative flex-1 w-full bg-slate-950 overflow-hidden min-h-0">'''

text = text[:p1] + new_header + text[p2 + len(end_marker):]

# Update slider
slider_idx = text.find('{/* Bottom Progress Bar Slider */}')
if slider_idx != -1:
    end_slider_idx = text.find('</div>\n    </div>\n  );', slider_idx)
    new_slider = '''{/* Bottom Progress Bar Slider (Ultra-slim 14px) */}
      <div className="px-2 py-0.5 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5 shrink-0 h-4">
        <span className="text-[9px] text-slate-400 font-mono">{currentTime.toFixed(1)}s</span>
        <input
          type="range"
          min="0"
          max={songDuration}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-amber-500"
        />
        <span className="text-[9px] text-slate-400 font-mono">{songDuration.toFixed(1)}s</span>
      '''
    text = text[:slider_idx] + new_slider + text[end_slider_idx:]

with open('src/components/FallingNotesWaterfall.tsx', 'w') as f:
    f.write(text)
print('WF updated!')
