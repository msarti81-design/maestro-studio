import React, { useState, useEffect, useRef } from 'react';
import { InteractiveSong, SheetSong } from '../types';
import {
  getUsername,
  setUsername,
  getLocalSongs,
  getPublishedSongs,
  saveLocalSong,
  publishSong,
  deleteLocalSong,
  saveCustomSheetSong,
} from '../utils/songStorage';
import { audioEngine } from '../utils/audioEngine';
import { parseMidiFile, inspectMidiTracks, MidiParsedStructure, buildSongFromMidiStructure } from '../utils/midiParser';
import { MidiTrackSelectorModal } from './MidiTrackSelectorModal';
import { downloadMidi, downloadJson } from '../utils/midiExport';
import {
  BookOpen,
  Globe,
  HardDrive,
  Plus,
  Play,
  Share2,
  Trash2,
  Download,
  Upload,
  User,
  Check,
  Edit2,
  X,
  Sparkles,
  Music,
  Clock,
  Mic,
  Disc,
  Flag,
  ArrowRight,
  FileMusic,
} from 'lucide-react';
import { PublishDisclaimerModal, ReportSongModal } from './CommunitySafetyModals';

interface SongLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSongToPlay: (song: InteractiveSong) => void;
  currentUsername: string;
  onUsernameChange: (name: string) => void;
  newRecordedSongData?: { notes: { note: string; time: number; duration: number }[] } | null;
  onClearRecordedData?: () => void;
  onOpenComposer?: () => void;
  onStartRecord?: () => void;
}

export const SongLibraryModal: React.FC<SongLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectSongToPlay,
  currentUsername,
  onUsernameChange,
  newRecordedSongData,
  onClearRecordedData,
  onOpenComposer,
  onStartRecord,
}) => {
  const [activeTab, setActiveTab] = useState<'published' | 'local' | 'create'>('published');
  const [publishedSongs, setPublishedSongs] = useState<InteractiveSong[]>([]);
  const [localSongs, setLocalSongs] = useState<InteractiveSong[]>([]);
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const midiInputRef = useRef<HTMLInputElement>(null);

  const [isEditingUsername, setIsEditingUsername] = useState<boolean>(false);
  const [usernameInput, setUsernameInput] = useState<string>(currentUsername);

  const [newTitle, setNewTitle] = useState<string>('');
  const [newDifficulty, setNewDifficulty] = useState<'facile' | 'medio' | 'difficile'>('facile');
  const [newBpm, setNewBpm] = useState<number>(100);
  const [creationNotes, setCreationNotes] = useState<{ note: string; time: number; duration: number }[]>([]);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [pendingMidiStructure, setPendingMidiStructure] = useState<MidiParsedStructure | null>(null);
  const [isMidiSelectorOpen, setIsMidiSelectorOpen] = useState<boolean>(false);

  const reloadLists = () => {
    setPublishedSongs(getPublishedSongs());
    setLocalSongs(getLocalSongs());
  };

  useEffect(() => {
    if (isOpen) {
      reloadLists();
      setUsernameInput(currentUsername);
      if (newRecordedSongData && newRecordedSongData.notes.length > 0) {
        setCreationNotes(newRecordedSongData.notes);
        setActiveTab('create');
        setNewTitle(`New Sheet Music (${newRecordedSongData.notes.length} notes)`);
      }
    }
  }, [isOpen, currentUsername, newRecordedSongData]);

  const handleSaveUsername = () => {
    const updated = setUsername(usernameInput);
    onUsernameChange(updated);
    setIsEditingUsername(false);
    showToast(`Username updated to "${updated}"!`);
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const [songToPublish, setSongToPublish] = useState<InteractiveSong | null>(null);
  const [pendingPublishDirectly, setPendingPublishDirectly] = useState<boolean>(false);
  const [songToReport, setSongToReport] = useState<InteractiveSong | null>(null);

  const handleSaveNewSong = (publishDirectly: boolean) => {
    if (!newTitle.trim()) {
      alert('Please enter a title for the sheet music!');
      return;
    }

    if (creationNotes.length === 0) {
      alert('Please add or record at least a few notes to save the sheet music!');
      return;
    }

    const songId = `song-${Date.now()}`;
    const newSong: InteractiveSong = {
      id: songId,
      title: newTitle.trim(),
      author: currentUsername,
      bpm: newBpm,
      difficulty: newDifficulty,
      createdAt: new Date().toISOString().split('T')[0],
      isPublished: publishDirectly,
      notes: creationNotes,
    };

    if (publishDirectly) {
      setPendingPublishDirectly(true);
      setSongToPublish(newSong);
    } else {
      saveLocalSong(newSong);
      showToast(`💾 Sheet music "${newSong.title}" successfully saved locally!`);
      reloadLists();
      setCreationNotes([]);
      setNewTitle('');
      if (onClearRecordedData) onClearRecordedData();
      setActiveTab('local');
    }
  };

  const handlePublishExistingLocal = (song: InteractiveSong) => {
    setPendingPublishDirectly(false);
    setSongToPublish(song);
  };

  const handleConfirmPublishModal = (song: InteractiveSong) => {
    saveLocalSong({ ...song, isPublished: true });
    publishSong(song);
    reloadLists();
    showToast(`🚀 "${song.title}" published to the Community for all players!`);

    if (pendingPublishDirectly) {
      setCreationNotes([]);
      setNewTitle('');
      if (onClearRecordedData) onClearRecordedData();
      setPendingPublishDirectly(false);
    }
    setActiveTab('published');
  };

  const handleDeleteLocal = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete sheet music "${title}"?`)) {
      deleteLocalSong(id);
      reloadLists();
      showToast(`Sheet music deleted.`);
    }
  };

  const handleExportJson = (song: InteractiveSong) => {
    const filename = `${song.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
    const ok = downloadJson(filename, song);
    if (ok) {
      showToast(`📄 JSON file "${filename}" downloaded!`);
    }
  };

  const handleExportMidi = (song: InteractiveSong) => {
    const filename = `${song.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.mid`;
    const ok = downloadMidi(filename, song);
    if (ok) {
      showToast(`🎹 MIDI file "${filename}" downloaded!`);
    } else {
      showToast('Error creating MIDI file.');
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const fileReader = new FileReader();
      fileReader.readAsText(file, 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const raw = event.target?.result as string;
          const parsed = JSON.parse(raw);
          // Tolerant parsing: support both { title, notes } and array of notes or nested song object
          const title = parsed.title || parsed.name || file.name.replace(/\.[^/.]+$/, "") || 'Spartito Importato';
          const notes = Array.isArray(parsed.notes) ? parsed.notes : (Array.isArray(parsed.melody) ? parsed.melody : (Array.isArray(parsed) ? parsed : null));
          
          if (notes && Array.isArray(notes) && notes.length > 0) {
            const normalizedNotes = notes.map((n: any, idx: number) => ({
              note: String(n.note || 'C4'),
              time: typeof n.time === 'number' ? Math.round(n.time * 100) / 100 : idx * 0.5,
              duration: typeof n.duration === 'number' ? n.duration : 0.5,
            }));

            const importedSong: InteractiveSong = {
              id: `imported-${Date.now()}`,
              title,
              author: parsed.author || currentUsername,
              bpm: parsed.bpm || 100,
              difficulty: parsed.difficulty || 'medio',
              createdAt: new Date().toISOString().split('T')[0],
              isPublished: false,
              notes: normalizedNotes,
            };
            saveLocalSong(importedSong);
            reloadLists();

            // Populate buffer for Tab 3 (Compose / Record)
            setCreationNotes(normalizedNotes);
            setNewTitle(importedSong.title);
            setNewBpm(importedSong.bpm || 100);

            showToast(`📄 Spartito "${importedSong.title}" importato (${normalizedNotes.length} note)!`);
            if (activeTab !== 'create') {
              setActiveTab('local');
            }
          } else {
            alert('Formato file JSON non valido. Il file deve contenere una lista di note musicali ("notes" o "melody").');
          }
        } catch (err: any) {
          alert(`Errore nella lettura del file JSON: ${err.message || 'File non valido'}`);
        }
      };
      e.target.value = '';
    }
  };

  const applyImportedMidiSong = (importedSong: InteractiveSong) => {
    if (importedSong && importedSong.notes && importedSong.notes.length > 0) {
      importedSong.isPublished = false;
      saveLocalSong(importedSong);
      reloadLists();

      // Populate buffer for Tab 3 (Compose / Record)
      setCreationNotes(importedSong.notes);
      setNewTitle(importedSong.title);
      setNewBpm(importedSong.bpm || 120);

      showToast(`🎹 File MIDI "${importedSong.title}" importato (${importedSong.notes.length} note)!`);
      if (activeTab !== 'create') {
        setActiveTab('local');
      }
    } else {
      alert('Nessuna nota musicale rilevata nel file MIDI.');
    }
  };

  const handleImportMidi = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const arrayBuffer = await file.arrayBuffer();
        const structure = inspectMidiTracks(arrayBuffer, file.name);

        if (structure.tracks.length === 0 || structure.totalNotes === 0) {
          alert('Nessuna traccia o nota musicale rilevata nel file MIDI.');
          e.target.value = '';
          return;
        }

        // If MIDI has multiple tracks or contains drums/multiple channels, let user choose instruments!
        if (structure.tracks.length > 1 || structure.tracks.some((t) => t.isDrums)) {
          setPendingMidiStructure(structure);
          setIsMidiSelectorOpen(true);
        } else {
          // Single track with single instrument: auto-convert directly
          const importedSong = buildSongFromMidiStructure(structure);
          applyImportedMidiSong(importedSong);
        }
      } catch (err: any) {
        alert(`Errore importazione file MIDI: ${err.message || 'File non valido'}`);
      }
      e.target.value = '';
    }
  };

  const handleConfirmMidiSelection = (song: InteractiveSong) => {
    setIsMidiSelectorOpen(false);
    setPendingMidiStructure(null);
    applyImportedMidiSong(song);
  };

  const handleLaunchComposer = () => {
    if (creationNotes.length > 0) {
      const songId = `composed_${Date.now()}`;
      const newSheetSong: SheetSong = {
        id: songId,
        title: newTitle.trim() || `Spartito Creato (${creationNotes.length} note)`,
        description: `Spartito composto/registrato in VirtuKeys`,
        key: 'C Major (C)',
        bpm: newBpm || 100,
        timeSignature: '4/4',
        chords: ['C', 'G', 'Am', 'F'],
        melody: creationNotes.map((n, idx) => ({
          note: n.note,
          duration: n.duration > 0.8 ? '2n' : n.duration < 0.3 ? '8n' : '4n',
          time: idx,
        })),
        bassline: [],
      };
      saveCustomSheetSong(newSheetSong);
      try {
        localStorage.setItem('maestro_active_composer_song_id', newSheetSong.id);
      } catch (e) {}
    }
    if (onOpenComposer) {
      onOpenComposer();
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const filteredPublished = publishedSongs.filter((s) => {
    const matchQuery =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.author && s.author.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchDiff = filterDifficulty === 'all' || s.difficulty === filterDifficulty;
    return matchQuery && matchDiff;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      {/* Hidden Global Inputs for Android File Picker Compatibility (Mounted on all tabs) */}
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,application/json,text/plain,*/*"
        onChange={handleImportJson}
        style={{ position: 'fixed', top: '-10000px', left: '-10000px', opacity: 0, pointerEvents: 'none' }}
      />
      <input
        ref={midiInputRef}
        type="file"
        accept=".mid,.midi,audio/midi,audio/mid,audio/x-midi,application/x-midi,*/*"
        onChange={handleImportMidi}
        style={{ position: 'fixed', top: '-10000px', left: '-10000px', opacity: 0, pointerEvents: 'none' }}
      />

      <div className="bg-slate-900 border-2 border-amber-500/40 w-full max-w-4xl rounded-3xl p-6 space-y-6 shadow-2xl relative animate-fadeIn select-none max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <BookOpen className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Song Library & Sheet Music Creator
              </h2>
              <p className="text-slate-400 text-xs">
                Explore community songs, manage your local repertoire, or compose new music
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Username badge */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              <User className="w-3.5 h-3.5 text-amber-400" />
              {isEditingUsername ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-white px-2 py-0.5 rounded text-xs outline-none w-28"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveUsername}
                    className="p-1 bg-amber-500 text-slate-950 rounded hover:bg-amber-400"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{currentUsername}</span>
                  <button
                    onClick={() => setIsEditingUsername(true)}
                    className="text-slate-400 hover:text-white"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="bg-amber-500/20 border border-amber-500 text-amber-300 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shrink-0 animate-fadeIn">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Tabs & Search Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab('published')}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                activeTab === 'published'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Community ({publishedSongs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('local')}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                activeTab === 'local'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>My Songs ({localSongs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('create')}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                activeTab === 'create'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Compose / Record</span>
            </button>
          </div>

          {activeTab === 'published' && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search song or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white text-xs px-3 py-2 rounded-xl outline-none focus:border-amber-500 w-full sm:w-48"
              />
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white text-xs px-3 py-2 rounded-xl outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="all">All Difficulties</option>
                <option value="facile">Easy</option>
                <option value="medio">Medium</option>
                <option value="difficile">Hard</option>
              </select>
            </div>
          )}
        </div>

        {/* TAB 1: COMMUNITY PUBLISHED SONGS */}
        {activeTab === 'published' && (
          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            {filteredPublished.length === 0 ? (
              <div className="text-center py-16 space-y-3 bg-slate-950/50 rounded-3xl border border-slate-800">
                <Globe className="w-10 h-10 text-slate-600 mx-auto" />
                <div className="text-slate-300 font-bold text-sm">No community songs found</div>
                <p className="text-slate-500 text-xs">
                  Try clearing search filters or publish your own composition!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredPublished.map((song) => (
                  <div
                    key={song.id}
                    className="bg-slate-950 border border-slate-800 hover:border-amber-500/40 p-4 rounded-2xl flex flex-col justify-between space-y-3 transition-all group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between">
                        <h3 className="font-black text-white text-sm group-hover:text-amber-300 transition-colors">
                          {song.title}
                        </h3>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            song.difficulty === 'facile'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : song.difficulty === 'medio'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-red-500/20 text-red-300 border border-red-500/40'
                          }`}
                        >
                          {song.difficulty}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Author: <strong className="text-slate-200">{song.author || 'Community User'}</strong> • {song.notes?.length || 0} Notes
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                        <span>{song.bpm} BPM</span>
                        <span>•</span>
                        <span>{song.createdAt}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSongToReport(song)}
                          className="p-2 bg-slate-900 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition-colors cursor-pointer"
                          title="Report Song"
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            onSelectSongToPlay(song);
                            onClose();
                          }}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Play Song</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LOCAL REPERTOIRE */}
        {activeTab === 'local' && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            {/* Import / Export Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div>
                <div className="text-xs font-bold text-slate-300">
                  Gestione File Locali (Supporto JSON & MIDI)
                </div>
                <div className="text-[10px] text-slate-500">
                  Importa brani da file o esporta i tuoi spartiti salvati
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => jsonInputRef.current?.click()}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-amber-300 text-xs font-bold rounded-xl border border-slate-800 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importa JSON</span>
                </button>

                <button
                  type="button"
                  onClick={() => midiInputRef.current?.click()}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-amber-300 text-xs font-bold rounded-xl border border-slate-800 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importa MIDI</span>
                </button>
              </div>
            </div>

            {/* Informative Explanation of Published vs Local */}
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl flex items-start gap-2.5 text-xs text-slate-400">
              <div className="p-1.5 bg-amber-500/15 text-amber-400 rounded-lg shrink-0 mt-0.5">
                <Globe className="w-4 h-4" />
              </div>
              <p className="leading-relaxed">
                <strong className="text-white">Cosa significa "Pubblicato"?</strong> I tuoi file MIDI/JSON e le registrazioni al pianoforte sono <strong className="text-slate-200">privati</strong> e salvati solo su questo dispositivo. Se premi l'icona del mondo <span className="text-amber-400 font-bold">🌐 Pubblica</span>, puoi decidere di condividerli nella Community con gli altri musicisti!
              </p>
            </div>

            {localSongs.length === 0 ? (
              <div className="text-center py-12 space-y-3 bg-slate-950/50 rounded-3xl border border-slate-800">
                <HardDrive className="w-10 h-10 text-slate-600 mx-auto" />
                <div className="text-slate-300 font-bold text-sm">Nessun spartito salvato localmente</div>
                <p className="text-slate-500 text-xs max-w-sm mx-auto">
                  Registra un'esecuzione sui tasti del pianoforte, crea un brano nel compositore spartiti o importa un file MIDI!
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-xl cursor-pointer transition-all"
                  >
                    + Vai a Componi / Registra
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {localSongs.map((song) => (
                  <div
                    key={song.id}
                    className="bg-slate-950 border border-slate-800 hover:border-amber-500/40 p-4 rounded-2xl flex flex-col justify-between space-y-3 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-black text-white text-sm truncate">{song.title}</h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {song.isPublished ? (
                            <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Globe className="w-2.5 h-2.5" />
                              <span>In Community</span>
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded-full">
                              Privato (Locale)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400">
                        {song.notes?.length || 0} Note • {song.bpm} BPM
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleExportJson(song)}
                          className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl transition-colors cursor-pointer"
                          title="Esporta JSON"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleExportMidi(song)}
                          className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl transition-colors cursor-pointer"
                          title="Esporta MIDI (.mid)"
                        >
                          <Music className="w-3.5 h-3.5" />
                        </button>
                        {!song.isPublished ? (
                          <button
                            onClick={() => handlePublishExistingLocal(song)}
                            className="p-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                            title="Pubblica nella Community (Condividi con tutti i musicisti)"
                          >
                            <Globe className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <div
                            className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl"
                            title="Questo spartito è già pubblicato nella Community"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <button
                          onClick={() => handleDeleteLocal(song.id, song.title)}
                          className="p-2 bg-slate-900 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition-colors cursor-pointer"
                          title="Elimina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          onSelectSongToPlay(song);
                          onClose();
                        }}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Suona</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: COMPOSE OR RECORD NEW SONG */}
        {activeTab === 'create' && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            {/* Quick Actions Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Option 1: Sheet Music Composer Studio */}
              <div className="bg-gradient-to-br from-indigo-950/60 to-slate-950 border border-indigo-500/30 p-4 sm:p-5 rounded-2xl flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-indigo-500/60 transition-all">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                      <Sparkles className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">Compositore Spartiti</h4>
                      <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Studio Interattivo</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Scrivi note sul pentagramma, pause, battute e accordi in chiave di violino e di basso con riproduzione audio real-time.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLaunchComposer}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  <FileMusic className="w-4 h-4" />
                  <span>
                    {creationNotes.length > 0
                      ? `Apri Compositore con ${creationNotes.length} Note`
                      : 'Apri Compositore Spartiti'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Option 2: Live Piano Recording */}
              <div className="bg-gradient-to-br from-red-950/40 via-slate-950 to-slate-950 border border-red-500/30 p-4 sm:p-5 rounded-2xl flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-red-500/60 transition-all">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300">
                      <Mic className="w-5 h-5 text-red-400 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">Registra al Pianoforte</h4>
                      <span className="text-[10px] font-bold text-red-300 uppercase tracking-wider">Cattura Live</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Avvia la registrazione e suona direttamente sulla tastiera del pianoforte o con una tastiera MIDI USB/Bluetooth.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onStartRecord) {
                      onStartRecord();
                    } else {
                      onClose();
                    }
                  }}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20 cursor-pointer"
                >
                  <Disc className="w-4 h-4" />
                  <span>Avvia Registrazione al Pianoforte</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick File Import Row inside Compose Tab */}
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Importa File Musicale nel Compositore</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Carica un file MIDI (.mid) o JSON per visualizzare e modificare le note sul pentagramma
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => midiInputRef.current?.click()}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md text-xs active:scale-95 transition-all"
                >
                  <Music className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Importa MIDI (.mid)</span>
                </button>
                <button
                  type="button"
                  onClick={() => jsonInputRef.current?.click()}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-sm text-xs active:scale-95 transition-all"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Importa JSON</span>
                </button>
              </div>
            </div>

            {/* Section: Save or Publish Form */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Salvataggio e Pubblicazione Spartito</span>
                </h3>

                {creationNotes.length > 0 && (
                  <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                    {creationNotes.length} Note pronte
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-300 block">Titolo Brano</label>
                  <input
                    type="text"
                    placeholder="es. Notturno in Do Minore"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-xs p-3 rounded-xl outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">Difficoltà</label>
                  <select
                    value={newDifficulty}
                    onChange={(e: any) => setNewDifficulty(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-xs p-3 rounded-xl outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="facile">Facile</option>
                    <option value="medio">Medio</option>
                    <option value="difficile">Difficile</option>
                  </select>
                </div>
              </div>

              {/* Notes status & sample helpers */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Music className="w-4 h-4 text-amber-400" />
                    <span>Dati Spartito: {creationNotes.length} note registrate / caricate</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {creationNotes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          // Play a preview of the notes
                          creationNotes.slice(0, 16).forEach((n, idx) => {
                            setTimeout(() => {
                              audioEngine.playNote(n.note, '8n', 'piano');
                            }, idx * 250);
                          });
                        }}
                        className="text-xs font-bold text-amber-300 hover:text-amber-200 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Ascolta Anteprima (16 note)</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const scaleNotes = [
                          { note: 'C4', time: 0, duration: 0.5 },
                          { note: 'D4', time: 0.5, duration: 0.5 },
                          { note: 'E4', time: 1.0, duration: 0.5 },
                          { note: 'F4', time: 1.5, duration: 0.5 },
                          { note: 'G4', time: 2.0, duration: 0.5 },
                          { note: 'A4', time: 2.5, duration: 0.5 },
                          { note: 'B4', time: 3.0, duration: 0.5 },
                          { note: 'C5', time: 3.5, duration: 1.0 },
                        ];
                        setCreationNotes(scaleNotes);
                        setNewTitle('Scala di Do Maggiore');
                      }}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                    >
                      + Prova Scala di Do Magg
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  {creationNotes.length > 0
                    ? 'Le note sono pronte per essere salvate nella tua libreria o condivise pubblicamente con tutta la community di VirtuKeys.'
                    : 'Non hai ancora note nel buffer. Clicca sui pulsanti in alto per comporre sullo spartito o registrare al pianoforte, oppure carica la scala di prova.'}
                </p>
              </div>

              {/* Save Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                {creationNotes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCreationNotes([]);
                      setNewTitle('');
                      if (onClearRecordedData) onClearRecordedData();
                    }}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancella Buffer
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSaveNewSong(false)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  Salva nei Miei Spartiti
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveNewSong(true)}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <Globe className="w-4 h-4" />
                  <span>Pubblica per la Community</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer Modal */}
      {songToPublish && (
        <PublishDisclaimerModal
          isOpen={!!songToPublish}
          song={songToPublish}
          onClose={() => setSongToPublish(null)}
          onConfirmPublish={handleConfirmPublishModal}
        />
      )}

      {/* Report Modal */}
      {songToReport && (
        <ReportSongModal
          isOpen={!!songToReport}
          song={songToReport}
          onClose={() => setSongToReport(null)}
        />
      )}

      {/* MIDI Track & Instrument Filter Modal */}
      {isMidiSelectorOpen && pendingMidiStructure && (
        <MidiTrackSelectorModal
          isOpen={isMidiSelectorOpen}
          structure={pendingMidiStructure}
          onClose={() => {
            setIsMidiSelectorOpen(false);
            setPendingMidiStructure(null);
          }}
          onConfirm={handleConfirmMidiSelection}
        />
      )}
    </div>
  );
};
