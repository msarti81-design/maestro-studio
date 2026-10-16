import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SheetSong, NoteEvent, NoteNotationFormat } from '../types';
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
  Upload,
  X,
  FilePlus,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Disc,
  MessageCircle,
} from 'lucide-react';
import { formatNoteLabel } from '../utils/noteFormatting';
import { getSavedSheetSongs, saveCustomSheetSong, deleteCustomSheetSong } from '../utils/songStorage';
import { downloadJson, downloadMidi, createMidiBlob } from '../utils/midiExport';
import { LightweightSheetKeyboard } from './LightweightSheetKeyboard';
import { ALL_PIANO_KEYS, ALL_WHITE_KEYS } from '../data/pianoKeys';

// Base keys generator for dynamic octave range
const NOTE_PATTERNS = [
  { note: 'C', type: 'white' as const },
  { note: 'C#', type: 'black' as const },
  { note: 'D', type: 'white' as const },
  { note: 'D#', type: 'black' as const },
  { note: 'E', type: 'white' as const },
  { note: 'F', type: 'white' as const },
  { note: 'F#', type: 'black' as const },
  { note: 'G', type: 'white' as const },
  { note: 'G#', type: 'black' as const },
  { note: 'A', type: 'white' as const },
  { note: 'A#', type: 'black' as const },
  { note: 'B', type: 'white' as const },
];

const AVAILABLE_NOTES = [
  'C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2',
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
    const seen = new Set<string>();
    const result: SheetSong[] = [];

    for (const s of saved) {
      if (s && s.id && !seen.has(s.id)) {
        seen.add(s.id);
        result.push(s);
      }
    }

    for (const p of PRESET_SONGS) {
      if (p && p.id && !seen.has(p.id)) {
        seen.add(p.id);
        result.push(p);
      }
    }

    return result;
  });

  const [selectedSongId, setSelectedSongId] = useState<string>(() => {
    const saved = getSavedSheetSongs();
    return saved.length > 0 ? saved[0].id : PRESET_SONGS[0].id;
  });

  const currentSong = songs.find(s => s.id === selectedSongId) || songs[0] || PRESET_SONGS[0];

  const [targetChannel, setTargetChannel] = useState<'melody' | 'bassline'>('melody');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeNoteIndex, setActiveNoteIndex] = useState<number>(-1);

  // 88-Key Navigation and Realistic Piano Keyboard Layout
  const [keyboardLayout, setKeyboardLayout] = useState<'compact' | 'balanced' | 'extended'>('balanced');
  const windowSize = keyboardLayout === 'compact' ? 14 : keyboardLayout === 'extended' ? 28 : 21;
  const maxStartWhiteIdx = Math.max(0, ALL_WHITE_KEYS.length - windowSize);
  const [startWhiteKeyIdx, setStartWhiteKeyIdx] = useState<number>(() => Math.min(16, maxStartWhiteIdx));
  const clampedStartWhiteIdx = Math.min(startWhiteKeyIdx, maxStartWhiteIdx);

  const currentlyPressedNotesRef = useRef<Set<string>>(new Set());

  const GAMEPLAY_KEYS = useMemo(() => {
    const startWhite = ALL_WHITE_KEYS[clampedStartWhiteIdx] || ALL_WHITE_KEYS[0];
    const endWhiteIdx = Math.min(ALL_WHITE_KEYS.length - 1, clampedStartWhiteIdx + windowSize - 1);
    const endWhite = ALL_WHITE_KEYS[endWhiteIdx];

    const startIndex = ALL_PIANO_KEYS.findIndex((k) => k.note === startWhite.note);
    let endIndex = ALL_PIANO_KEYS.findIndex((k) => k.note === endWhite.note);

    if (endIndex < ALL_PIANO_KEYS.length - 1 && ALL_PIANO_KEYS[endIndex + 1].type === 'black') {
      endIndex += 1;
    }

    return ALL_PIANO_KEYS.slice(startIndex, endIndex + 1);
  }, [clampedStartWhiteIdx, windowSize]);

  // Note notation format (Latin Do-Re-Mi, Anglo-Saxon C-D-E, etc.)
  const [noteNotation, setNoteNotation] = useState<NoteNotationFormat>(() => {
    try {
      return (localStorage.getItem('maestro_note_notation') as NoteNotationFormat) || 'latin';
    } catch (e) {
      return 'latin';
    }
  });

  // Selected Note Duration for Lightweight Keyboard
  const [selectedDuration, setSelectedDuration] = useState<string>('4n');

  // Track unsaved modifications
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(true);

  // Modals & Feedback
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio context eagerly on mount
  useEffect(() => {
    audioEngine.init().catch(() => {});
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  const showToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3500);
  };

  const isPreset = PRESET_SONGS.some(p => p.id === currentSong.id);

  // Update song helper with auto-save
  const updateCurrentSong = (updater: (s: SheetSong) => SheetSong) => {
    setSongs(prev => prev.map(s => {
      if (s.id === currentSong.id) {
        const updated = updater(s);
        setHasUnsavedChanges(true);

        // Auto-save debounced if enabled
        if (autoSaveEnabled) {
          if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
          autoSaveTimerRef.current = setTimeout(() => {
            saveCustomSheetSong(updated);
            setHasUnsavedChanges(false);
          }, 1200);
        }

        return updated;
      }
      return s;
    }));
  };

  const playSingleNote = (note: string, duration = '4n', inst: 'piano' | 'bass' = 'piano') => {
    audioEngine.init().catch(() => {});
    audioEngine.playNote(note, duration, inst);
  };

  const handlePianoKeyClick = (note: string, durationOverride?: string) => {
    audioEngine.init().catch(() => {});
    const duration = durationOverride || selectedDuration || '4n';
    playSingleNote(note, duration, targetChannel === 'melody' ? 'piano' : 'bass');

    if (targetChannel === 'melody') {
      const lastTime = currentSong.melody.length > 0 ? currentSong.melody[currentSong.melody.length - 1].time + 1 : 0;
      const newNote: NoteEvent = { note, duration, time: lastTime };
      updateCurrentSong(s => ({ ...s, melody: [...s.melody, newNote] }));
    } else {
      const lastTime = currentSong.bassline.length > 0 ? currentSong.bassline[currentSong.bassline.length - 1].time + 1 : 0;
      const newNote: NoteEvent = { note, duration: durationOverride || '2n', time: lastTime };
      updateCurrentSong(s => ({ ...s, bassline: [...s.bassline, newNote] }));
    }
  };

  const handleCanvasNoteDown = (note: string) => {
    currentlyPressedNotesRef.current.add(note);
    handlePianoKeyClick(note);
  };

  const handleCanvasNoteUp = (note: string) => {
    currentlyPressedNotesRef.current.delete(note);
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

    audioEngine.init().catch(() => {});
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
      title: 'Nuova Composizione',
      description: 'Spartito personalizzato',
      key: 'DO Magg (C)',
      bpm: 100,
      timeSignature: '4/4',
      chords: ['C', 'G', 'Am', 'F'],
      melody: [],
      bassline: []
    };
    saveCustomSheetSong(newSong);
    setSongs(prev => [newSong, ...prev]);
    setSelectedSongId(newId);
    setHasUnsavedChanges(false);
    showToast(`Creato "${newSong.title}". Tocca i tasti del pianoforte per comporre la tua musica!`);
  };

  const handleClearMelody = () => {
    if (currentSong.melody.length === 0) return;
    if (confirm('Vuoi cancellare tutte le note della melodia del pianoforte?')) {
      stopPlayback();
      updateCurrentSong(s => ({ ...s, melody: [] }));
      showToast('Melodia del pianoforte svuotata.');
    }
  };

  const handleClearBassline = () => {
    if (currentSong.bassline.length === 0) return;
    if (confirm('Vuoi cancellare tutte le note del basso?')) {
      stopPlayback();
      updateCurrentSong(s => ({ ...s, bassline: [] }));
      showToast('Linea di basso svuotata.');
    }
  };

  // Explicit Save Action
  const handleSaveSong = () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    saveCustomSheetSong(currentSong);
    setHasUnsavedChanges(false);
    showToast(`✓ Spartito "${currentSong.title}" salvato con successo! Sincronizzato con il Pianoforte.`);
  };

  const handleDeleteCurrentSong = () => {
    if (confirm(`Sei sicuro di voler eliminare lo spartito "${currentSong.title}"?`)) {
      stopPlayback();
      deleteCustomSheetSong(currentSong.id);
      const remaining = songs.filter(s => s.id !== currentSong.id);
      setSongs(remaining.length > 0 ? remaining : PRESET_SONGS);
      setSelectedSongId(remaining[0]?.id || PRESET_SONGS[0].id);
      setHasUnsavedChanges(false);
      showToast('Spartito eliminato.');
    }
  };

  const safeFilenameBase = (currentSong.title || 'spartito')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');

  // Direct MIDI Download
  const handleDirectDownloadMidi = () => {
    try {
      const filename = `${safeFilenameBase}.mid`;
      const ok = downloadMidi(filename, currentSong);
      if (ok) {
        showToast(`🎹 Download avviato per "${filename}"!`);
      } else {
        showToast('Download MIDI non riuscito sul tuo browser.');
      }
    } catch (e) {
      console.error('MIDI export error:', e);
      showToast('Errore durante la creazione del file MIDI');
    }
  };

  // Direct JSON Download
  const handleDirectDownloadJson = () => {
    try {
      const filename = `${safeFilenameBase}_sheet.json`;
      const ok = downloadJson(filename, currentSong);
      if (ok) {
        showToast(`📄 Download avviato per "${filename}"!`);
      } else {
        showToast('Download JSON non riuscito sul tuo browser.');
      }
    } catch (e) {
      console.error('JSON export error:', e);
      showToast('Errore durante il salvataggio del JSON');
    }
  };

  const jsonString = JSON.stringify(currentSong, null, 2);

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
      showToast('Seleziona e copia il codice JSON nel riquadro sottostante.');
    }
  };

  const handleWhatsAppShareSong = (song: SheetSong) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${baseUrl}/#sheet?title=${encodeURIComponent(song.title)}`;
    const text = `🎼 *SPARTITO MAESTRO STUDIO*\n*${song.title}* (${song.key}, ${song.bpm} BPM)\n\nAscolta e suona questo spartito su Maestro Studio!\n🔗 ${shareUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    if (typeof window !== 'undefined') {
      window.location.href = waUrl;
    }
    showToast('Apertura WhatsApp...');
  };

  const handleImportSubmit = () => {
    setImportError(null);
    const text = importJsonText.trim();
    if (!text) return;

    try {
      if (text.startsWith('<')) {
        // XML / MusicXML Score Parsing
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');

        const titleEl = xmlDoc.querySelector('work-title') || xmlDoc.querySelector('movement-title');
        const title = titleEl?.textContent?.trim() || 'Spartito XML Importato';

        const noteNodes = xmlDoc.querySelectorAll('note');
        const melody: NoteEvent[] = [];

        let currentStep = 0;
        noteNodes.forEach((node) => {
          const isRest = node.querySelector('rest') !== null;
          if (isRest) {
            currentStep++;
            return;
          }

          const pitchNode = node.querySelector('pitch');
          if (pitchNode) {
            const step = pitchNode.querySelector('step')?.textContent || 'C';
            const alter = pitchNode.querySelector('alter')?.textContent || '';
            const octave = pitchNode.querySelector('octave')?.textContent || '4';

            let acc = '';
            if (alter === '1') acc = '#';
            else if (alter === '-1') acc = 'b';

            const noteName = `${step}${acc}${octave}`;
            const typeNode = node.querySelector('type')?.textContent;
            let duration = '4n';
            if (typeNode === 'eighth') duration = '8n';
            else if (typeNode === '16th') duration = '16n';
            else if (typeNode === 'half') duration = '2n';
            else if (typeNode === 'whole') duration = '1m';

            melody.push({ note: noteName, duration, time: currentStep });
            currentStep++;
          }
        });

        if (melody.length === 0) {
          throw new Error('Nessuna nota valida trovata nel file XML/MusicXML.');
        }

        const newId = `xml_${Date.now()}`;
        const importedSong: SheetSong = {
          id: newId,
          title,
          description: 'Spartito importato da file XML',
          key: 'DO Magg (C)',
          bpm: 100,
          timeSignature: '4/4',
          chords: ['C', 'G', 'Am', 'F'],
          melody,
          bassline: [],
        };

        saveCustomSheetSong(importedSong);
        setSongs([importedSong, ...songs]);
        setSelectedSongId(newId);
        setIsImportModalOpen(false);
        setImportJsonText('');
        setHasUnsavedChanges(false);
        showToast(`Spartito XML "${importedSong.title}" importato con successo!`);
        return;
      }

      // JSON Parsing
      const parsed = JSON.parse(text);
      if (!parsed.title || (!parsed.melody && !parsed.notes)) {
        throw new Error('Il formato JSON deve contenere almeno un titolo e la lista delle note (melody).');
      }

      const newId = `imported_${Date.now()}`;
      const importedSong: SheetSong = {
        id: newId,
        title: parsed.title,
        description: parsed.description || 'Spartito importato',
        key: parsed.key || 'DO Magg (C)',
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
      setHasUnsavedChanges(false);
      showToast(`Spartito "${importedSong.title}" importato e salvato con successo!`);
    } catch (err: any) {
      setImportError(err.message || 'Errore nella sintassi del file JSON/XML. Verifica il contenuto.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-4 space-y-4 select-none">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-amber-300 animate-in fade-in slide-in-from-top-4 duration-300 text-xs sm:text-sm">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* REVOLUTIONARY CONSOLE HEADER & UNMISSABLE SAVE CONTROLS */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 p-3 sm:p-4 rounded-2xl shadow-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Title, Preset Badge & Quick Song Selector */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 shrink-0 font-serif text-lg font-bold">
            🎼
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={currentSong.title}
                onChange={(e) => updateCurrentSong(s => ({ ...s, title: e.target.value }))}
                placeholder="Titolo Spartito..."
                className="bg-slate-800/80 hover:bg-slate-800 focus:bg-slate-800 text-white font-black text-sm sm:text-base px-2 py-0.5 rounded-lg border border-slate-700 focus:border-amber-400 outline-none max-w-[220px] sm:max-w-[280px] truncate"
                title="Modifica titolo dello spartito"
              />

              {isPreset ? (
                <span className="text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full">
                  Predefinito
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Disc className="w-2.5 h-2.5" />
                  <span>Personale</span>
                </span>
              )}

              {/* Unsaved Changes Visual Indicator */}
              {hasUnsavedChanges ? (
                <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Modifiche non salvate</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                  <span>Salvato</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              {/* Song Select Dropdown */}
              <select
                value={selectedSongId}
                onChange={(e) => {
                  stopPlayback();
                  setSelectedSongId(e.target.value);
                  setHasUnsavedChanges(false);
                }}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-bold rounded-lg px-2 py-1 outline-none focus:border-amber-400 max-w-[180px] sm:max-w-[220px] truncate cursor-pointer"
              >
                {songs.map((s, idx) => (
                  <option key={`${s.id}-${idx}`} value={s.id}>
                    {s.title} ({s.key})
                  </option>
                ))}
              </select>

              <button
                onClick={handleCreateNewBlankSong}
                className="px-2 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-750 text-amber-300 rounded-lg border border-slate-700 flex items-center gap-1 transition-colors whitespace-nowrap active:scale-95"
                title="Crea nuovo spartito vuoto"
              >
                <FilePlus className="w-3 h-3 text-amber-400" />
                <span>+ Nuovo</span>
              </button>

              {!isPreset && (
                <button
                  onClick={handleDeleteCurrentSong}
                  className="p-1 text-slate-400 hover:text-red-400 bg-slate-800 rounded-lg border border-slate-700 transition-colors"
                  title="Elimina questo spartito"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* PROMINENT ACTION BUTTONS: SAVE, MIDI, EXPORT, PLAY */}
        <div className="flex items-center gap-2 flex-wrap shrink-0 justify-end">
          {/* PLAY / STOP BUTTON */}
          <button
            onClick={startPlayback}
            className={`px-3.5 py-2 text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
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
            <span>{isPlaying ? 'Ferma' : 'Ascolta'}</span>
          </button>

          {/* UNMISSABLE SAVE SPARTITO BUTTON */}
          <button
            onClick={handleSaveSong}
            className={`px-3.5 py-2 text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
              hasUnsavedChanges
                ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 ring-2 ring-emerald-300 ring-offset-2 ring-offset-slate-950 animate-bounce'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            title="Salva le modifiche allo spartito nella memoria dell'app"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            <span>SALVA SPARTITO</span>
          </button>

          {/* DIRECT MIDI EXPORT BUTTON */}
          <button
            onClick={handleDirectDownloadMidi}
            className="px-3 py-2 text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            title="Scarica direttamente il file MIDI (.mid) della tua composizione"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Scarica MIDI</span>
          </button>

          {/* EXPORT / BACKUP MODAL BUTTON */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-2.5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1 transition-colors"
            title="Opzioni complete di esportazione, JSON e condivisione"
          >
            <Share2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Esporta</span>
          </button>

          {/* IMPORT MODAL BUTTON */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-2.5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl border border-slate-700 flex items-center gap-1 transition-colors"
            title="Importa codice spartito JSON"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Importa</span>
          </button>
        </div>
      </div>

      {/* SONG SETTINGS BAR: BPM, TONALITY & CHANNEL ROUTING */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl">
        {/* BPM Range */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Tempo (BPM)</span>
            <span className="text-xs font-mono font-bold text-amber-400">{currentSong.bpm}</span>
          </div>
          <input
            type="range"
            min="50"
            max="180"
            value={currentSong.bpm}
            onChange={(e) => updateCurrentSong(s => ({ ...s, bpm: parseInt(e.target.value) }))}
            className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded cursor-pointer"
          />
        </div>

        {/* Musical Key */}
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Tonalit&agrave;</span>
          <input
            type="text"
            value={currentSong.key}
            onChange={(e) => updateCurrentSong(s => ({ ...s, key: e.target.value }))}
            className="w-full bg-slate-800 border border-slate-700 text-white font-bold text-xs rounded-lg px-2 py-1 outline-none focus:border-amber-400"
          />
        </div>

        {/* Input Target Channel */}
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Destinazione Note</span>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setTargetChannel('melody')}
              className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                targetChannel === 'melody'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Piano 🎹
            </button>
            <button
              onClick={() => setTargetChannel('bassline')}
              className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                targetChannel === 'bassline'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Basso 🎸
            </button>
          </div>
        </div>

        {/* Auto-Save & Notation Info */}
        <div className="flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Salvataggio Auto</span>
          <button
            onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
            className={`py-1 px-2 text-[11px] font-bold rounded-lg border flex items-center justify-center gap-1 transition-all ${
              autoSaveEnabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <span>{autoSaveEnabled ? 'Auto-Save: Attivo' : 'Auto-Save: Disattivato'}</span>
          </button>
        </div>
      </div>

      {/* DEDICATED LIGHTWEIGHT KEYBOARD FOR INSTANT FAST NOTE COMPOSITION */}
      <LightweightSheetKeyboard
        onNoteClick={(note, dur) => handlePianoKeyClick(note, dur)}
        targetChannel={targetChannel}
        noteNotation={noteNotation}
        selectedDuration={selectedDuration}
        onDurationChange={setSelectedDuration}
        onNotationToggle={() => {
          const next = noteNotation === 'latin' ? 'letter' : 'latin';
          setNoteNotation(next);
          try {
            localStorage.setItem('maestro_note_notation', next);
          } catch (e) {}
        }}
      />

      {/* MELODY NOTES SEQUENCE (Pianoforte) */}
      <div className="bg-slate-900 border border-slate-800 p-3 sm:p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
            <h3 className="font-bold text-white text-sm">Sequenza Melodia (Pianoforte)</h3>
            <span className="text-xs text-slate-400 font-mono">({currentSong.melody.length} note)</span>
          </div>

          <div className="flex items-center gap-2">
            {currentSong.melody.length > 0 && (
              <button
                onClick={handleClearMelody}
                className="px-2.5 py-1 text-xs font-bold bg-red-500/15 hover:bg-red-500/25 text-red-300 rounded-lg border border-red-500/30 flex items-center gap-1 transition-colors"
                title="Svuota e cancella tutte le note della melodia"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Svuota Melodia</span>
              </button>
            )}

            <button
              onClick={() => handlePianoKeyClick('C4')}
              className="px-2.5 py-1 text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg border border-amber-500/30 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Aggiungi Nota</span>
            </button>
          </div>
        </div>

        {currentSong.melody.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
            Nessuna nota nella melodia. Tocca qualsiasi tasto del pianoforte sopra per aggiungere note!
          </div>
        ) : (
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
                      <span>{formatNoteLabel(mNote.note, noteNotation, true)}</span>
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
                          <option key={n} value={n}>{formatNoteLabel(n, noteNotation, true)} ({n})</option>
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
        )}
      </div>

      {/* BASSLINE SEQUENCE (Basso) */}
      <div className="bg-slate-900 border border-slate-800 p-3 sm:p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <h3 className="font-bold text-white text-sm">Sequenza Basso (Basso Elettrico)</h3>
            <span className="text-xs text-slate-400 font-mono">({currentSong.bassline.length} note)</span>
          </div>

          <div className="flex items-center gap-2">
            {currentSong.bassline.length > 0 && (
              <button
                onClick={handleClearBassline}
                className="px-2.5 py-1 text-xs font-bold bg-red-500/15 hover:bg-red-500/25 text-red-300 rounded-lg border border-red-500/30 flex items-center gap-1 transition-colors"
                title="Svuota e cancella tutte le note del basso"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Svuota Basso</span>
              </button>
            )}

            <button
              onClick={() => handlePianoKeyClick('C2')}
              className="px-2.5 py-1 text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg border border-emerald-500/30 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Aggiungi Basso</span>
            </button>
          </div>
        </div>

        {currentSong.bassline.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
            Nessuna nota nella linea di basso. Seleziona &quot;Basso 🎸&quot; in alto e tocca i tasti per aggiungerne!
          </div>
        ) : (
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
                    <span>{formatNoteLabel(bNote.note, noteNotation, true)}</span>
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
                        <option key={n} value={n}>{formatNoteLabel(n, noteNotation, true)} ({n})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block">Durata</label>
                    <select
                      value={bNote.duration}
                      onChange={(e) => handleUpdateBassNote(idx, 'duration', e.target.value)}
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
            ))}
          </div>
        )}
      </div>

      {/* EXPORT MODAL (Direct JSON & MIDI Download) */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-850 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Esporta Spartito &amp; Condividi</h3>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* MIDI File Section */}
              <div className="p-4 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black text-xs shadow">
                    MIDI
                  </div>
                  <div>
                    <h4 className="font-black text-white text-xs">File Musicale Standard MIDI (.mid)</h4>
                    <p className="text-[10px] text-amber-300/80">
                      Include melodia (Pianoforte) e linea di basso a {currentSong.bpm} BPM. Compatibile con GarageBand, Logic, Synthesia, FL Studio e tastiere fisiche.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleDirectDownloadMidi}
                    className="py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Scarica MIDI (.mid)</span>
                  </button>

                  <button
                    onClick={() => handleWhatsAppShareSong(currentSong)}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4 fill-white shrink-0" />
                    <span>Condividi su WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* JSON Sheet File Section */}
              <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-black text-xs shadow">
                    JSON
                  </div>
                  <div>
                    <h4 className="font-black text-white text-xs">File Spartito Maestro Studio (.json)</h4>
                    <p className="text-[10px] text-slate-400">
                      Salva o fai il backup completo della tua composizione con tutte le note e impostazioni.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={handleDirectDownloadJson}
                    className="py-2.5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Scarica JSON</span>
                  </button>

                  <button
                    onClick={handleCopyJson}
                    className="py-2.5 px-2 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    {copiedNotification ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                        <span className="text-emerald-400">Copiato!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-amber-400" />
                        <span>Copia Codice</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleWhatsAppShareSong(currentSong)}
                    className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-white shrink-0" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* JSON Text Viewer */}
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                  Anteprima Codice JSON
                </label>
                <textarea
                  readOnly
                  value={jsonString}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-[10px] text-amber-300/80 select-all outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-850 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold rounded-xl text-xs cursor-pointer"
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
                <h3 className="font-bold text-white text-sm">Importa Spartito (XML / JSON)</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              <p className="text-slate-300">
                Seleziona un file <strong>XML / MusicXML</strong> o <strong>JSON</strong> dal dispositivo oppure incolla direttamente il testo qui sotto.
              </p>

              <div>
                <input
                  id="sheetFileInputNative"
                  type="file"
                  accept="*/*"
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
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => document.getElementById('sheetFileInputNative')?.click()}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer text-xs"
                >
                  <Upload className="w-4 h-4" />
                  <span>📂 Scegli File XML / JSON dal Dispositivo</span>
                </button>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5">
                  Testo XML / JSON dello spartito
                </label>
                <textarea
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder="Incolla qui il codice XML o JSON..."
                  rows={6}
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
