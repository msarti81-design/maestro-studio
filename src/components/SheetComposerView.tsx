import React, { useState, useEffect, useRef } from 'react';
import { SheetSong, NoteEvent } from '../types';
import { PRESET_SONGS } from '../data/songs';
import { audioEngine } from '../utils/audioEngine';
import { Play, Square, Plus, Trash2, Download, BookOpen, Music, Volume2, Sparkles, FileText, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { formatNoteLabel } from '../utils/noteFormatting';

const PIANO_KEYS = [
  { note: 'C3', type: 'white' }, { note: 'C#3', type: 'black' },
  { note: 'D3', type: 'white' }, { note: 'D#3', type: 'black' },
  { note: 'E3', type: 'white' },
  { note: 'F3', type: 'white' }, { note: 'F#3', type: 'black' },
  { note: 'G3', type: 'white' }, { note: 'G#3', type: 'black' },
  { note: 'A3', type: 'white' }, { note: 'A#3', type: 'black' },
  { note: 'B3', type: 'white' },

  { note: 'C4', type: 'white' }, { note: 'C#4', type: 'black' },
  { note: 'D4', type: 'white' }, { note: 'D#4', type: 'black' },
  { note: 'E4', type: 'white' },
  { note: 'F4', type: 'white' }, { note: 'F#4', type: 'black' },
  { note: 'G4', type: 'white' }, { note: 'G#4', type: 'black' },
  { note: 'A4', type: 'white' }, { note: 'A#4', type: 'black' },
  { note: 'B4', type: 'white' },

  { note: 'C5', type: 'white' }, { note: 'C#5', type: 'black' },
  { note: 'D5', type: 'white' }, { note: 'D#5', type: 'black' },
  { note: 'E5', type: 'white' },
];

const AVAILABLE_NOTES = [
  'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
  'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
  'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5',
  'C6'
];

const BASS_NOTES = [
  'C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2',
  'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3'
];

const DURATIONS = ['16n', '8n', '4n', '2n', '1m'];

export const SheetComposerView: React.FC = () => {
  const [songs, setSongs] = useState<SheetSong[]>(() => PRESET_SONGS);
  const [selectedSongId, setSelectedSongId] = useState<string>(PRESET_SONGS[0].id);
  
  const currentSong = songs.find(s => s.id === selectedSongId) || songs[0];

  const [targetChannel, setTargetChannel] = useState<'melody' | 'bassline'>('melody');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeNoteIndex, setActiveNoteIndex] = useState<number>(-1);

  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, []);

  const updateCurrentSong = (updater: (s: SheetSong) => SheetSong) => {
    setSongs(prev => prev.map(s => s.id === currentSong.id ? updater(s) : s));
  };

  const playSingleNote = (note: string, duration = '4n', inst: 'piano' | 'bass' = 'piano') => {
    audioEngine.playNote(note, duration, inst);
  };

  const handlePianoKeyClick = (note: string) => {
    playSingleNote(note, '4n', targetChannel === 'melody' ? 'piano' : 'bass');

    if (targetChannel === 'melody') {
      const lastTime = currentSong.melody.length > 0 ? currentSong.melody[currentSong.melody.length - 1].time + 1 : 0;
      const newNote: NoteEvent = { note, duration: '4n', time: lastTime };
      updateCurrentSong(s => ({ ...s, melody: [...s.melody, newNote] }));
    } else {
      const lastTime = currentSong.bassline.length > 0 ? currentSong.bassline[currentSong.bassline.length - 1].time + 1 : 0;
      const newNote: NoteEvent = { note, duration: '2n', time: lastTime };
      updateCurrentSong(s => ({ ...s, bassline: [...s.bassline, newNote] }));
    }
  };

  const stopPlayback = () => {
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    setIsPlaying(false);
    setActiveNoteIndex(-1);
  };

  const startPlayback = () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    setIsPlaying(true);
    let step = 0;
    const melodyLen = currentSong.melody.length;
    const intervalMs = Math.max(120, (60 / Math.max(40, currentSong.bpm)) * 500);

    playbackTimerRef.current = setInterval(() => {
      if (step >= melodyLen) {
        stopPlayback();
        return;
      }

      setActiveNoteIndex(step);

      // Play melody note
      const mNote = currentSong.melody[step];
      if (mNote) {
        audioEngine.playNote(mNote.note, mNote.duration, 'piano');
      }

      // Play matching bass note if present
      const bNote = currentSong.bassline[step];
      if (bNote) {
        audioEngine.playNote(bNote.note, bNote.duration, 'bass');
      }

      step++;
    }, intervalMs);
  };

  const handleUpdateMelodyNote = (index: number, key: keyof NoteEvent, val: any) => {
    updateCurrentSong(s => {
      const updated = [...s.melody];
      updated[index] = { ...updated[index], [key]: val };
      return { ...s, melody: updated };
    });
  };

  const handleRemoveMelodyNote = (index: number) => {
    updateCurrentSong(s => ({
      ...s,
      melody: s.melody.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateBassNote = (index: number, key: keyof NoteEvent, val: any) => {
    updateCurrentSong(s => {
      const updated = [...s.bassline];
      updated[index] = { ...updated[index], [key]: val };
      return { ...s, bassline: updated };
    });
  };

  const handleRemoveBassNote = (index: number) => {
    updateCurrentSong(s => ({
      ...s,
      bassline: s.bassline.filter((_, i) => i !== index)
    }));
  };

  const handleCreateNewBlankSong = () => {
    const newId = `custom_${Date.now()}`;
    const newSong: SheetSong = {
      id: newId,
      title: 'Nuovo Spartito',
      description: 'Spartito personalizzato',
      key: 'DO Magg (C)',
      bpm: 100,
      timeSignature: '4/4',
      chords: ['C', 'G', 'Am', 'F'],
      melody: [
        { note: 'C4', duration: '4n', time: 0 },
        { note: 'E4', duration: '4n', time: 1 },
        { note: 'G4', duration: '4n', time: 2 },
        { note: 'C5', duration: '2n', time: 3 },
      ],
      bassline: [
        { note: 'C3', duration: '2n', time: 0 },
        { note: 'G2', duration: '2n', time: 2 },
      ]
    };
    setSongs([newSong, ...songs]);
    setSelectedSongId(newId);
  };

  const exportSongJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentSong, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${currentSong.title.toLowerCase().replace(/\s+/g, '-')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Toolbar & Title */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Sheet Composer & Visual Score
            </h2>
            <p className="text-xs text-slate-400">Tocca i tasti per aggiungere note o modifica la sequenza ritmica.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedSongId}
            onChange={(e) => {
              stopPlayback();
              setSelectedSongId(e.target.value);
            }}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-amber-500"
          >
            {songs.map(s => (
              <option key={s.id} value={s.id}>{s.title} ({s.key})</option>
            ))}
          </select>

          <button
            onClick={handleCreateNewBlankSong}
            className="px-3 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1"
            title="Crea Nuovo Spartito"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Nuovo</span>
          </button>

          <button
            onClick={startPlayback}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md ${
              isPlaying ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
            }`}
          >
            {isPlaying ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-slate-950" />}
            <span>{isPlaying ? 'Ferma Esecuzione' : 'Riproduci Spartito'}</span>
          </button>

          <button
            onClick={exportSongJson}
            className="px-3 py-2 text-xs font-bold bg-slate-800 text-slate-200 rounded-xl hover:bg-slate-750 flex items-center gap-1"
            title="Esporta in JSON"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Esporta</span>
          </button>
        </div>
      </div>

      {/* Song Metadata & BPM Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Titolo Brano</label>
          <input
            type="text"
            value={currentSong.title}
            onChange={(e) => updateCurrentSong(s => ({ ...s, title: e.target.value }))}
            className="w-full bg-slate-800 border border-slate-700 text-white font-bold text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-500"
          />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] text-slate-400 uppercase font-bold">Tempo (BPM)</label>
            <span className="text-xs font-mono font-bold text-amber-400">{currentSong.bpm} BPM</span>
          </div>
          <input
            type="range"
            min="50"
            max="180"
            value={currentSong.bpm}
            onChange={(e) => updateCurrentSong(s => ({ ...s, bpm: parseInt(e.target.value) }))}
            className="w-full accent-amber-500 bg-slate-800 h-2 rounded cursor-pointer mt-2"
          />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Tonalit&agrave;</label>
          <input
            type="text"
            value={currentSong.key}
            onChange={(e) => updateCurrentSong(s => ({ ...s, key: e.target.value }))}
            className="w-full bg-slate-800 border border-slate-700 text-white font-bold text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-500"
          />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Canale Attivo Tastiera</label>
          <div className="grid grid-cols-2 gap-1.5 mt-1">
            <button
              onClick={() => setTargetChannel('melody')}
              className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                targetChannel === 'melody'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Melodia
            </button>
            <button
              onClick={() => setTargetChannel('bassline')}
              className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                targetChannel === 'bassline'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Basso
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Piano Keyboard for Inputting Notes */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Music className="w-4 h-4 text-amber-400" />
            Tastiera Interattiva (Tocca qualsiasi tasto per inserire la nota)
          </span>
          <span className="text-[10px] font-bold text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            Aggiunge a: {targetChannel === 'melody' ? 'Melodia' : 'Linea di Basso'}
          </span>
        </div>

        <div className="relative h-32 w-full bg-slate-950 rounded-xl overflow-x-auto flex select-none p-1 border border-slate-800">
          {PIANO_KEYS.map((key) => {
            const isBlack = key.type === 'black';
            return (
              <button
                key={key.note}
                onClick={() => handlePianoKeyClick(key.note)}
                className={`relative shrink-0 border transition-all active:scale-95 ${
                  isBlack
                    ? 'w-6 h-20 -mx-3 bg-slate-800 hover:bg-amber-500 text-white z-10 rounded-b shadow-lg border-slate-900 text-[9px] font-bold flex items-end justify-center pb-1'
                    : 'w-10 h-28 bg-slate-100 hover:bg-amber-300 text-slate-900 z-0 rounded-b shadow border-slate-300 text-[10px] font-black flex items-end justify-center pb-1'
                }`}
              >
                {formatNoteLabel(key.note, 'latin', false)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Melody Notes Editor */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h3 className="font-bold text-white text-sm">Sequenza Melodia (Pianoforte)</h3>
            <span className="text-xs text-slate-400 font-mono">({currentSong.melody.length} note)</span>
          </div>

          <button
            onClick={() => handlePianoKeyClick('C4')}
            className="px-2.5 py-1 text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg border border-amber-500/30 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Aggiungi Nota</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {currentSong.melody.map((mNote, idx) => {
            const isActive = activeNoteIndex === idx;
            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                  isActive
                    ? 'bg-amber-500/25 border-amber-400 shadow-lg shadow-amber-500/20 scale-105'
                    : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => playSingleNote(mNote.note, mNote.duration, 'piano')}
                    className="text-sm font-black text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    title="Ascolta nota"
                  >
                    <Volume2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{formatNoteLabel(mNote.note, 'latin', true)}</span>
                  </button>

                  <button
                    onClick={() => handleRemoveMelodyNote(idx)}
                    className="text-slate-400 hover:text-red-400 p-0.5 rounded transition-colors"
                    title="Elimina nota"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block">Altezza</label>
                    <select
                      value={mNote.note}
                      onChange={(e) => handleUpdateMelodyNote(idx, 'note', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white font-bold text-xs rounded px-1.5 py-0.5"
                    >
                      {AVAILABLE_NOTES.map(n => (
                        <option key={n} value={n}>{formatNoteLabel(n, 'latin', true)} ({n})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block">Durata</label>
                    <select
                      value={mNote.duration}
                      onChange={(e) => handleUpdateMelodyNote(idx, 'duration', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded px-1.5 py-0.5"
                    >
                      <option value="16n">1/16 (Sedicesimo)</option>
                      <option value="8n">1/8 (Ottavo)</option>
                      <option value="4n">1/4 (Quarto)</option>
                      <option value="2n">1/2 (Met&agrave;)</option>
                      <option value="1m">1/1 (Intero)</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bassline Notes Editor */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h3 className="font-bold text-white text-sm">Sequenza Basso (Basso Elettrico)</h3>
            <span className="text-xs text-slate-400 font-mono">({currentSong.bassline.length} note)</span>
          </div>

          <button
            onClick={() => handlePianoKeyClick('C2')}
            className="px-2.5 py-1 text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg border border-emerald-500/30 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Aggiungi Basso</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {currentSong.bassline.map((bNote, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => playSingleNote(bNote.note, bNote.duration, 'bass')}
                  className="text-sm font-black text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  title="Ascolta nota basso"
                >
                  <Volume2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{formatNoteLabel(bNote.note, 'latin', true)}</span>
                </button>

                <button
                  onClick={() => handleRemoveBassNote(idx)}
                  className="text-slate-400 hover:text-red-400 p-0.5 rounded transition-colors"
                  title="Elimina nota basso"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <div>
                  <label className="text-[9px] text-slate-400 font-bold uppercase block">Nota Basso</label>
                  <select
                    value={bNote.note}
                    onChange={(e) => handleUpdateBassNote(idx, 'note', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white font-bold text-xs rounded px-1.5 py-0.5"
                  >
                    {BASS_NOTES.map(n => (
                      <option key={n} value={n}>{formatNoteLabel(n, 'latin', true)} ({n})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
