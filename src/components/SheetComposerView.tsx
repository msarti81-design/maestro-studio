import React, { useState } from 'react';
import { SheetSong, NoteEvent } from '../types';
import { PRESET_SONGS } from '../data/songs';
import { audioEngine } from '../utils/audioEngine';
import { Play, Square, Plus, Trash2, Download, BookOpen, Sparkles, FileText, Printer } from 'lucide-react';

export const SheetComposerView: React.FC = () => {
  const [songs, setSongs] = useState<SheetSong[]>(PRESET_SONGS);
  const [selectedSongId, setSelectedSongId] = useState<string>(PRESET_SONGS[0].id);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeBeat, setActiveBeat] = useState<number>(-1);

  const currentSong = songs.find(s => s.id === selectedSongId) || songs[0];

  const handlePlaySong = async () => {
    if (isPlaying) return;
    setIsPlaying(true);

    const bpm = currentSong.bpm;
    const beatDurationMs = (60 / bpm) * 1000;

    // Play melody & bassline timed
    const maxTime = Math.max(
      ...currentSong.melody.map(m => m.time),
      ...currentSong.bassline.map(b => b.time),
      8
    );

    for (let beat = 0; beat <= maxTime; beat += 0.5) {
      if (!isPlaying) break;
      setActiveBeat(beat);

      // Trigger matching melody notes
      const notesToPlay = currentSong.melody.filter(m => Math.abs(m.time - beat) < 0.1);
      for (const n of notesToPlay) {
        audioEngine.playNote(n.note, n.duration, 'piano');
      }

      // Trigger bass notes
      const bassToPlay = currentSong.bassline.filter(b => Math.abs(b.time - beat) < 0.1);
      for (const b of bassToPlay) {
        audioEngine.playNote(b.note, b.duration, 'bass');
      }

      await new Promise(r => setTimeout(r, beatDurationMs / 2));
    }

    setActiveBeat(-1);
    setIsPlaying(false);
  };

  const addNoteToMelody = () => {
    const newNote: NoteEvent = { note: 'C5', duration: '4n', time: currentSong.melody.length ? currentSong.melody[currentSong.melody.length - 1].time + 1 : 0 };
    setSongs(songs.map(s => s.id === currentSong.id ? { ...s, melody: [...s.melody, newNote] } : s));
  };

  const removeNoteFromMelody = (index: number) => {
    setSongs(songs.map(s => s.id === currentSong.id ? { ...s, melody: s.melody.filter((_, i) => i !== index) } : s));
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
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header & Song Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            Sheet Music Composer & Editor
          </h2>
          <p className="text-sm text-slate-400 mt-1">Create, edit, and orchestrate musical scores and chord progressions.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedSongId}
            onChange={(e) => setSelectedSongId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3.5 py-2 outline-none focus:border-amber-500"
          >
            {songs.map(s => (
              <option key={s.id} value={s.id}>{s.title} ({s.key})</option>
            ))}
          </select>

          <button
            onClick={handlePlaySong}
            className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all ${
              isPlaying ? 'bg-red-500 text-white' : 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-lg shadow-amber-500/20'
            }`}
          >
            <Play className="w-4 h-4" />
            {isPlaying ? 'Playing Score...' : 'Play Score'}
          </button>

          <button
            onClick={exportSongJson}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-800 text-slate-200 rounded-xl hover:bg-slate-700 flex items-center gap-1.5"
            title="Export Sheet JSON"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Song Metadata Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400 font-medium">Musical Key</div>
          <div className="text-lg font-bold text-white mt-1">{currentSong.key}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400 font-medium">Tempo (BPM)</div>
          <div className="text-lg font-bold text-white mt-1 tabular-nums">{currentSong.bpm} BPM</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400 font-medium">Time Signature</div>
          <div className="text-lg font-bold text-white mt-1">{currentSong.timeSignature}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400 font-medium">Chord Progression</div>
          <div className="text-sm font-bold text-amber-400 mt-1 truncate">{currentSong.chords.join(' - ')}</div>
        </div>
      </div>

      {/* Score / Melody Sequence Grid */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Melody Sequence (Piano / Lead)</h3>
          <button
            onClick={addNoteToMelody}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-800 text-amber-400 rounded-lg hover:bg-slate-750 flex items-center gap-1.5 border border-slate-700"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Note
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {currentSong.melody.map((note, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                activeBeat === note.time
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                  : 'bg-slate-800/80 border-slate-700/60 text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{note.note}</span>
                <button
                  onClick={() => removeNoteFromMelody(idx)}
                  className="text-slate-400 hover:text-red-400 transition-colors"
                  title="Remove note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 flex justify-between tabular-nums">
                <span>Dur: {note.duration}</span>
                <span>Beat: {note.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bassline Sequence Grid */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
        <h3 className="text-base font-bold text-white">Bassline Sequence (Bass Guitar)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {currentSong.bassline.map((note, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-xl text-slate-200 flex flex-col justify-between"
            >
              <span className="text-sm font-bold text-emerald-400">{note.note}</span>
              <div className="text-[11px] text-slate-400 mt-2 flex justify-between tabular-nums">
                <span>Dur: {note.duration}</span>
                <span>Beat: {note.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
