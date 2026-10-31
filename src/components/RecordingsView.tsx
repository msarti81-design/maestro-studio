import React, { useState, useEffect, useRef } from 'react';
import { InteractiveSong, SheetSong } from '../types';
import {
  getLocalSongs,
  saveLocalSong,
  deleteLocalSong,
  getSavedSheetSongs,
  saveCustomSheetSong,
  deleteCustomSheetSong,
  publishSong,
} from '../utils/songStorage';
import { audioEngine } from '../utils/audioEngine';
import { downloadMidi, downloadJson } from '../utils/midiExport';
import {
  Disc,
  Play,
  Square,
  Trash2,
  Edit2,
  Check,
  Download,
  Share2,
  Music,
  Clock,
  Sparkles,
  Search,
  Plus,
  Piano,
  BookOpen,
  Volume2,
  FileAudio,
  Globe,
  Tag,
  Flag,
} from 'lucide-react';
import { PublishDisclaimerModal, ReportSongModal } from './CommunitySafetyModals';

interface RecordingsViewProps {
  onSelectSongToPlay: (song: InteractiveSong) => void;
  onNavigateToView: (view: 'piano' | 'sheet' | 'jam' | 'social') => void;
}

export const RecordingsView: React.FC<RecordingsViewProps> = ({
  onSelectSongToPlay,
  onNavigateToView,
}) => {
  const [recordings, setRecordings] = useState<InteractiveSong[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editAuthor, setEditAuthor] = useState<string>('');

  // Audio Playback State
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Disclaimer & Report Modals State
  const [songToPublish, setSongToPublish] = useState<InteractiveSong | null>(null);
  const [songToReport, setSongToReport] = useState<InteractiveSong | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadAllRecordings = () => {
    const local = getLocalSongs();
    setRecordings(local);
  };

  useEffect(() => {
    loadAllRecordings();
    return () => {
      stopPlayback();
    };
  }, []);

  const stopPlayback = () => {
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    setPlayingSongId(null);
    setPlaybackProgress(0);
  };

  const handlePlaySong = async (song: InteractiveSong) => {
    if (playingSongId === song.id) {
      stopPlayback();
      return;
    }

    stopPlayback();
    audioEngine.init().catch(() => {});
    setPlayingSongId(song.id);

    if (!song.notes || song.notes.length === 0) {
      showToast('⚠️ No notes recorded in this song!');
      setPlayingSongId(null);
      return;
    }

    const sortedNotes = [...song.notes].sort((a, b) => a.time - b.time);
    const totalDuration = Math.max(
      ...sortedNotes.map((n) => (n.time || 0) + (n.duration || 0.5)),
      3
    );

    let step = 0;
    const intervalMs = 100;
    let currentTimeSec = 0;

    playbackTimerRef.current = setInterval(() => {
      currentTimeSec += 0.1;
      const progress = Math.min(100, Math.round((currentTimeSec / totalDuration) * 100));
      setPlaybackProgress(progress);

      // Play notes triggered at current timestamp
      while (step < sortedNotes.length && sortedNotes[step].time <= currentTimeSec) {
        const noteObj = sortedNotes[step];
        const durSec = noteObj.duration || 0.5;
        const durStr = durSec > 1.5 ? '1m' : durSec > 0.8 ? '2n' : '4n';
        audioEngine.playNote(noteObj.note, durStr, 'piano');
        step++;
      }

      if (currentTimeSec >= totalDuration || step >= sortedNotes.length) {
        setTimeout(() => stopPlayback(), 500);
      }
    }, intervalMs);
  };

  // Delete Recording
  const handleDelete = (id: string, title: string) => {
    if (playingSongId === id) stopPlayback();
    deleteLocalSong(id);
    loadAllRecordings();
    showToast(`🗑️ Recording "${title}" deleted.`);
  };

  // Start Renaming Recording
  const handleStartRename = (song: InteractiveSong) => {
    setEditingId(song.id);
    setEditTitle(song.title || 'New Recording');
    setEditAuthor(song.author || 'Pianist');
  };

  // Save Renamed Recording
  const handleSaveRename = (song: InteractiveSong) => {
    if (!editTitle.trim()) {
      showToast('⚠️ Please enter a valid title!');
      return;
    }

    const updatedSong: InteractiveSong = {
      ...song,
      title: editTitle.trim(),
      author: editAuthor.trim() || 'Pianist',
    };

    saveLocalSong(updatedSong);
    setEditingId(null);
    loadAllRecordings();
    showToast(`✓ Recording renamed to "${updatedSong.title}"!`);
  };

  // Publish to Community (Opens Disclaimer Modal First)
  const handlePublish = (song: InteractiveSong) => {
    setSongToPublish(song);
  };

  const handleConfirmPublish = (song: InteractiveSong) => {
    publishSong(song);
    loadAllRecordings();
    showToast(`🌐 "${song.title}" pubblicata nella Community con successo!`);
  };

  // Filtered List
  const filteredRecordings = recordings.filter((r) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (r.title && r.title.toLowerCase().includes(query)) ||
      (r.author && r.author.toLowerCase().includes(query))
    );
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 select-none pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border-2 border-amber-400 text-amber-300 font-bold px-4 py-2.5 rounded-2xl shadow-2xl animate-bounce flex items-center gap-2 text-xs">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER & TOP DASHBOARD */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 sm:p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="space-y-1 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest">
            <Disc className="w-3.5 h-3.5 animate-spin [animation-duration:4s]" />
            <span>Recordings Archive & Manager</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center justify-center md:justify-start gap-2">
            <span>Your Piano Recordings</span>
            <Sparkles className="w-5 h-5 text-amber-400" />
          </h1>
          <p className="text-slate-400 text-xs max-w-xl">
            Listen to your performances, rename them, download them as MIDI/JSON, or share them with the community in one click.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
          <button
            onClick={() => onNavigateToView('piano')}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-lg hover:from-amber-400 hover:to-yellow-300 flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <Piano className="w-4 h-4" />
            <span>🔴 New Recording</span>
          </button>

          <button
            onClick={() => onNavigateToView('sheet')}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-black text-xs rounded-xl flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Sheet Composer</span>
          </button>
        </div>
      </div>

      {/* SEARCH BAR & COUNTERS */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recording by title or author..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 text-white text-xs rounded-xl outline-none focus:border-amber-400"
          />
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <FileAudio className="w-4 h-4 text-amber-400" />
          <span>
            {filteredRecordings.length} {filteredRecordings.length === 1 ? 'Recording' : 'Recordings'} saved
          </span>
        </div>
      </div>

      {/* RECORDINGS GRID */}
      {filteredRecordings.length === 0 ? (
        <div className="bg-slate-900/95 border-2 border-dashed border-slate-800 p-10 rounded-3xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto text-2xl">
            🎙️
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white">No Recordings Found</h3>
            <p className="text-slate-400 text-xs max-w-md mx-auto">
              You haven't saved any performances yet or the search returned no results. Go to the piano and play to record your first song!
            </p>
          </div>
          <button
            onClick={() => onNavigateToView('piano')}
            className="px-5 py-2.5 bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg hover:bg-amber-300 inline-flex items-center gap-2 cursor-pointer"
          >
            <Piano className="w-4 h-4" />
            <span>Go to Piano to Record</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecordings.map((song) => {
            const isPlayingThis = playingSongId === song.id;
            const isEditingThis = editingId === song.id;
            const notesCount = song.notes ? song.notes.length : 0;

            return (
              <div
                key={song.id}
                className={`bg-slate-900/95 border rounded-3xl p-5 space-y-4 transition-all shadow-xl relative overflow-hidden flex flex-col justify-between ${
                  isPlayingThis
                    ? 'border-amber-400 shadow-amber-500/10 ring-2 ring-amber-400/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Top Card Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Music className="w-3 h-3 text-amber-400" />
                      <span>{notesCount} Notes</span>
                    </span>

                    <span className="text-[10px] text-slate-400 font-mono">
                      {song.createdAt || 'Recording'}
                    </span>
                  </div>

                  {/* Title & Author / Edit Input */}
                  {isEditingThis ? (
                    <div className="space-y-2 bg-slate-950 p-3 rounded-2xl border border-amber-400/60 my-1">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Title</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full bg-slate-900 text-amber-300 font-black text-xs p-1.5 rounded border border-amber-500/40 outline-none"
                          placeholder="Song title..."
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Author</label>
                        <input
                          type="text"
                          value={editAuthor}
                          onChange={(e) => setEditAuthor(e.target.value)}
                          className="w-full bg-slate-900 text-white font-bold text-xs p-1.5 rounded border border-slate-700 outline-none"
                          placeholder="Pianist name..."
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleSaveRename(song)}
                          className="flex-1 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded hover:bg-amber-300 flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded hover:bg-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-base font-black text-white truncate flex items-center gap-2">
                        <span>{song.title || 'Untitled'}</span>
                        <button
                          onClick={() => handleStartRename(song)}
                          className="text-slate-500 hover:text-amber-400 transition-colors p-1"
                          title="Rename recording"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </h3>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>Performed by: <strong className="text-slate-300">{song.author || 'Pianist'}</strong></span>
                        {song.bpm && (
                          <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-amber-400 font-bold">
                            {song.bpm} BPM
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* PLAYBACK PROGRESS BAR */}
                {isPlayingThis && (
                  <div className="space-y-1 my-2 bg-slate-950 p-2.5 rounded-xl border border-amber-500/30">
                    <div className="flex items-center justify-between text-[10px] font-bold text-amber-300">
                      <span>Playing... 🔊</span>
                      <span>{playbackProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-100"
                        style={{ width: `${playbackProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* ACTION BUTTONS GRID */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    {/* LISTEN / PLAY BUTTON */}
                    <button
                      onClick={() => handlePlaySong(song)}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isPlayingThis
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {isPlayingThis ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Listen</span>
                        </>
                      )}
                    </button>

                    {/* PLAY IN PIANO MODE */}
                    <button
                      onClick={() => onSelectSongToPlay(song)}
                      className="flex-1 py-2.5 px-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs rounded-xl hover:from-amber-400 hover:to-yellow-300 flex items-center justify-center gap-1.5 shadow active:scale-95 cursor-pointer"
                      title="Open in Piano to practice with falling notes"
                    >
                      <Piano className="w-3.5 h-3.5" />
                      <span>Play on Piano</span>
                    </button>
                  </div>

                  {/* SECONDARY EXPORT & COMMUNITY ACTIONS */}
                  <div className="flex items-center justify-between gap-1 pt-1">
                    <div className="flex items-center gap-1">
                      {/* DOWNLOAD MIDI */}
                      <button
                        onClick={() => downloadMidi(song)}
                        className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                        title="Download MIDI file (.mid)"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[10px]">MIDI</span>
                      </button>

                      {/* DOWNLOAD JSON */}
                      <button
                        onClick={() => downloadJson(song)}
                        className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                        title="Download sheet JSON file"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[10px]">JSON</span>
                      </button>

                      {/* PUBLISH TO COMMUNITY */}
                      {!song.isPublished ? (
                        <button
                          onClick={() => handlePublish(song)}
                          className="p-2 bg-slate-950 hover:bg-emerald-950 text-emerald-400 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                          title="Publish to public community library with disclaimer"
                        >
                          <Globe className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[10px]">Pubblica</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setSongToReport(song)}
                          className="p-2 bg-slate-950 hover:bg-red-950/80 text-red-400 border border-slate-800 hover:border-red-500/40 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                          title="Report song to info@freeserv.it for copyright violation or inappropriate content"
                        >
                          <Flag className="w-3.5 h-3.5 text-red-400 fill-current" />
                          <span className="text-[10px]">Report</span>
                        </button>
                      )}
                    </div>

                    {/* DELETE BUTTON */}
                    <button
                      onClick={() => handleDelete(song.id, song.title)}
                      className="p-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      title="Delete recording"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PUBLISH DISCLAIMER MODAL */}
      <PublishDisclaimerModal
        isOpen={Boolean(songToPublish)}
        song={songToPublish}
        onClose={() => setSongToPublish(null)}
        onConfirmPublish={handleConfirmPublish}
      />

      {/* REPORT SONG MODAL (Inoltro a info@freeserv.it) */}
      <ReportSongModal
        isOpen={Boolean(songToReport)}
        song={songToReport}
        onClose={() => setSongToReport(null)}
      />
    </div>
  );
};
