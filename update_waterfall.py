with open('src/components/FallingNotesWaterfall.tsx', 'r') as f:
    text = f.read()

# Replace header in FallingNotesWaterfall to be ultra-compact
old_jsx = '''  return (
    <div className="flex flex-col w-full bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden shrink-0 my-1">
      {/* Top Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-xs">
        {/* Song info & mode */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>{song.title}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                {song.author}
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              {song.notes.length} note • Difficoltà: <span className="text-amber-400 capitalize">{song.difficulty}</span>
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              setPlayMode('learn');
              handleReset();
            }}
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              playMode === 'learn'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🎓 Impara (Aspetta)
          </button>
          <button
            onClick={() => {
              setPlayMode('arcade');
              handleReset();
            }}
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              playMode === 'arcade'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚡ A Tempo (Arcade)
          </button>
          <button
            onClick={() => {
              setPlayMode('demo');
              handleReset();
            }}
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              playMode === 'demo'
                ? 'bg-purple-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🎧 Demo
          </button>
        </div>

        {/* Score & Combo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[11px] bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Punti:</span>
            <span className="font-bold text-amber-300">{score}</span>
          </div>
          {combo > 1 && (
            <div className="flex items-center gap-1 text-[11px] bg-amber-500/10 text-amber-400 px-2 py-1 rounded-lg font-bold animate-pulse">
              <Zap className="w-3.5 h-3.5" />
              <span>{combo}x COMBO</span>
            </div>
          )}

          {/* Speed selector */}
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <span>Velocità:</span>
            {[0.75, 1.0, 1.25].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-1.5 py-0.5 rounded font-bold ${
                  playbackSpeed === spd ? 'bg-slate-700 text-amber-400' : 'hover:bg-slate-800'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Transport buttons */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            title={isPlaying ? 'Pausa' : 'Riproduci'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            title="Ricomincia"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors ml-1"
            title="Chiudi modalità note dall'alto"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Waterfall Visual Canvas Container */}
      <div ref={containerRef} className="relative w-full h-36 sm:h-52 bg-slate-950 overflow-hidden">'''

new_jsx = '''  return (
    <div className="flex flex-col flex-1 w-full bg-slate-950 overflow-hidden min-h-0">
      {/* Ultra-compact single-line sub-header */}
      <div className="flex items-center justify-between px-2 py-0.5 bg-slate-900/90 border-b border-slate-800 text-[11px] shrink-0 h-6">
        {/* Song info */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-amber-400 truncate max-w-[140px] sm:max-w-[220px]">🎵 {song.title}</span>
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

      {/* Waterfall Visual Canvas Container - Expands dynamically to fill available height */}
      <div ref={containerRef} className="relative flex-1 w-full bg-slate-950 overflow-hidden min-h-0">'''

assert old_jsx in text, "old_jsx not found in FallingNotesWaterfall.tsx"
text = text.replace(old_jsx, new_jsx)

# Also update the bottom progress bar slider to be 100% minimal and slim
old_slider = '''      {/* Bottom Progress Bar Slider */}
      <div className="px-3 py-1 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2">
        <span className="text-[10px] text-slate-400 font-mono w-8">{currentTime.toFixed(1)}s</span>
        <input
          type="range"
          min="0"
          max={songDuration}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
        <span className="text-[10px] text-slate-400 font-mono w-8">{songDuration.toFixed(1)}s</span>
      </div>'''

new_slider = '''      {/* Bottom Progress Bar Slider (Ultra-slim 14px) */}
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
      </div>'''

assert old_slider in text, "old_slider not found in FallingNotesWaterfall.tsx"
text = text.replace(old_slider, new_slider)

with open('src/components/FallingNotesWaterfall.tsx', 'w') as f:
    f.write(text)
print('FallingNotesWaterfall updated successfully!')
