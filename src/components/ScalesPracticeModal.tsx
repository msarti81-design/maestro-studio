import React, { useState, useRef } from 'react';
import { X, Play, Square, Music, Sparkles, BookOpen, Layers, Hand, Eye, ArrowRight, Lightbulb } from 'lucide-react';
import { audioEngine } from '../utils/audioEngine';
import { SCALE_EXERCISES, ScaleExercise, FINGER_NAMES } from '../data/scaleExercises';

interface ScalesPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayNote?: (note: string) => void;
  onStartGuidanceOnPiano?: (exercise: ScaleExercise) => void;
}

export const ScalesPracticeModal: React.FC<ScalesPracticeModalProps> = ({
  isOpen,
  onClose,
  onStartGuidanceOnPiano,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Tutte');
  const [selectedEx, setSelectedEx] = useState<ScaleExercise>(SCALE_EXERCISES[0]);
  const [activeNoteIdx, setActiveNoteIdx] = useState<number | null>(null);
  const [isPlayingDemo, setIsPlayingDemo] = useState<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);
  const [tempoBpm, setTempoBpm] = useState<number>(80);

  if (!isOpen) return null;

  const categories = ['All', 'Major Scales', 'Minor Scales', 'Hanon (Independence)', 'Arpeggios', 'Blues & Pentatonic'];

  const filteredExercises = selectedCategory === 'All'
    ? SCALE_EXERCISES
    : SCALE_EXERCISES.filter((ex) => ex.category === selectedCategory);

  const handlePlayDemo = async () => {
    if (isPlayingRef.current) {
      isPlayingRef.current = false;
      setIsPlayingDemo(false);
      setActiveNoteIdx(null);
      return;
    }

    audioEngine.init().catch(() => {});
    isPlayingRef.current = true;
    setIsPlayingDemo(true);
    const delay = (60 / tempoBpm) * 1000 * 0.75;

    for (let i = 0; i < selectedEx.notes.length; i++) {
      if (!isPlayingRef.current) break;
      const note = selectedEx.notes[i];
      setActiveNoteIdx(i);
      audioEngine.playNote(note, '4n', 'piano');
      await new Promise((r) => setTimeout(r, delay));
    }

    setActiveNoteIdx(null);
    isPlayingRef.current = false;
    setIsPlayingDemo(false);
  };

  const handleLaunchOnPiano = (ex: ScaleExercise = selectedEx) => {
    isPlayingRef.current = false;
    setIsPlayingDemo(false);
    setActiveNoteIdx(null);
    if (onStartGuidanceOnPiano) {
      onStartGuidanceOnPiano(ex);
    }
  };

  const currentNote = activeNoteIdx !== null ? selectedEx.notes[activeNoteIdx] : null;
  const currentFinger = activeNoteIdx !== null ? selectedEx.fingering[activeNoteIdx % selectedEx.fingering.length] : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/50 w-full max-w-4xl rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xl relative animate-fadeIn text-slate-100 select-none max-h-[94vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Layers className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                Scale & Fingering Gym
              </h2>
              <p className="text-slate-400 text-xs">
                Interactive guide on the real piano with the <strong className="text-amber-300">transparent hand</strong> and correct fingering
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              isPlayingRef.current = false;
              setIsPlayingDemo(false);
              onClose();
            }}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left Sidebar: Exercise List */}
          <div className="md:col-span-5 space-y-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 max-h-[380px] overflow-y-auto">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 px-1 flex items-center justify-between">
              <span>Available Exercises</span>
              <span className="text-[10px] text-slate-400 font-normal">({filteredExercises.length})</span>
            </h3>
            {filteredExercises.map((ex) => {
              const isSelected = selectedEx.id === ex.id;
              return (
                <button
                  key={ex.id}
                  onClick={() => {
                    isPlayingRef.current = false;
                    setIsPlayingDemo(false);
                    setActiveNoteIdx(null);
                    setSelectedEx(ex);
                    setTempoBpm(ex.tempoBpm || 80);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex flex-col gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold truncate">{ex.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                      isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-amber-300'
                    }`}>
                      {ex.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className={isSelected ? 'text-slate-900/80' : 'text-slate-400'}>
                      {ex.category}
                    </span>
                    <span className={`font-mono ${isSelected ? 'text-slate-950' : 'text-amber-400'}`}>
                      {ex.notes.length} note
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Main Panel: Scale Details & Piano Launch CTA */}
          <div className="md:col-span-7 space-y-3.5 bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">
                    {selectedEx.category} • {selectedEx.keySignature}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white">{selectedEx.name}</h3>
                </div>
                <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 shrink-0">
                  {selectedEx.difficulty}
                </span>
              </div>

              <p className="text-slate-300 text-xs leading-relaxed">
                {selectedEx.description}
              </p>

              {/* Tips & Pedagogy */}
              {selectedEx.tips && selectedEx.tips.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    <span>Teacher Tip:</span>
                  </div>
                  <ul className="text-[11px] text-amber-100/90 space-y-1 pl-4 list-disc">
                    {selectedEx.tips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Note and Fingering Strip Preview */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                  <span>Sequenza Note & Dita:</span>
                  {activeNoteIdx !== null && (
                    <span className="text-amber-300 font-mono font-bold animate-pulse">
                      In ascolto: {currentNote} (Dito {currentFinger} • {FINGER_NAMES[currentFinger || 1]?.name})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-thin">
                  {selectedEx.notes.map((note, idx) => {
                    const isActive = activeNoteIdx === idx;
                    const finger = selectedEx.fingering[idx % selectedEx.fingering.length];
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all shrink-0 w-9 ${
                          isActive
                            ? 'bg-amber-500 text-slate-950 scale-105 shadow-md shadow-amber-500/40 font-black ring-2 ring-amber-300'
                            : 'bg-slate-800 text-slate-300 border border-slate-700/60'
                        }`}
                      >
                        <span className="text-[10px] font-mono font-bold">{note}</span>
                        <span className={`text-[9px] mt-0.5 px-1 rounded font-black ${
                          isActive ? 'bg-slate-950 text-amber-300' : 'bg-slate-900 text-amber-400'
                        }`}>
                          D{finger}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ACTION SECTION: Big Primary Button to Open Piano Function with Transparent Hand */}
            <div className="space-y-3 pt-3 border-t border-slate-800/80">
              {/* PRIMARY CTA: OPEN PIANO WITH TRANSPARENT HAND */}
              <button
                onClick={() => handleLaunchOnPiano(selectedEx)}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-amber-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <Hand className="w-5 h-5 text-slate-950 animate-bounce" />
                <span>APRI NEL PIANOFORTE CON MANO TRASPARENTE</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>

              {/* Secondary Controls: In-modal audio preview & tempo */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold">Velocità:</span>
                  <input
                    type="range"
                    min="40"
                    max="140"
                    value={tempoBpm}
                    onChange={(e) => setTempoBpm(parseInt(e.target.value))}
                    className="w-24 accent-amber-500 cursor-pointer"
                  />
                  <span className="font-mono font-bold text-amber-300 w-12">{tempoBpm} BPM</span>
                </div>

                <button
                  onClick={handlePlayDemo}
                  className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isPlayingDemo
                      ? 'bg-red-500/20 border border-red-500 text-red-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  {isPlayingDemo ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop Preview</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Listen Preview</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
