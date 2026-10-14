import React, { useState, useEffect } from 'react';
import { JamStyle, InstrumentType } from '../types';
import { audioEngine } from '../utils/audioEngine';
import { Play, Square, Layers, Sliders, Music, Disc, Radio } from 'lucide-react';

const JAM_STYLES: { id: JamStyle; name: string; description: string; defaultBpm: number; defaultChords: string[] }[] = [
  { id: 'jazz', name: 'Jazz Swing', description: 'Smooth walking bassline with swinging chords and brushed drum beat.', defaultBpm: 120, defaultChords: ['Cmaj7', 'Am7', 'Dm7', 'G7'] },
  { id: 'rock', name: 'Rock Groove', description: 'Driving guitar power chords with rock drum beat and electric bass.', defaultBpm: 130, defaultChords: ['G', 'D', 'Em', 'C'] },
  { id: 'pop', name: 'Acoustic Pop', description: 'Warm arpeggiated guitar/piano chords with uplifting pop rhythm.', defaultBpm: 115, defaultChords: ['C', 'G', 'Am', 'F'] },
  { id: 'lofi', name: 'Lo-Fi Chill', description: 'Mellow chords, relaxed drum beat, and deep sub bass.', defaultBpm: 85, defaultChords: ['Dm9', 'G13', 'Cmaj7', 'A7'] },
  { id: 'blues', name: 'Blues Shuffle', description: 'Classic 12-bar blues shuffle with swinging bass and piano.', defaultBpm: 110, defaultChords: ['C7', 'F7', 'C7', 'G7'] },
  { id: 'bossa', name: 'Bossa Nova', description: 'Syncopated Brazilian bossa rhythm with soft nylon guitar chords.', defaultBpm: 125, defaultChords: ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'] },
];

const CHORD_NOTES_MAP: Record<string, string[]> = {
  'Cmaj7': ['C4', 'E4', 'G4', 'B4'],
  'Am7': ['A3', 'C4', 'E4', 'G4'],
  'Dm7': ['D4', 'F4', 'A4', 'C5'],
  'G7': ['G3', 'B3', 'D4', 'F4'],
  'G': ['G3', 'B3', 'D4'],
  'D': ['D4', 'F#4', 'A4'],
  'Em': ['E3', 'G3', 'B3'],
  'C': ['C4', 'E4', 'G4'],
  'Am': ['A3', 'C4', 'E4'],
  'F': ['F3', 'A3', 'C4'],
  'Dm9': ['D4', 'F4', 'A4', 'C5', 'E5'],
  'G13': ['G3', 'B3', 'F4', 'E5'],
  'A7': ['A3', 'C#4', 'E4', 'G4'],
  'C7': ['C4', 'E4', 'G4', 'Bb4'],
  'F7': ['F3', 'A3', 'C4', 'Eb4']
};

export const JamBandView: React.FC = () => {
  const [selectedStyle, setSelectedStyle] = useState<JamStyle>('jazz');
  const [bpm, setBpm] = useState<number>(120);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentBar, setCurrentBar] = useState<number>(0);
  
  // Instrument toggles for the jam band
  const [activeInstruments, setActiveInstruments] = useState<Record<InstrumentType | 'drums', boolean>>({
    drums: true,
    bass: true,
    guitar: true,
    piano: true,
    strings: false,
    synth: false,
  });

  const styleConfig = JAM_STYLES.find(s => s.id === selectedStyle) || JAM_STYLES[0];
  const [chords, setChords] = useState<string[]>(styleConfig.defaultChords);

  useEffect(() => {
    const s = JAM_STYLES.find(item => item.id === selectedStyle);
    if (s) {
      setBpm(s.defaultBpm);
      setChords(s.defaultChords);
    }
  }, [selectedStyle]);

  useEffect(() => {
    if (!isPlaying) return;

    const intervalTime = (60 / bpm) * 1000 * 2; // 2 beats per bar
    const timer = setInterval(() => {
      setCurrentBar(prev => {
        const next = (prev + 1) % chords.length;
        playJamBar(chords[next]);
        return next;
      });
    }, intervalTime);

    // Play first bar immediately
    playJamBar(chords[0]);

    return () => clearInterval(timer);
  }, [isPlaying, bpm, chords]);

  const playJamBar = async (chordName: string) => {
    const chordNotes = CHORD_NOTES_MAP[chordName] || ['C4', 'E4', 'G4'];
    const rootNote = chordNotes[0].replace('4', '2').replace('3', '2');

    // 1. Drums (precisely scheduled in Web Audio API timeline)
    if (activeInstruments.drums) {
      audioEngine.playDrum('kick', 0);
      audioEngine.playDrum('hihat', 0.2);
      audioEngine.playDrum('snare', 0.4);
      audioEngine.playDrum('hihat', 0.6);
    }

    // 2. Bass
    if (activeInstruments.bass) {
      audioEngine.playNote(rootNote, '2n', 'bass');
    }

    // 3. Guitar / Piano chords
    if (activeInstruments.guitar) {
      audioEngine.playChord(chordNotes, '2n', 'guitar');
    }
    if (activeInstruments.piano) {
      audioEngine.playChord(chordNotes, '2n', 'piano');
    }
    if (activeInstruments.strings) {
      audioEngine.playChord(chordNotes, '1n', 'strings');
    }
  };

  const toggleInstrument = (inst: InstrumentType | 'drums') => {
    setActiveInstruments(prev => ({ ...prev, [inst]: !prev[inst] }));
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-amber-400" />
            Jam Band Accompaniment Studio
          </h2>
          <p className="text-sm text-slate-400 mt-1">Play along with a virtual rhythm section (Bass, Guitar, Drums, Piano, Strings).</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-xl border border-slate-700">
            <span className="text-xs text-slate-400">BPM:</span>
            <input
              type="number"
              min="60"
              max="180"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-14 bg-slate-900 text-white text-center text-sm font-bold rounded px-1 outline-none"
            />
          </div>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
              isPlaying ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-lg shadow-amber-500/20'
            }`}
          >
            {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            {isPlaying ? 'Stop Jam Session' : 'Start Jam Session'}
          </button>
        </div>
      </div>

      {/* Style Presets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {JAM_STYLES.map((style) => (
          <div
            key={style.id}
            onClick={() => setSelectedStyle(style.id)}
            className={`p-5 rounded-2xl border cursor-pointer transition-all ${
              selectedStyle === style.id
                ? 'bg-slate-900 border-amber-500 shadow-lg shadow-amber-500/10'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">{style.name}</h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-amber-400">{style.defaultBpm} BPM</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">{style.description}</p>
          </div>
        ))}
      </div>

      {/* Backing Instruments & Chord Progression Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Instruments Panel */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            Virtual Band Members
          </h3>
          <div className="space-y-2.5">
            {(['drums', 'bass', 'guitar', 'piano', 'strings'] as (InstrumentType | 'drums')[]).map((inst) => (
              <div
                key={inst}
                onClick={() => toggleInstrument(inst)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  activeInstruments[inst]
                    ? 'bg-slate-800 border-amber-500/60 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}
              >
                <span className="text-sm font-semibold capitalize">{inst}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${activeInstruments[inst] ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                  {activeInstruments[inst] ? 'Active' : 'Muted'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chord Progression Bars */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Disc className="w-4 h-4 text-amber-400" />
              Chord Progression (Looping)
            </h3>
            <p className="text-xs text-slate-400 mt-1">The band will cycle through these chords in real time.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-4">
            {chords.map((chord, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                  isPlaying && currentBar === idx
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xl scale-105'
                    : 'bg-slate-800/80 border-slate-700 text-white'
                }`}
              >
                <div className="text-xs opacity-60">Bar {idx + 1}</div>
                <div className="text-2xl font-bold mt-1">{chord}</div>
              </div>
            ))}
          </div>

          <div className="text-xs text-slate-400 bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
            {isPlaying ? '🎸 Jam session active! Play along on your keyboard or piano tab.' : 'Click "Start Jam Session" to begin the backing track.'}
          </div>
        </div>
      </div>
    </div>
  );
};
