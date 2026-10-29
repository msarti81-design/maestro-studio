with open('src/components/PianoView.tsx', 'r') as f:
    text = f.read()

# 1. Update lucide-react imports to include MoreHorizontal, Settings, X, Sliders
old_import = "import {\n  Play,\n  RotateCcw,\n  Volume2,\n  Plus,\n  Minus,\n  Home,\n  Music,\n  Maximize,\n  Minimize,\n  Smartphone,\n  BookOpen,\n  User,\n  Sparkles,\n  Share2,\n  HardDrive,\n  Save,\n  Check,\n} from 'lucide-react';"

new_import = """import {
  Play,
  RotateCcw,
  Volume2,
  Plus,
  Minus,
  Home,
  Music,
  Maximize,
  Minimize,
  Smartphone,
  BookOpen,
  User,
  Sparkles,
  Share2,
  HardDrive,
  Save,
  Check,
  MoreHorizontal,
  Settings,
  X,
  Sliders,
} from 'lucide-react';"""

assert old_import in text, "old_import not found"
text = text.replace(old_import, new_import)

# 2. Add state for options modal
old_state = "  const [isPlayingRecording, setIsPlayingRecording] = useState<boolean>(false);"
new_state = """  const [isPlayingRecording, setIsPlayingRecording] = useState<boolean>(false);
  // Options / Settings Modal (3 puntini ...)
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState<boolean>(false);"""

assert old_state in text, "old_state not found"
text = text.replace(old_state, new_state)

# 3. Replace the return JSX starting from line containerStyle up to SongLibraryModal
idx_start = text.find("const isRotated = isPortrait && forceLandscape;")
assert idx_start != -1, "idx_start not found"

marker_end = "{/* Song Library & Creator Modal */}\n      <SongLibraryModal"
idx_end = text.find(marker_end)
assert idx_end != -1, "marker_end not found"

new_jsx = """const isRotated = isPortrait && forceLandscape;
  const containerStyle: React.CSSProperties = isRotated
    ? {
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: '100vh',
        height: '100vw',
        transform: 'translate(-50%, -50%) rotate(90deg)',
        transformOrigin: 'center center',
        zIndex: 50,
      }
    : {
        position: 'fixed',
        inset: 0,
        zIndex: 50,
      };

  return (
    <div
      style={containerStyle}
      className="bg-slate-950 flex flex-col h-full w-full overflow-hidden select-none touch-none p-0 m-0"
    >
      {/* ULTRA-COMPACT SINGLE LINE TOP BAR (Max 36px) */}
      <div className="h-8 sm:h-9 bg-slate-900/95 border-b border-slate-800/80 px-2 flex items-center justify-between shrink-0 z-20 text-xs">
        {/* Left: Home & User & Library */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={onBackToHome}
            className="p-1 sm:px-2 sm:py-1 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 rounded-lg flex items-center gap-1 transition-colors"
            title="Torna al Menu"
          >
            <Home className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline text-[11px] font-bold">Menu</span>
          </button>

          {/* User badge */}
          <button
            onClick={() => setIsLibraryOpen(true)}
            className="flex items-center gap-1 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 px-2 py-0.5 rounded-lg text-[11px] text-slate-200 transition-colors"
            title="Profilo & Nome Utente"
          >
            <User className="w-3 h-3 text-amber-400" />
            <span className="font-semibold text-white max-w-[80px] sm:max-w-[110px] truncate">{username}</span>
          </button>

          {/* Library Button */}
          <button
            onClick={() => setIsLibraryOpen(true)}
            className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded-lg flex items-center gap-1 shadow-sm transition-all active:scale-95"
            title="Apri libreria spartiti"
          >
            <BookOpen className="w-3 h-3" />
            <span>Spartiti</span>
          </button>

          {/* Toggle Falling Notes if song active */}
          {activeSong && (
            <button
              onClick={() => setShowWaterfall(!showWaterfall)}
              className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors ${
                showWaterfall
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
              title="Mostra / Nascondi note a cascata"
            >
              <Sparkles className="w-3 h-3" />
              <span className="hidden sm:inline">{showWaterfall ? 'Note ON' : 'Note OFF'}</span>
            </button>
          )}
        </div>

        {/* Center: Active Song Title or Quick Octave */}
        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider hidden sm:inline">Ottava:</span>
          <button
            onClick={() => setOctaveShift((prev) => Math.max(-1, prev - 1))}
            disabled={octaveShift <= -1}
            className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 rounded disabled:opacity-30 text-xs font-bold"
            title="Ottava più bassa"
          >
            -
          </button>
          <span className="px-1 text-[11px] font-black text-amber-400 min-w-[20px] text-center">
            {octaveShift >= 0 ? `+${octaveShift}` : octaveShift}
          </span>
          <button
            onClick={() => setOctaveShift((prev) => Math.min(1, prev + 1))}
            disabled={octaveShift >= 1}
            className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 rounded disabled:opacity-30 text-xs font-bold"
            title="Ottava più alta"
          >
            +
          </button>
        </div>

        {/* Right: Record, Sustain, Fullscreen & 3 DOTS MODAL BUTTON */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Quick Record */}
          <button
            onClick={toggleRecording}
            className={`px-2 py-0.5 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors ${
              isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
            title={isRecording ? 'Termina registrazione e salva spartito' : 'Registra'}
          >
            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-white' : 'bg-red-500'}`} />
            <span className="hidden sm:inline">{isRecording ? 'Stop' : 'Rec'}</span>
          </button>

          {/* Quick Sustain toggle */}
          <button
            onClick={() => {
              const next = !sustain;
              setSustain(next);
              audioEngine.setSustain(next);
            }}
            className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg border transition-colors ${
              sustain
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Sustain (tieni premuto il suono)"
          >
            Pedale
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            title="Schermo Intero"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>

          {/* 3 PUNTINI (...) MENU BUTTON */}
          <button
            onClick={() => setIsOptionsModalOpen(true)}
            className="p-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-lg transition-all"
            title="Tutte le impostazioni e scelte (...)"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SYNTHESIA FALLING NOTES WATERFALL: Fills all remaining upper vertical space */}
      {showWaterfall && activeSong ? (
        <div className="flex-1 w-full flex flex-col min-h-0 bg-slate-950 overflow-hidden">
          <FallingNotesWaterfall
            song={activeSong}
            keys={GAMEPLAY_KEYS}
            getTransposedNote={getTransposedNote}
            onClose={() => setShowWaterfall(false)}
            lastPlayedNote={lastPlayedNote}
          />
        </div>
      ) : (
        /* When waterfall is hidden, compact chords strip */
        <div className="flex items-center justify-center gap-1.5 py-1 px-2 bg-slate-950 border-b border-slate-900 shrink-0">
          <span className="text-[10px] text-slate-500 uppercase font-bold">Accordi Rapidi:</span>
          {CHORD_PRESETS.map((chord) => (
            <button
              key={chord.name}
              onClick={() => audioEngine.playChord(chord.notes.map((n) => getTransposedNote(n)), '2n', instrument)}
              className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 hover:text-amber-400 text-[11px] font-semibold"
            >
              {chord.name}
            </button>
          ))}
        </div>
      )}

      {/* GLOWING DIVIDING HORIZONTAL LINE (Riga orizzontale che divide i tasti dalle note) */}
      <div className="w-full h-1 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.95)] z-10 shrink-0" />

      {/* PIANO KEYBOARD CONTAINER: Sits right on the bottom, fills comfortable height */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="w-full bg-slate-950 p-1 sm:p-1.5 shrink-0 select-none touch-none"
      >
        <div className="relative flex justify-center w-full">
          <div className="relative flex w-full justify-center">
            {/* White Keys */}
            <div className="flex w-full justify-between gap-0.5 sm:gap-1">
              {GAMEPLAY_KEYS.filter((k) => k.type === 'white').map((k) => {
                const isActive = activeKeys.has(k.note);
                const actualNote = getTransposedNote(k.note);
                return (
                  <button
                    key={k.note}
                    data-note={k.note}
                    onMouseDown={() => handleMouseDownKey(k.note)}
                    onMouseEnter={() => handleMouseEnterKey(k.note)}
                    onMouseLeave={() => handleMouseLeaveKey(k.note)}
                    className={`relative flex-1 h-28 sm:h-36 md:h-44 rounded-b-lg border border-slate-300 transition-colors flex flex-col justify-end pb-2 items-center text-xs font-bold shadow-md select-none touch-none ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 border-amber-500 scale-[0.99] shadow-[0_0_15px_rgba(251,191,36,0.8)]'
                        : 'bg-white text-slate-800 hover:bg-slate-100 active:bg-amber-200'
                    }`}
                  >
                    <span className="opacity-90 text-[11px] sm:text-xs font-extrabold">{actualNote}</span>
                    {k.computerKey && (
                      <span className="text-[8px] opacity-40 uppercase bg-slate-200 px-0.5 py-0.5 rounded mt-0.5 hidden sm:inline">
                        {k.computerKey}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Black Keys Overlay */}
            <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none px-1">
              <div className="flex w-full justify-between px-1">
                {GAMEPLAY_KEYS.map((k, idx) => {
                  if (k.type === 'black') {
                    const isActive = activeKeys.has(k.note);
                    const actualNote = getTransposedNote(k.note);
                    return (
                      <button
                        key={k.note}
                        data-note={k.note}
                        onMouseDown={() => handleMouseDownKey(k.note)}
                        onMouseEnter={() => handleMouseEnterKey(k.note)}
                        onMouseLeave={() => handleMouseLeaveKey(k.note)}
                        className={`pointer-events-auto absolute w-6 sm:w-8 md:w-10 h-16 sm:h-24 md:h-28 rounded-b-md border border-slate-900 z-10 flex flex-col justify-end pb-1.5 items-center text-[8px] sm:text-[9px] font-bold transition-colors shadow-xl select-none touch-none ${
                          isActive
                            ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.9)]'
                            : 'bg-slate-900 text-slate-200 hover:bg-slate-800 active:bg-amber-600'
                        }`}
                        style={{
                          transform: 'translateX(-50%)',
                          left: `${((idx + 0.62) / GAMEPLAY_KEYS.filter((x) => x.type === 'white').length) * 100}%`,
                        }}
                      >
                        <span className="text-[8px] sm:text-[9px] font-bold">{actualNote}</span>
                      </button>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 PUNTINI (...) MODAL POPUP PER TUTTE LE SCELTE ED OPZIONI */}
      {isOptionsModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-850 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Opzioni & Strumenti Pianoforte</h3>
              </div>
              <button
                onClick={() => setIsOptionsModalOpen(false)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Options */}
            <div className="p-4 space-y-4 overflow-y-auto text-xs">
              {/* Selezione Strumento */}
              <div>
                <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-2">
                  Timbro Strumento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['piano', 'guitar', 'strings', 'bass'] as InstrumentType[]).map((inst) => (
                    <button
                      key={inst}
                      onClick={() => setInstrument(inst)}
                      className={`p-2.5 rounded-xl capitalize font-bold text-left flex items-center justify-between border transition-all ${
                        instrument === inst
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{inst}</span>
                      {instrument === inst && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Controlli Audio */}
              <div>
                <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-2">
                  Effetti & Tasti
                </label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                    <div>
                      <div className="font-bold text-white">Pedale Sustain</div>
                      <div className="text-[10px] text-slate-400">Lascia risuonare le note dopo il rilascio</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={sustain}
                      onChange={(e) => {
                        setSustain(e.target.checked);
                        audioEngine.setSustain(e.target.checked);
                      }}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>

                  {isPortrait && (
                    <div className="flex items-center justify-between bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                      <div>
                        <div className="font-bold text-white">Forza Orizzontale</div>
                        <div className="text-[10px] text-slate-400">Ruota il piano a 90° in verticale</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={forceLandscape}
                        onChange={(e) => setForceLandscape(e.target.checked)}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Profilo & Spartiti */}
              <div>
                <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-2">
                  Spartiti & Community
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setIsOptionsModalOpen(false);
                      setIsLibraryOpen(true);
                    }}
                    className="w-full p-2.5 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-xl flex items-center justify-between border border-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      <span>Libreria Spartiti & Community</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Apri &rarr;</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsOptionsModalOpen(false);
                      toggleRecording();
                    }}
                    className={`w-full p-2.5 font-bold rounded-xl flex items-center justify-between border transition-all ${
                      isRecording
                        ? 'bg-red-500/20 border-red-500 text-red-300'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-red-500'}`} />
                      <span>{isRecording ? 'Termina Registrazione Brano' : 'Registra Nuovo Spartito'}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{isRecording ? 'Stop' : 'Inizia'}</span>
                  </button>
                </div>
              </div>

              {/* Informazione Glissando */}
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300/90 text-[11px] flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Glissando e scale continue:</strong> trascina il dito lungo la tastiera per far suonare ogni tasto al passaggio senza dover staccare e riattaccare.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-850 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsOptionsModalOpen(false)}
                className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-400"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      """

text = text[:idx_start] + new_jsx + text[idx_end:]

with open('src/components/PianoView.tsx', 'w') as f:
    f.write(text)

print('PianoView.tsx successfully updated!')
