import React, { useState } from 'react';
import { X, Music, Sparkles, Layers, BookOpen, Minimize2, Maximize2 } from 'lucide-react';
import { identifyChord, IdentifiedChord } from '../utils/chordDetector';

interface ChordDetectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeNotes: string[];
  chordHistory: { chord: IdentifiedChord; time: string }[];
}

export const ChordDetectorModal: React.FC<ChordDetectorModalProps> = ({
  isOpen,
  onClose,
  activeNotes,
  chordHistory,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  const currentChord = identifyChord(activeNotes);

  if (isMinimized) {
    return (
      <div className="fixed top-20 right-4 sm:right-6 z-40 bg-slate-900/95 backdrop-blur-md border-2 border-amber-500/60 rounded-xl shadow-2xl p-3 flex items-center gap-3 animate-in fade-in">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black text-sm shadow">
          🎹
        </div>
        <div>
          <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">Live Chord</div>
          <div className="text-lg font-black text-amber-200 font-mono">
            {currentChord ? currentChord.symbol : 'Listening...'}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Expand"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-40 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-md border-2 border-amber-500/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in">
      {/* Header */}
      <div className="p-3.5 bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border-b border-amber-500/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black text-base shadow-md shadow-amber-500/30">
            🎹
          </div>
          <div>
            <h3 className="text-sm font-black text-white">Chord Analyzer</h3>
            <p className="text-[10px] text-amber-300/80">
              Real-time recognition (does not block keyboard)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Minimize"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto space-y-3.5 text-xs max-h-[70vh]">
        {/* Active Chord Big Display Card */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-amber-500/40 rounded-xl p-4 flex flex-col items-center text-center shadow-xl relative overflow-hidden">
          <div className="absolute top-2 right-3 text-[10px] text-amber-400 font-bold uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            Live
          </div>

          <div className="text-[10px] text-slate-400 uppercase font-extrabold tracking-widest mb-1">
            Recognized Chord
          </div>

          {currentChord ? (
            <div className="space-y-1 my-1.5">
              <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-300 font-mono tracking-tight drop-shadow">
                {currentChord.symbol}
              </div>
              <div className="text-xs font-bold text-amber-300">
                {currentChord.name}
              </div>
            </div>
          ) : (
            <div className="my-2.5 text-slate-400 text-[11px] space-y-1">
              <p className="italic font-medium">Play on the keyboard below, MIDI, or arpeggiate with microphone...</p>
              <p className="text-[9px] text-amber-400/80">You can now play freely while this panel remains open!</p>
            </div>
          )}

          {/* Active Notes Badge List */}
          <div className="mt-2.5 flex items-center gap-1 flex-wrap justify-center">
            <span className="text-[10px] text-slate-400 font-bold">Active notes:</span>
            {activeNotes.length > 0 ? (
              activeNotes.map((n, idx) => (
                <span
                  key={idx}
                  className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-mono font-bold text-[11px]"
                >
                  {n}
                </span>
              ))
            ) : (
              <span className="text-slate-600 text-[11px] italic">None</span>
            )}
          </div>
        </div>

        {/* Chord Progression History */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-amber-400" />
              <span>Recent Progression</span>
            </span>
            <span className="text-[9px] text-slate-500">Recent chords</span>
          </div>

          {chordHistory.length > 0 ? (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {chordHistory.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 flex flex-col items-center shrink-0 shadow-inner"
                >
                  <span className="font-mono font-black text-amber-400 text-xs">{item.chord.symbol}</span>
                  <span className="text-[8px] text-slate-400 mt-0.5">{item.time}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3 text-slate-500 italic text-[11px]">
              Progression will appear here as you play.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
