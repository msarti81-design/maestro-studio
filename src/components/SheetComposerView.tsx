import React, { useState, useEffect, useRef } from 'react';
import { SheetSong, NoteEvent } from '../types';
import { PRESET_SONGS } from '../data/songs';
import { audioEngine } from '../utils/audioEngine';
import {
  Play,
  Square,
  Plus,
  Trash2,
  Download,
  BookOpen,
  Music,
  Volume2,
  Save,
  Check,
  Copy,
  Share2,
  FileCode,
  Upload,
  X,
  FilePlus,
  Sparkles,
} from 'lucide-react';
import { formatNoteLabel } from '../utils/noteFormatting';
import { getSavedSheetSongs, saveCustomSheetSong, deleteCustomSheetSong } from '../utils/songStorage';

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

export const SheetComposerView: React.FC = () => {
  const [songs, setSongs] = useState<SheetSong[]>(() => {
    const saved = getSavedSheetSongs();
    return [...saved, ...PRESET_SONGS];
  });
  
  const [selectedSongId, setSelectedSongId] = useState<string>(() => {
    const saved = getSavedSheetSongs();
    return saved.length > 0 ? saved[0].id : PRESET_SONGS[0].id;
  });
  
  const currentSong = songs.find(s => s.id === selectedSongId) || songs[0] || PRESET_SONGS[0];

  const [targetChannel, setTargetChannel] = useState<'melody' | 'bassline'>('melody');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeNoteIndex, setActiveNoteIndex] = useState<number>(-1);

  // Modals & Feedback
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

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
    stopPlayback();
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
    saveCustomSheetSong(newSong);
    setSongs(prev => [newSong, ...prev]);
    setSelectedSongId(newId);
    showToast(`Creato "${newSong.title}". Ricorda di cliccare Salva quando modifichi!`);
  };

  const handleSaveSong = () => {
    saveCustomSheetSong(currentSong);
    showToast(`Spartito "${currentSong.title}" salvato nella memoria locale! Sincronizzato con il Pianoforte.`);
  };

  const handleDeleteCurrentSong = () => {
    if (confirm(`Sei sicuro di voler eliminare lo spartito "${currentSong.title}"?`)) {
      stopPlayback();
      deleteCustomSheetSong(currentSong.id);
      const remaining = songs.filter(s => s.id !== currentSong.id);
      setSongs(remaining.length > 0 ? remaining : PRESET_SONGS);
      setSelectedSongId(remaining[0]?.id || PRESET_SONGS[0].id);
      showToast('Spartito eliminato.');
    }
  };

  const showToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3800);
  };

  // Export handlers
  const jsonString = JSON.stringify(currentSong, null, 2);

  const handleDownloadFile = () => {
    try {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentSong.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_sheet.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
      showToast('File JSON scaricato con successo!');
    } catch (e) {
      console.error(e);
      // Fallback: Copy to clipboard
      handleCopyJson();
    }
  };

  const handleCopyJson = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(jsonString);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = jsonString;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
      showToast('JSON copiato negli appunti!');
    } catch (e) {
      alert('Non è stato possibile copiare automaticamente. Seleziona e copia il testo nel riquadro sottostante.');
    }
  };

  const handleShareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Spartito Maestro: ${currentSong.title}`,
          text: `Ecco il codice spartito per "${currentSong.title}":\n\n${jsonString}`,
        });
      } catch (e) {}
    } else {
      handleCopyJson();
    }
  };

  // Import handler
  const handleImportSubmit = () => {
    setImportError(null);
    try {
      const parsed = JSON.parse(importJsonText.trim());
      if (!parsed.title || (!parsed.melody && !parsed.notes)) {
        throw new Error('Il formato JSON deve contenere almeno un titolo e la lista delle note (melody).');
      }

      const newId = `imported_${Date.now()}`;
      const importedSong: SheetSong = {
        id: newId,
        title: parsed.title,
        description: parsed.description || 'Spartito importato',
        key: parsed.key || 'C major',
        bpm: parsed.bpm || 100,
        timeSignature: parsed.timeSignature || '4/4',
        chords: Array.isArray(parsed.chords) ? parsed.chords : ['C'],
        melody: Array.isArray(parsed.melody) ? parsed.melody : (Array.isArray(parsed.notes) ? parsed.notes : []),
        bassline: Array.isArray(parsed.bassline) ? parsed.bassline : [],
      };

      saveCustomSheetSong(importedSong);
      setSongs([importedSong, ...songs]);
      setSelectedSongId(newId);
      setIsImportModalOpen(false);
      setImportJsonText('');
      showToast(`Spartito "${importedSong.title}" importato e salvato con successo!`);
    } catch (err: any) {
      setImportError(err.message || 'Errore nella sintassi del JSON. Verifica il testo.');
    }
  };

  const isPreset = PRESET_SONGS.some(p => p.id === currentSong.id);

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-5 space-y-5">
      {/* Save Notification Toast */}
      {saveToast && (
        <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-amber-300 animate-in fade-in slide-in-from-top-4 duration-300 text-xs sm:text-sm">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Top Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white">
                Sheet Composer
              </h2>
              {isPreset ? (
                <span className="text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full">
                  Brano Predefinito
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Spartito Personale
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Tocca i tasti del piano per comporre o modifica le note nello spartito.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Song Selector */}
          <select
            value={selectedSongId}
            onChange={(e) => {
              stopPlayback();
              setSelectedSongId(e.target.value);
            }}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-amber-500"
          >
            {songs.map(s => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.key})
              </option>
            ))}
          </select>

          {/* New Score Button */}
          <button
            onClick={handleCreateNewBlankSong}
            className="px-3 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
            title="Crea un nuovo spartito da zero"
          >
            <FilePlus className="w-3.5 h-3.5 text-amber-400" />
            <span>Nuovo</span>
          </button>

          {/* SAVE BUTTON - Prominently highlighted */}
          <button
            onClick={handleSaveSong}
            className="px-3.5 py-2 text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-95"
            title="Salva le modifiche allo spartito nella memoria dell'app"
          >
            <Save className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Salva Spartito</span>
          </button>

          {/* Play/Stop Button */}
          <button
            onClick={startPlayback}
            className={`px-3.5 py-2 text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-md ${
              isPlaying
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
            }`}
          >
            {isPlaying ? (
              <Square className="w-3.5 h-3.5 fill-white" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-slate-950" />
            )}
            <span>{isPlaying ? 'Ferma' : 'Riproduci'}</span>
          </button>

          {/* Export Button */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
            title="Esporta o condividi spartito"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Esporta</span>
          </button>

          {/* Import Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-2.5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl border border-slate-700 flex items-center gap-1 transition-colors"
            title="Importa codice spartito JSON"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Importa</span>
          </button>

          {/* Delete Button (for custom songs) */}
          {!isPreset && (
            <button
              onClick={handleDeleteCurrentSong}
              className="p-2 text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/30 flex items-center transition-colors"
              title="Elimina questo spartito"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Song Metadata & BPM Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <label className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-1">
            Titolo Brano
          </label>
          <input
            type="text"
            value={currentSong.title}
            onChange={(e) => updateCurrentSong(s => ({ ...s, title: e.target.value }))}
            className="w-full bg-slate-800 border border-slate-700 text-white font-bold text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-500"
          />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] text-slate-400 uppercase font-black tracking-wider">
              Tempo (BPM)
            </label>
            <span className="text-xs font-mono font-bold text-amber-400">{currentSong.bpm} BPM</span>
          </div>
          <input
            type="range"
            min="50"
            max="180"
            value={currentSong.bpm}
            onChange={(e) => updateCurrentSong(s => ({ ...s, bpm: parseInt(e.target.value) }))}
            className="w-full accent-amber-500 bg-slate-800 h-2 rounded cursor-pointer mt-1"
          />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <label className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-1">
            Tonalit&agrave;
          </label>
          <input
            type="text"
            value={currentSong.key}
            onChange={(e) => updateCurrentSong(s => ({ ...s, key: e.target.value }))}
            className="w-full bg-slate-800 border border-slate-700 text-white font-bold text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-500"
          />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <label className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-1">
            Destinazione Tasti Piano
          </label>
          <div className="grid grid-cols-2 gap-1.5 mt-0.5">
            <button
              onClick={() => setTargetChannel('melody')}
              className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                targetChannel === 'melody'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Melodia 🎹
            </button>
            <button
              onClick={() => setTargetChannel('bassline')}
              className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                targetChannel === 'bassline'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Basso 🎸
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Piano Keyboard for Inputting Notes */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2 shadow-lg">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Music className="w-4 h-4 text-amber-400" />
            Tastiera Interattiva (Tocca qualsiasi tasto per inserire la nota nello spartito)
          </span>
          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
            targetChannel === 'melody'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}>
            Canale: {targetChannel === 'melody' ? 'Melodia' : 'Linea di Basso'}
          </span>
        </div>

        <div className="relative h-28 w-full bg-slate-950 rounded-xl overflow-x-auto flex select-none p-1 border border-slate-800">
          {PIANO_KEYS.map((key) => {
            const isBlack = key.type === 'black';
            return (
              <button
                key={key.note}
                onClick={() => handlePianoKeyClick(key.note)}
                className={`relative shrink-0 border transition-all active:scale-95 ${
                  isBlack
                    ? 'w-6 h-16 -mx-3 bg-slate-800 hover:bg-amber-500 text-white z-10 rounded-b shadow-lg border-slate-900 text-[9px] font-bold flex items-end justify-center pb-1'
                    : 'w-9 h-24 bg-slate-100 hover:bg-amber-300 text-slate-900 z-0 rounded-b shadow border-slate-300 text-[10px] font-black flex items-end justify-center pb-1'
                }`}
              >
                {formatNoteLabel(key.note, 'latin', false)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Melody Notes Editor */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h3 className="font-bold text-white text-sm">Sequenza Melodia (Pianoforte)</h3>
            <span className="text-xs text-slate-400 font-mono">({currentSong.melody.length} note)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePianoKeyClick('C4')}
              className="px-2.5 py-1 text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg border border-amber-500/30 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Aggiungi Nota</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {currentSong.melody.map((mNote, idx) => {
            const isActive = activeNoteIndex === idx;
            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                  isActive
                    ? 'bg-amber-500/30 border-amber-400 shadow-lg shadow-amber-500/20 scale-105'
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
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h3 className="font-bold text-white text-sm">Sequenza Basso (Basso Elettrico)</h3>
            <span className="text-xs text-slate-400 font-mono">({currentSong.bassline.length} note)</span>
          </div>

          <button
            onClick={() => handlePianoKeyClick('C2')}
            className="px-2.5 py-1 text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg border border-emerald-500/30 flex items-center gap-1 transition-colors"
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

      {/* EXPORT MODAL */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-850 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Esporta Spartito & Condividi</h3>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              <p className="text-slate-300">
                Puoi scaricare il file JSON dello spartito, copiarlo per inviarlo ad amici, oppure salvarlo in locale.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  onClick={handleDownloadFile}
                  className="py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Scarica File .JSON</span>
                </button>

                <button
                  onClick={handleCopyJson}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  {copiedNotification ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                      <span className="text-emerald-400">Copiato!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-amber-400" />
                      <span>Copia negli Appunti</span>
                    </>
                  )}
                </button>
              </div>

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={handleShareNative}
                  className="w-full py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Condividi tramite App (WhatsApp, Telegram, Mail...)</span>
                </button>
              )}

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5">
                  Codice JSON Spartito
                </label>
                <textarea
                  readOnly
                  value={jsonString}
                  rows={8}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-amber-300/90 select-all outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-850 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold rounded-xl text-xs"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-850 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">Importa Spartito da JSON</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              <p className="text-slate-300">
                Incolla qui sotto il codice JSON di uno spartito esportato da Maestro Studio o seleziona un file dal dispositivo.
              </p>

              <div>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        setImportJsonText(String(evt.target?.result || ''));
                      };
                      reader.readAsText(file);
                    }
                  }}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-amber-400 hover:file:bg-slate-700 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5">
                  Testo JSON dello spartito
                </label>
                <textarea
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder="Incolla qui il JSON..."
                  rows={8}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-white outline-none focus:border-indigo-500"
                />
              </div>

              {importError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 font-bold text-xs">
                  {importError}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-850 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-xs"
              >
                Annulla
              </button>
              <button
                onClick={handleImportSubmit}
                disabled={!importJsonText.trim()}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-all"
              >
                Carica Spartito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
