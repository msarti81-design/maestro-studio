import React, { useState, useRef } from 'react';
import { NoteNotationFormat } from '../types';
import { formatNoteLabel } from '../utils/noteFormatting';
import { ALL_PIANO_KEYS, ALL_WHITE_KEYS, KeyConfig } from '../data/pianoKeys';
import { MiniMapKeyboard } from './MiniMapKeyboard';
import { Zap, ChevronLeft, ChevronRight, Sliders, Music } from 'lucide-react';

interface LightweightSheetKeyboardProps {
  onNoteClick: (note: string, duration?: string) => void;
  targetChannel: 'melody' | 'bassline';
  noteNotation: NoteNotationFormat;
  selectedDuration: string;
  onDurationChange: (dur: string) => void;
  onNotationToggle: () => void;
}

const DURATIONS = [
  { value: '16n', label: '1/16', desc: 'Sedicesimo' },
  { value: '8n', label: '1/8', desc: 'Ottavo' },
  { value: '4n', label: '1/4', desc: 'Quarto' },
  { value: '2n', label: '1/2', desc: 'Metà' },
  { value: '1m', label: '1/1', desc: 'Intero' },
];

export const LightweightSheetKeyboard: React.FC<LightweightSheetKeyboardProps> = ({
  onNoteClick,
  targetChannel,
  noteNotation,
  selectedDuration,
  onDurationChange,
  onNotationToggle,
}) => {
  // Key Window Navigation (Default 16 white keys ~25 total piano keys on screen)
  const [windowSize, setWindowSize] = useState<number>(16);
  const maxStartWhiteIdx = Math.max(0, ALL_WHITE_KEYS.length - windowSize);

  // Start around C3/C4 (index 16 in white keys)
  const [startWhiteKeyIdx, setStartWhiteKeyIdx] = useState<number>(() => Math.min(16, maxStartWhiteIdx));
  const clampedStartWhiteIdx = Math.min(startWhiteKeyIdx, maxStartWhiteIdx);

  const [pressedNote, setPressedNote] = useState<string | null>(null);
  const currentlyPressedNotesRef = useRef<Set<string>>(new Set());

  const handleKeyPress = (note: string) => {
    setPressedNote(note);
    currentlyPressedNotesRef.current.add(note);
    onNoteClick(note, selectedDuration);

    setTimeout(() => {
      setPressedNote(null);
      currentlyPressedNotesRef.current.delete(note);
    }, 180);
  };

  // Slice visible white keys
  const visibleWhiteKeys = ALL_WHITE_KEYS.slice(clampedStartWhiteIdx, clampedStartWhiteIdx + windowSize);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-0">
      {/* 1. HEADER CONTROLS BAR: Duration, Size & Notation */}
      <div className="p-3 bg-slate-850 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
            <Zap className="w-4 h-4 fill-amber-400 shrink-0" />
          </div>
          <div>
            <h4 className="font-black text-white text-xs sm:text-sm flex items-center gap-1.5">
              <span>Tastiera Reattiva Composizione</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold uppercase">
                Veloce & Leggera
              </span>
            </h4>
            <p className="text-[10px] text-slate-400 hidden xs:block">
              Usa la minimap in alto per spostarti • Tocca i tasti per inserire le note
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Duration Pills */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <span className="text-[9px] text-slate-400 font-bold uppercase px-1 hidden sm:inline">Durata:</span>
            {DURATIONS.map((dur) => (
              <button
                key={dur.value}
                onClick={() => onDurationChange(dur.value)}
                className={`px-2 py-1 text-[10px] font-black rounded-lg transition-all ${
                  selectedDuration === dur.value
                    ? 'bg-amber-500 text-slate-950 shadow-sm scale-105'
                    : 'text-slate-400 hover:text-white bg-slate-900/50'
                }`}
                title={`Inserisci note come ${dur.desc}`}
              >
                {dur.label}
              </button>
            ))}
          </div>

          {/* Window Size Pills: 14, 16, 21 Tasti */}
          <div className="flex items-center gap-0.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[14, 16, 21].map((sz) => (
              <button
                key={sz}
                onClick={() => setWindowSize(sz)}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  windowSize === sz
                    ? 'bg-amber-500/20 text-amber-300 font-black border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`Visualizza ${sz} tasti bianchi a schermo`}
              >
                {sz} Tasti
              </button>
            ))}
          </div>

          {/* Notation Toggle Button */}
          <button
            onClick={onNotationToggle}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-[10px] font-black text-amber-300 rounded-xl border border-slate-700 transition-colors"
            title="Cambia notazione (DO RE MI / C D E)"
          >
            {noteNotation === 'latin' ? 'DO RE MI' : 'C D E'}
          </button>
        </div>
      </div>

      {/* 2. 88-KEY MINI-MAP NAVIGATION STRIP (Tastiera di navigazione per gli spostamenti) */}
      <div className="w-full bg-slate-950 border-b border-slate-800 px-2 py-1.5 flex items-center justify-between gap-1.5 shrink-0">
        <button
          onClick={() => setStartWhiteKeyIdx((prev) => Math.max(0, prev - 7))}
          disabled={clampedStartWhiteIdx === 0}
          className="p-1 h-8 w-7 flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-25 rounded-lg shrink-0 transition-colors border border-slate-800"
          title="Sposta indietro di 1 Ottava"
        >
          <ChevronLeft className="w-4 h-4 text-amber-400" />
        </button>

        <div className="flex-1 min-w-0 h-9 sm:h-10">
          <MiniMapKeyboard
            allWhiteKeys={ALL_WHITE_KEYS}
            allPianoKeys={ALL_PIANO_KEYS}
            startWhiteKeyIdx={clampedStartWhiteIdx}
            windowSize={windowSize}
            maxStartWhiteIdx={maxStartWhiteIdx}
            onSelectStartWhiteIdx={setStartWhiteKeyIdx}
            currentlyPressedNotesRef={currentlyPressedNotesRef}
            showWaterfall={false}
          />
        </div>

        <button
          onClick={() => setStartWhiteKeyIdx((prev) => Math.min(maxStartWhiteIdx, prev + 7))}
          disabled={clampedStartWhiteIdx >= maxStartWhiteIdx}
          className="p-1 h-8 w-7 flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-25 rounded-lg shrink-0 transition-colors border border-slate-800"
          title="Sposta avanti di 1 Ottava"
        >
          <ChevronRight className="w-4 h-4 text-amber-400" />
        </button>
      </div>

      {/* Golden Accent Separator Line */}
      <div className="w-full h-1 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />

      {/* 3. LIGHTWEIGHT PURE DOM KEYBOARD (Fast, Zero Lag, Perfect Black Keys Overlay) */}
      <div className="p-2 sm:p-3 bg-slate-950 flex justify-center">
        <div className="relative w-full h-44 sm:h-52 bg-slate-900 rounded-2xl border border-slate-800/90 p-1 flex select-none overflow-hidden shadow-inner">
          <div className="w-full h-full flex gap-1 relative">
            {visibleWhiteKeys.map((whiteKey, idx) => {
              const isWhitePressed = pressedNote === whiteKey.note;

              // Find index of this white key in ALL_PIANO_KEYS
              const pianoIdx = ALL_PIANO_KEYS.findIndex((k) => k.note === whiteKey.note);
              const nextPianoKey = pianoIdx >= 0 && pianoIdx < ALL_PIANO_KEYS.length - 1 ? ALL_PIANO_KEYS[pianoIdx + 1] : null;
              const hasBlackKey = nextPianoKey && nextPianoKey.type === 'black';

              return (
                <div key={whiteKey.note} className="flex-1 h-full relative group">
                  {/* WHITE KEY BUTTON */}
                  <button
                    onClick={() => handleKeyPress(whiteKey.note)}
                    className={`w-full h-full rounded-b-xl border flex flex-col justify-end pb-3 items-center transition-all cursor-pointer relative ${
                      isWhitePressed
                        ? 'bg-amber-300 border-amber-500 scale-95 shadow-inner'
                        : 'bg-gradient-to-b from-slate-100 via-white to-slate-200 border-slate-300 hover:from-white hover:to-slate-100 shadow-md'
                    }`}
                  >
                    <span className="text-[10px] sm:text-xs font-black text-slate-900 pointer-events-none">
                      {formatNoteLabel(whiteKey.note, noteNotation, true)}
                    </span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase pointer-events-none">
                      {whiteKey.note}
                    </span>
                  </button>

                  {/* OVERLAY BLACK KEY BUTTON (IF ATTACHED) */}
                  {hasBlackKey && nextPianoKey && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleKeyPress(nextPianoKey.note);
                      }}
                      className={`absolute top-0 right-0 translate-x-1/2 z-20 w-[62%] h-[60%] rounded-b-lg border border-slate-950 transition-all cursor-pointer flex flex-col justify-end pb-2 items-center shadow-xl ${
                        pressedNote === nextPianoKey.note
                          ? 'bg-amber-400 border-amber-600 scale-95 shadow-inner'
                          : 'bg-gradient-to-b from-slate-900 via-slate-950 to-black hover:from-slate-800 hover:to-slate-900'
                      }`}
                      title={nextPianoKey.note}
                    >
                      <span className="text-[8px] font-black text-amber-300 pointer-events-none">
                        #
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
