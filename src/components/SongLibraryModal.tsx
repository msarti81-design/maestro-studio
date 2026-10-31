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

  const [isEditingUsername, setIsEditingUsername] = useState<boolean>(false);
  const [usernameInput, setUsernameInput] = useState<string>(currentUsername);

  const [newTitle, setNewTitle] = useState<string>('');
  const [newDifficulty, setNewDifficulty] = useState<'facile' | 'medio' | 'difficile'>('facile');
  const [newBpm, setNewBpm] = useState<number>(100);
  const [creationNotes, setCreationNotes] = useState<{ note: string; time: number; duration: number }[]>([]);
  const [successToast, setSuccessToast] = useState<string | null>(null);

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
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && parsed.title && Array.isArray(parsed.notes)) {
            const importedSong: InteractiveSong = {
              id: `imported-${Date.now()}`,
              title: parsed.title,
              author: parsed.author || currentUsername,
              bpm: parsed.bpm || 100,
              difficulty: parsed.difficulty || 'medio',
              createdAt: new Date().toISOString().split('T')[0],
              isPublished: false,
              notes: parsed.notes,
            };
            saveLocalSong(importedSong);
            reloadLists();
            showToast(`Sheet music "${importedSong.title}" successfully imported!`);
            setActiveTab('local');
          } else {
            alert('Invalid JSON file format for sheet music.');
          }
        } catch (err) {
          alert('Error reading JSON file.');
        }
      };
    }
  };

  const handleImportMidi = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const arrayBuffer = await file.arrayBuffer();
        const importedSong = parseMidiFile(arrayBuffer, file.name);
        if (importedSong && importedSong.notes && importedSong.notes.length > 0) {
          saveLocalSong(importedSong);
          reloadLists();
          showToast(`🎹 MIDI file "${importedSong.title}" imported successfully (${importedSong.notes.length} notes)!`);
          setActiveTab('local');
        } else {
          alert('No notes found in MIDI file.');
        }
      } catch (err: any) {
        alert(`Error importing MIDI file: ${err.message || 'Invalid file'}`);
      }
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
              <div className="text-xs font-bold text-slate-300">
                Manage Local Files (JSON & MIDI Support)
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold rounded-xl border border-slate-800 flex items-center gap-1.5 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import JSON</span>
                  <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
                </label>

                <label className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold rounded-xl border border-slate-800 flex items-center gap-1.5 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import MIDI</span>
                  <input type="file" accept=".mid,.midi" onChange={handleImportMidi} className="hidden" />
                </label>
              </div>
            </div>

            {localSongs.length === 0 ? (
              <div className="text-center py-12 space-y-3 bg-slate-950/50 rounded-3xl border border-slate-800">
                <HardDrive className="w-10 h-10 text-slate-600 mx-auto" />
                <div className="text-slate-300 font-bold text-sm">No local sheet music saved</div>
                <p className="text-slate-500 text-xs">
                  Record a performance on the piano or compose a new song!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {localSongs.map((song) => (
                  <div
                    key={song.id}
                    className="bg-slate-950 border border-slate-800 hover:border-amber-500/40 p-4 rounded-2xl flex flex-col justify-between space-y-3 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between">
                        <h3 className="font-black text-white text-sm">{song.title}</h3>
                        <div className="flex items-center gap-1.5">
                          {song.isPublished && (
                            <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                              Published
                            </span>
                          )}
                          <span className="text-[9px] font-bold bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full">
                            Local
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400">
                        {song.notes?.length || 0} Notes • {song.bpm} BPM
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleExportJson(song)}
                          className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl transition-colors cursor-pointer"
                          title="Export JSON"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleExportMidi(song)}
                          className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl transition-colors cursor-pointer"
                          title="Export MIDI (.mid)"
                        >
                          <Music className="w-3.5 h-3.5" />
                        </button>
                        {!song.isPublished && (
                          <button
                            onClick={() => handlePublishExistingLocal(song)}
                            className="p-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl transition-colors cursor-pointer"
                            title="Publish to Community"
                          >
                            <Globe className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteLocal(song.id, song.title)}
                          className="p-2 bg-slate-900 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          onSelectSongToPlay(song);
                          onClose();
                        }}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play</span>
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
            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Create or Record a Song Now</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-300 block">Song Title</label>
                  <input
                    type="text"
                    placeholder="e.g., Nocturne in C Minor"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-xs p-3 rounded-xl outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">Difficulty</label>
                  <select
                    value={newDifficulty}
                    onChange={(e: any) => setNewDifficulty(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-xs p-3 rounded-xl outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="facile">Easy</option>
                    <option value="medio">Medium</option>
                    <option value="difficile">Hard</option>
                  </select>
                </div>
              </div>

              {/* Notes summary & helpers */}
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    Sheet Music Data ({creationNotes.length} recorded notes)
                  </span>

                  <button
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
                      setNewTitle('C Major Scale Practice');
                    }}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    + Load Sample Music Scale (C Major)
                  </button>
                </div>

                <p className="text-[11px] text-slate-400">
                  You can press "Record" directly on the Piano to play and save any melody, or load the sample scale above to test saving.
                </p>
              </div>

              {/* Save Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => handleSaveNewSong(false)}
                  className="px-5 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Save Locally (My Songs)
                </button>

                <button
                  onClick={() => handleSaveNewSong(true)}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Globe className="w-4 h-4" />
                  <span>Publish for Everyone in the Community</span>
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
    </div>
  );
};
