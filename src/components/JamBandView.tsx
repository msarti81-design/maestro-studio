import React, { useState, useEffect, useRef } from 'react';
import { JamStyle, InstrumentType } from '../types';
import { audioEngine } from '../utils/audioEngine';
import { PRESET_SONGS } from '../data/songs';
import { getPublishedSongs, getLocalSongs } from '../utils/songStorage';
import {
  Play,
  Square,
  Sliders,
  Radio,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  BookOpen,
  ArrowRightLeft,
  Volume2,
  ChevronRight,
  Disc,
  Music,
  Edit2,
  Check,
  Zap,
} from 'lucide-react';

const NOTE_VALS: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
};
const VAL_TO_NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function parseChordToNotes(chordStr: string, baseOctave = 4): string[] {
  if (!chordStr || !chordStr.trim()) return ['C4', 'E4', 'G4'];
  let clean = chordStr.trim().replace(/\s+/g, '');

  let root = 'C';
  let quality = '';
  if (clean.length >= 2 && (clean[1] === '#' || clean[1] === 'b')) {
    root = clean.substring(0, 2);
    quality = clean.substring(2);
  } else {
    root = clean.substring(0, 1);
    quality = clean.substring(1);
  }

  if (root === 'Db') root = 'C#';
  if (root === 'Eb') root = 'D#';
  if (root === 'Gb') root = 'F#';
  if (root === 'Ab') root = 'G#';
  if (root === 'Bb') root = 'A#';

  const rootVal = NOTE_VALS[root] ?? 0;
  let intervals = [0, 4, 7];

  const q = quality.toLowerCase();
  if (q === 'm' || q === 'min' || q.startsWith('m7') || q.startsWith('min7') || q.startsWith('m9')) {
    intervals = [0, 3, 7];
    if (q.includes('7')) intervals.push(10);
    if (q.includes('9')) intervals.push(14);
  } else if (q === 'maj7' || q === 'm7+' || q === 'M7') {
    intervals = [0, 4, 7, 11];
  } else if (q === '7' || q === 'dom7' || q === '7alt' || q === '7b9') {
    intervals = [0, 4, 7, 10];
  } else if (q === 'dim' || q === 'dim7' || q === '°') {
    intervals = [0, 3, 6, 9];
  } else if (q === 'aug' || q === '+') {
    intervals = [0, 4, 8];
  } else if (q === 'sus4' || q === '4') {
    intervals = [0, 5, 7];
  } else if (q === 'sus2' || q === '2') {
    intervals = [0, 2, 7];
  } else if (q === 'add9' || q === '9') {
    intervals = [0, 4, 7, 14];
  } else if (q === 'm6' || q === 'min6') {
    intervals = [0, 3, 7, 9];
  } else if (q === '6') {
    intervals = [0, 4, 7, 9];
  }

  return intervals.map((semitones) => {
    const totalVal = rootVal + semitones;
    const octOffset = Math.floor(totalVal / 12);
    const noteIdx = totalVal % 12;
    return `${VAL_TO_NOTE[noteIdx]}${baseOctave + octOffset}`;
  });
}

export function transposeChord(chordStr: string, semitones: number): string {
  if (!chordStr || !chordStr.trim()) return 'C';
  let clean = chordStr.trim().replace(/\s+/g, '');
  let root = 'C';
  let quality = '';
  if (clean.length >= 2 && (clean[1] === '#' || clean[1] === 'b')) {
    root = clean.substring(0, 2);
    quality = clean.substring(2);
  } else {
    root = clean.substring(0, 1);
    quality = clean.substring(1);
  }

  if (root === 'Db') root = 'C#';
  if (root === 'Eb') root = 'D#';
  if (root === 'Gb') root = 'F#';
  if (root === 'Ab') root = 'G#';
  if (root === 'Bb') root = 'A#';

  const rootVal = NOTE_VALS[root] ?? 0;
  let newVal = (rootVal + semitones) % 12;
  if (newVal < 0) newVal += 12;

  return `${VAL_TO_NOTE[newVal]}${quality}`;
}

const JAM_STYLES: { id: JamStyle; name: string; description: string; defaultBpm: number; defaultChords: string[] }[] = [
  { id: 'jazz', name: 'Jazz Swing', description: 'Walking bass swing, drum brushes and jazz chords.', defaultBpm: 120, defaultChords: ['Dm7', 'G7', 'Cmaj7', 'A7'] },
  { id: 'rock', name: 'Rock Groove', description: 'Rhythm guitar, electric bass and driving kick/snare.', defaultBpm: 130, defaultChords: ['G', 'D', 'Em', 'C'] },
  { id: 'pop', name: 'Acoustic Pop', description: 'Warm guitar/piano chords with catchy pop rhythm.', defaultBpm: 115, defaultChords: ['C', 'G', 'Am', 'F'] },
  { id: 'lofi', name: 'Lo-Fi Chill', description: 'Relaxed beat, deep sub bass and extended chords.', defaultBpm: 85, defaultChords: ['Dm9', 'G13', 'Cmaj7', 'A7'] },
  { id: 'blues', name: 'Blues Shuffle', description: '12-bar blues shuffle structure with moving bass.', defaultBpm: 110, defaultChords: ['C7', 'C7', 'C7', 'C7', 'F7', 'F7', 'C7', 'C7', 'G7', 'F7', 'C7', 'G7'] },
  { id: 'bossa', name: 'Bossa Nova', description: 'Brazilian syncopated rhythm with classical guitar and percussion.', defaultBpm: 125, defaultChords: ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'] },
];

const PROGRESSION_PRESETS = [
  { name: 'Pop Hit (1 - 5 - 6 - 4)', chords: ['C', 'G', 'Am', 'F'] },
  { name: 'Sensitive Pop (6 - 4 - 1 - 5)', chords: ['Am', 'F', 'C', 'G'] },
  { name: 'Jazz Standard (2 - 5 - 1 - 6)', chords: ['Dm7', 'G7', 'Cmaj7', 'A7'] },
  { name: 'Classic 12-Bar Blues', chords: ['C7', 'C7', 'C7', 'C7', 'F7', 'F7', 'C7', 'C7', 'G7', 'F7', 'C7', 'G7'] },
  { name: 'Pachelbel Canon', chords: ['C', 'G', 'Am', 'Em', 'F', 'C', 'F', 'G'] },
  { name: 'Andalusian Cadence (Flamenco)', chords: ['Am', 'G', 'F', 'E7'] },
  { name: 'Bossa Nova Sunset', chords: ['Dm7', 'G7', 'Cmaj7', 'Cmaj7', 'Fm7', 'Bb7', 'Ebmaj7', 'Ebmaj7'] },
  { name: 'R&B / Soul Stiff', chords: ['C', 'E7', 'F', 'Fm'] },
  { name: '50s Doo-Wop (1 - 6 - 4 - 5)', chords: ['C', 'Am', 'F', 'G'] },
  { name: 'Lo-Fi Chill Sunset', chords: ['Dm9', 'G13', 'Cmaj7', 'A7'] },
  { name: 'Rock Ballad (1 - b7 - 4)', chords: ['A', 'G', 'D', 'A'] },
  { name: 'Epic Movie Theme', chords: ['Am', 'F', 'Dm', 'E7'] },
];

const CHORD_PALETTE_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const CHORD_PALETTE_QUALITIES = ['', 'm', '7', 'maj7', 'm7', 'dim', 'sus4', 'add9', '6'];

export const JamBandView: React.FC = () => {
  const [selectedStyle, setSelectedStyle] = useState<JamStyle>('jazz');
  const [bpm, setBpm] = useState<number>(120);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentBar, setCurrentBar] = useState<number>(0);

  const [chords, setChords] = useState<string[]>(['Dm7', 'G7', 'Cmaj7', 'A7']);
  const [editingBarIndex, setEditingBarIndex] = useState<number | null>(null);
  const [customInputChord, setCustomInputChord] = useState<string>('');
  const [currentKeyRoot, setCurrentKeyRoot] = useState<string>('C');

  const [activeInstruments, setActiveInstruments] = useState<Record<InstrumentType | 'drums', boolean>>({
    drums: true,
    bass: true,
    guitar: true,
    piano: true,
    strings: false,
    synth: false,
  });

  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    const s = JAM_STYLES.find((item) => item.id === selectedStyle);
    if (s) {
      setBpm(s.defaultBpm);
    }
  }, [selectedStyle]);

  useEffect(() => {
    if (!isPlaying) return;

    const barSeconds = (60 / bpm) * 2;
    const intervalMs = barSeconds * 1000;
    let barIdx = 0;

    const timer = setInterval(() => {
      barIdx = (barIdx + 1) % chords.length;
      setCurrentBar(barIdx);
      playJamBar(chords[barIdx]);
    }, intervalMs);

    setCurrentBar(0);
    playJamBar(chords[0]);

    return () => clearInterval(timer);
  }, [isPlaying, bpm, chords, activeInstruments]);

  const playJamBar = (chordStr: string) => {
    try {
      audioEngine.init().catch(() => {});
      const notes = parseChordToNotes(chordStr, 4);

      if (activeInstruments.drums) {
        audioEngine.playMetronomeClick(true);
      }
      if (activeInstruments.piano || activeInstruments.guitar) {
        notes.forEach((note, idx) => {
          setTimeout(() => {
            audioEngine.playNote(note, '4n', 'piano');
          }, idx * 40);
        });
      }
    } catch (e) {}
  };

  const handleTogglePlay = () => {
    audioEngine.init().catch(() => {});
    setIsPlaying(!isPlaying);
  };

  const handleTranspose = (semitones: number) => {
    const transposed = chords.map((c) => transposeChord(c, semitones));
    setChords(transposed);
  };

  const handleSelectPreset = (presetChords: string[]) => {
    setChords([...presetChords]);
  };

  const handleAddBar = () => {
    if (chords.length >= 16) return;
    const last = chords[chords.length - 1] || 'C';
    setChords([...chords, last]);
  };

  const handleRemoveBar = (idx: number) => {
    if (chords.length <= 1) return;
    setChords(chords.filter((_, i) => i !== idx));
  };

  const handleUpdateChord = (idx: number, newChord: string) => {
    const updated = [...chords];
    updated[idx] = newChord.trim() || 'C';
    setChords(updated);
    setEditingBarIndex(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 select-none pb-24">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Interactive Rhythm Section & Jam Band</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>Jam Band Studio</span>
              <span className="text-xs font-bold px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                AI Rhythm & Chords
              </span>
            </h1>
            <p className="text-slate-400 text-xs md:text-sm max-w-2xl">
              Edit chords measure by measure, import songs from the library, transpose key, and jam in real-time with your piano!
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTogglePlay}
              className={`px-6 py-3.5 rounded-2xl font-black text-xs md:text-sm flex items-center gap-3 transition-all shadow-xl cursor-pointer ${
                isPlaying
                  ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/30'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/30'
              }`}
            >
              {isPlaying ? (
                <>
                  <Square className="w-5 h-5 fill-current" />
                  <span>Stop Jam</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Jam Band</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Styles Grid */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Select Jam Style & Genre
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {JAM_STYLES.map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  setSelectedStyle(st.id);
                  setChords([...st.defaultChords]);
                }}
                className={`p-4 rounded-2xl border text-left space-y-2 transition-all cursor-pointer ${
                  selectedStyle === st.id
                    ? 'bg-amber-500/20 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div className="font-black text-sm text-amber-300">{st.name}</div>
                <div className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                  {st.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chord Progression Loop Timeline */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Music className="w-4 h-4 text-amber-400" />
                <span>Chord Progression Loop ({chords.length} Measures)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Click any chord to edit it or add new measures to your loop.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleTranspose(2)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                title="Transpose Up 2 Semitones"
              >
                Transpose +2
              </button>
              <button
                onClick={() => handleTranspose(-2)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                title="Transpose Down 2 Semitones"
              >
                Transpose -2
              </button>
              <button
                onClick={handleAddBar}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Measure</span>
              </button>
            </div>
          </div>

          {/* Timeline Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {chords.map((chord, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
                  isPlaying && currentBar === idx
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/30 scale-105'
                    : 'bg-slate-950 text-white border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono opacity-70">
                  <span>Bar {idx + 1}</span>
                  {chords.length > 1 && (
                    <button
                      onClick={() => handleRemoveBar(idx)}
                      className="hover:text-red-400 transition-colors cursor-pointer"
                      title="Remove Measure"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    setEditingBarIndex(idx);
                    setCustomInputChord(chord);
                  }}
                  className={`text-lg font-black py-2 rounded-xl text-center transition-all cursor-pointer ${
                    isPlaying && currentBar === idx
                      ? 'bg-slate-950 text-amber-300'
                      : 'bg-slate-900 text-amber-400 hover:bg-slate-850'
                  }`}
                >
                  {chord}
                </button>
              </div>
            ))}
          </div>

          {/* Inline Editor Modal for Bar Chord */}
          {editingBarIndex !== null && (
            <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/40 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase">
                  Select Quick Chord for Measure {editingBarIndex + 1}:
                </span>
                <button
                  onClick={() => setEditingBarIndex(null)}
                  className="text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  Close ✖
                </button>
              </div>

              {/* Palette of chords */}
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                {CHORD_PALETTE_ROOTS.map((root) =>
                  CHORD_PALETTE_QUALITIES.slice(0, 4).map((q) => {
                    const cName = `${root}${q}`;
                    return (
                      <button
                        key={cName}
                        onClick={() => handleUpdateChord(editingBarIndex, cName)}
                        className="p-2 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white text-xs font-bold rounded-lg border border-slate-800 transition-colors cursor-pointer text-center"
                      >
                        {cName}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Progression Presets */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Select a Famous Chord Progression to Load Instantly:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {PROGRESSION_PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => handleSelectPreset(p.chords)}
                className="p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 rounded-2xl text-left space-y-1 transition-all cursor-pointer group"
              >
                <div className="text-xs font-black text-white group-hover:text-amber-300 transition-colors">
                  {p.name}
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate">
                  {p.chords.join(' - ')}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Instruments Toggles & Tempo Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Instruments */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Active Accompaniment Instruments
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(activeInstruments).map(([inst, active]) => (
                <button
                  key={inst}
                  onClick={() =>
                    setActiveInstruments({ ...activeInstruments, [inst]: !active })
                  }
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                    active
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                  }`}
                >
                  <span className="capitalize">{inst}</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-amber-400' : 'bg-slate-800'}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Tempo & BPM */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Tempo & Metronome BPM
                </h3>
                <div className="text-3xl font-black text-amber-300 font-mono mt-1">
                  {bpm} <span className="text-xs text-slate-400 font-sans">BPM</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBpm(Math.max(40, bpm - 5))}
                  className="w-10 h-10 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-black text-lg border border-slate-800 cursor-pointer"
                >
                  -
                </button>
                <button
                  onClick={() => setBpm(Math.min(240, bpm + 5))}
                  className="w-10 h-10 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-black text-lg border border-slate-800 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <input
              type="range"
              min="40"
              max="240"
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
