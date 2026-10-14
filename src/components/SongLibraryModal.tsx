import React, { useState, useEffect } from 'react';
import { InteractiveSong } from '../types';
import {
  getUsername,
  setUsername,
  getLocalSongs,
  getPublishedSongs,
  saveLocalSong,
  publishSong,
  deleteLocalSong,
} from '../utils/songStorage';
import { audioEngine } from '../utils/audioEngine';
import { parseMidiFile } from '../utils/midiParser';
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
} from 'lucide-react';

interface SongLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSongToPlay: (song: InteractiveSong) => void;
  currentUsername: string;
  onUsernameChange: (name: string) => void;
  // External recording helper if created from PianoView
  newRecordedSongData?: { notes: { note: string; time: number; duration: number }[] } | null;
  onClearRecordedData?: () => void;
}

export const SongLibraryModal: React.FC<SongLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectSongToPlay,
  currentUsername,
  onUsernameChange,
  newRecordedSongData,
  onClearRecordedData,
}) => {
  const [activeTab, setActiveTab] = useState<'published' | 'local' | 'create'>('published');
  const [publishedSongs, setPublishedSongs] = useState<InteractiveSong[]>([]);
  const [localSongs, setLocalSongs] = useState<InteractiveSong[]>([]);
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Username editing
  const [isEditingUsername, setIsEditingUsername] = useState<boolean>(false);
  const [usernameInput, setUsernameInput] = useState<string>(currentUsername);

  // New song creation form
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDifficulty, setNewDifficulty] = useState<'facile' | 'medio' | 'difficile'>('facile');
  const [newBpm, setNewBpm] = useState<number>(100);
  const [creationNotes, setCreationNotes] = useState<{ note: string; time: number; duration: number }[]>([]);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Refresh lists
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
        setNewTitle(`Nuovo Spartito (${newRecordedSongData.notes.length} note)`);
      }
    }
  }, [isOpen, currentUsername, newRecordedSongData]);

  const handleSaveUsername = () => {
    const updated = setUsername(usernameInput);
    onUsernameChange(updated);
    setIsEditingUsername(false);
    showToast(`Nome utente aggiornato a "${updated}"!`);
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleSaveNewSong = (publishDirectly: boolean) => {
    if (!newTitle.trim()) {
      alert('Inserisci un titolo per lo spartito!');
      return;
    }

    if (creationNotes.length === 0) {
      alert('Aggiungi o registra almeno qualche nota per salvare lo spartito!');
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

    saveLocalSong(newSong);

    if (publishDirectly) {
      publishSong(newSong);
      showToast(`🎉 Spartito "${newSong.title}" salvato e pubblicato nella Community!`);
    } else {
      showToast(`💾 Spartito "${newSong.title}" salvato con successo in locale!`);
    }

    reloadLists();
    setCreationNotes([]);
    setNewTitle('');
    if (onClearRecordedData) onClearRecordedData();
    setActiveTab(publishDirectly ? 'published' : 'local');
  };

  const handlePublishExistingLocal = (song: InteractiveSong) => {
    publishSong(song);
    reloadLists();
    showToast(`🚀 "${song.title}" pubblicato nella Community per tutti i giocatori!`);
  };

  const handleDeleteLocal = (id: string, title: string) => {
    if (confirm(`Sei sicuro di voler eliminare lo spartito "${title}"?`)) {
      deleteLocalSong(id);
      reloadLists();
      showToast(`Spartito eliminato.`);
    }
  };

  const handleExportJson = (song: InteractiveSong) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(song, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `${song.title.toLowerCase().replace(/\s+/g, '_')}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && parsed.title && Array.isArray(parsed.notes)) {
            const importedSong: InteractiveSong = {
              ...parsed,
              id: `imported-${Date.now()}`,
              author: parsed.author || currentUsername,
            };
            saveLocalSong(importedSong);
            reloadLists();
            showToast(`Spartito "${importedSong.title}" importato con successo!`);
            setActiveTab('local');
          } else {
            alert('File JSON non valido o formato spartito non riconosciuto.');
          }
        } catch (err) {
          alert('Errore nella lettura del file JSON.');
        }
      };
    }
  };

  const handleImportMidi = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const song = parseMidiFile(buffer, file.name);
      saveLocalSong(song);
      reloadLists();
      showToast(`🎉 Brano MIDI "${song.title}" importato con successo (${song.notes.length} note)!`);
      onSelectSongToPlay(song);
      onClose();
    } catch (err: any) {
      alert(`Errore nell'importazione del file MIDI: ${err.message || 'File non valido'}`);
    } finally {
      e.target.value = '';
    }
  };

  // Filter songs
  const filteredPublished = publishedSongs.filter((s) => {
    const matchDiff = filterDifficulty === 'all' || s.difficulty === filterDifficulty;
    const matchSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDiff && matchSearch;
  });

  const filteredLocal = localSongs.filter((s) => {
    return (
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.author.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Libreria Spartiti & Studio Creatore
              </h2>
              <p className="text-xs text-slate-400">
                Suona spartiti celebri, crea composizioni e condividile con la community.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Username Badge & Editor */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />
              {isEditingUsername ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="bg-slate-950 border border-amber-500 text-white text-xs rounded px-2 py-0.5 outline-none w-28"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveUsername}
                    className="p-1 bg-amber-500 text-slate-950 rounded hover:bg-amber-400"
                    title="Salva nome utente"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-200">{currentUsername}</span>
                  <button
                    onClick={() => setIsEditingUsername(true)}
                    className="text-slate-400 hover:text-amber-400 text-[10px] p-0.5 rounded"
                    title="Modifica nome utente"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 text-xs px-6 py-2 font-medium flex items-center justify-between animate-fade-in">
            <span>{successToast}</span>
            <button onClick={() => setSuccessToast(null)} className="text-emerald-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 pt-3 pb-2 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('published')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'published'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Spartiti Pubblicati ({publishedSongs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('local')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'local'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>I Miei Spartiti in Locale ({localSongs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'create'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Crea Nuovo Spartito</span>
            </button>
          </div>

          {/* Quick Import Tools */}
          <div className="flex items-center gap-2">
            <label className="cursor-pointer text-[11px] font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg shadow-sm transition-all active:scale-95">
              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              <span>Importa MIDI (.mid)</span>
              <input type="file" accept=".mid,.midi" onChange={handleImportMidi} className="hidden" />
            </label>

            <label className="cursor-pointer text-[11px] font-semibold text-slate-400 hover:text-amber-400 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>JSON</span>
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>
          </div>
        </div>

        {/* Tab 1: Published Songs */}
        {activeTab === 'published' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Search & Filter */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
              <input
                type="text"
                placeholder="Cerca per titolo o autore..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-500 flex-1 min-w-[200px]"
              />

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                {['all', 'facile', 'medio', 'difficile'].map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setFilterDifficulty(diff)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold capitalize transition-colors ${
                      filterDifficulty === diff
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {diff === 'all' ? 'Tutte le difficoltà' : diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Song Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredPublished.map((song) => (
                <div
                  key={song.id}
                  className="bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 hover:border-amber-500/40 rounded-2xl p-4 transition-all group flex flex-col justify-between shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-white group-hover:text-amber-400 text-sm">{song.title}</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          song.difficulty === 'facile'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : song.difficulty === 'medio'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {song.difficulty}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        {song.author}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Music className="w-3.5 h-3.5 text-slate-500" />
                        {song.notes.length} note
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {song.bpm} BPM
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-700/50 mt-2">
                    <button
                      onClick={() => handleExportJson(song)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg text-xs flex items-center gap-1"
                      title="Esporta JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        onSelectSongToPlay(song);
                        onClose();
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition-transform active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Suona con Note dall'Alto</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Local Songs */}
        {activeTab === 'local' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {localSongs.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-3xl bg-slate-950/40">
                <Disc className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-pulse" />
                <h3 className="text-base font-bold text-slate-300">Nessuno spartito salvato in locale</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
                  Puoi registrare un brano direttamente dal pianoforte o creare uno spartito nel compositore per
                  salvarlo qui per te o pubblicarlo per tutti!
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-5 py-2.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 shadow-lg"
                >
                  Crea o Registra un Brano Ora
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredLocal.map((song) => (
                  <div
                    key={song.id}
                    className="bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 rounded-2xl p-4 transition-all flex flex-col justify-between shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-white text-sm">{song.title}</h3>
                        {song.isPublished ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                            <Globe className="w-3 h-3" /> Pubblicato
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                            Solo Locale
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                        <span>Autore: {song.author}</span>
                        <span>•</span>
                        <span>{song.notes.length} note</span>
                        <span>•</span>
                        <span className="capitalize">{song.difficulty}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-700/50 mt-2 gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleExportJson(song)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg text-xs"
                          title="Esporta JSON"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteLocal(song.id, song.title)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg text-xs"
                          title="Elimina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {!song.isPublished && (
                          <button
                            onClick={() => handlePublishExistingLocal(song)}
                            className="px-2 py-1 bg-cyan-600/30 text-cyan-300 hover:bg-cyan-600/50 rounded-lg text-xs font-semibold flex items-center gap-1 border border-cyan-500/30"
                            title="Pubblica per tutti"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>Pubblica</span>
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          onSelectSongToPlay(song);
                          onClose();
                        }}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/10"
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

        {/* Tab 3: Create New Song */}
        {activeTab === 'create' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Dati Spartito
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Titolo del Brano</label>
                  <input
                    type="text"
                    placeholder="Es. Mia Composizione n. 1"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Difficoltà</label>
                  <select
                    value={newDifficulty}
                    onChange={(e) => setNewDifficulty(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-500"
                  >
                    <option value="facile">Facile</option>
                    <option value="medio">Medio</option>
                    <option value="difficile">Difficile</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Autore</label>
                <div className="text-xs font-bold text-amber-400 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-2">
                  <User className="w-3.5 h-3.5" />
                  <span>{currentUsername}</span>
                  <span className="text-[10px] text-slate-500 font-normal">(verrà usato per la pubblicazione)</span>
                </div>
              </div>
            </div>

            {/* Notes sequence or recording status */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Music className="w-4 h-4 text-cyan-400" />
                  Note dello Spartito ({creationNotes.length} note registrate)
                </h3>
                {creationNotes.length > 0 && (
                  <button
                    onClick={() => setCreationNotes([])}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                  >
                    Cancella tutte le note
                  </button>
                )}
              </div>

              {creationNotes.length === 0 ? (
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-center space-y-2">
                  <Mic className="w-8 h-8 text-amber-400 mx-auto opacity-70" />
                  <p className="text-xs text-slate-300 font-medium">
                    Non ci sono ancora note in questa registrazione.
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Puoi premere "Registra" direttamente sul Pianoforte per suonare e salvare qualsiasi melodia, oppure
                    aggiungere note di esempio qui sotto!
                  </p>
                  <button
                    onClick={() => {
                      // Seed a simple melodious scale
                      const scale = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
                      const sampleNotes = scale.map((note, idx) => ({
                        note,
                        time: idx * 0.6,
                        duration: 0.5,
                      }));
                      setCreationNotes(sampleNotes);
                    }}
                    className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors"
                  >
                    + Carica Scala Musicale di Esempio (Do Maggiore)
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-900/80 rounded-xl border border-slate-800">
                  {creationNotes.map((n, idx) => (
                    <div
                      key={idx}
                      className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-bold text-amber-300 flex items-center gap-1"
                    >
                      <span>{n.note}</span>
                      <span className="text-[9px] text-slate-500 font-normal">({n.time.toFixed(1)}s)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                onClick={() => handleSaveNewSong(false)}
                disabled={creationNotes.length === 0}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl disabled:opacity-40 flex items-center gap-2 border border-slate-700"
              >
                <HardDrive className="w-4 h-4 text-slate-400" />
                <span>Salva in Locale (I Miei Spartiti)</span>
              </button>

              <button
                onClick={() => handleSaveNewSong(true)}
                disabled={creationNotes.length === 0}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <Globe className="w-4 h-4" />
                <span>Pubblica per Tutti nella Community</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
