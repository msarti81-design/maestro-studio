import React, { useState, useEffect, useRef } from 'react';
import { MidiParsedStructure, MidiTrackDetail, buildSongFromMidiStructure } from '../utils/midiParser';
import { InteractiveSong } from '../types';
import { audioEngine } from '../utils/audioEngine';
import { midiNumberToNoteName } from '../utils/midiEngine';

interface MidiTrackSelectorModalProps {
  isOpen: boolean;
  structure: MidiParsedStructure | null;
  onClose: () => void;
  onConfirm: (song: InteractiveSong, selectedTrackIds: string[]) => void;
}

export const MidiTrackSelectorModal: React.FC<MidiTrackSelectorModalProps> = ({
  isOpen,
  structure,
  onClose,
  onConfirm,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
  const previewTimersRef = useRef<NodeJS.Timeout[]>([]);

  // Stop any active audio preview
  const stopAudioPreview = () => {
    previewTimersRef.current.forEach((t) => clearTimeout(t));
    previewTimersRef.current = [];
    setPlayingPreviewId(null);
  };

  // Clean up audio on unmount or close
  useEffect(() => {
    return () => {
      stopAudioPreview();
    };
  }, []);

  // Compute smart initial selection whenever a new structure is provided
  useEffect(() => {
    stopAudioPreview();

    if (!structure) {
      setSelectedIds(new Set());
      return;
    }

    const initial = new Set<string>();

    // Pre-select all non-drum melodic/harmonic tracks by default so songs like Baby Shark
    // (where the lead melody may be on Marimba, Xylophone, Synth, Flute, or an untagged track
    // alongside a Piano accompaniment track) never lose their main melody!
    const nonDrumTracks = structure.tracks.filter((t) => !t.isDrums);
    if (nonDrumTracks.length > 0) {
      nonDrumTracks.forEach((t) => initial.add(t.id));
    } else {
      structure.tracks.forEach((t) => initial.add(t.id));
    }

    setSelectedIds(initial);
  }, [structure]);

  if (!isOpen || !structure) return null;

  const toggleTrack = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Preset Filters
  const selectMelodyOnly = () => {
    const next = new Set<string>();
    const melodyTracks = structure.tracks.filter((t) => t.role === 'melody' && !t.isDrums);
    if (melodyTracks.length > 0) {
      melodyTracks.forEach((t) => next.add(t.id));
    } else {
      // If no track tagged melody, pick the track with highest pitch or most notes
      const nonDrum = structure.tracks.filter((t) => !t.isDrums);
      if (nonDrum.length > 0) next.add(nonDrum[0].id);
    }
    setSelectedIds(next);
  };

  const selectMelodyAndChords = () => {
    const next = new Set<string>();
    structure.tracks
      .filter((t) => (t.role === 'melody' || t.role === 'chords' || t.isPiano) && !t.isDrums)
      .forEach((t) => next.add(t.id));
    setSelectedIds(next.size > 0 ? next : new Set(structure.tracks.filter((t) => !t.isDrums).map((t) => t.id)));
  };

  const selectOnlyPiano = () => {
    const next = new Set<string>();
    structure.tracks
      .filter((t) => t.isPiano && !t.isDrums)
      .forEach((t) => next.add(t.id));
    setSelectedIds(next.size > 0 ? next : new Set(structure.tracks.map((t) => t.id)));
  };

  const selectExcludeDrums = () => {
    const next = new Set<string>();
    structure.tracks
      .filter((t) => !t.isDrums)
      .forEach((t) => next.add(t.id));
    setSelectedIds(next);
  };

  const selectAll = () => {
    setSelectedIds(new Set(structure.tracks.map((t) => t.id)));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  // Play audio preview of a specific track
  const handleToggleAudioPreview = async (track: MidiTrackDetail, e: React.MouseEvent) => {
    e.stopPropagation();

    if (playingPreviewId === track.id) {
      stopAudioPreview();
      return;
    }

    stopAudioPreview();
    await audioEngine.init().catch(() => {});

    if (track.notes.length === 0) return;

    setPlayingPreviewId(track.id);

    // Sort notes and normalize start tick
    const notesCopy = [...track.notes].sort((a, b) => a.tickStart - b.tickStart);
    const firstTick = notesCopy[0].tickStart;

    // Approximate BPM/tick scaling for preview
    const bpm = structure.bpm || 120;
    const ticksPerBeat = structure.ticksPerBeat || 480;
    const msPerTick = (60000 / bpm) / ticksPerBeat;

    // Schedule up to 60 notes or max 12 seconds so the melody is clearly recognizable
    const previewNotes = notesCopy.slice(0, 60);
    const timers: NodeJS.Timeout[] = [];

    previewNotes.forEach((n) => {
      const delayMs = Math.max(0, (n.tickStart - firstTick) * msPerTick);
      if (delayMs <= 12000) {
        const timer = setTimeout(() => {
          const noteName = midiNumberToNoteName(n.midi);
          audioEngine.playNote(noteName, '8n', 'piano', false);
        }, delayMs);
        timers.push(timer);
      }
    });

    // Auto-stop preview after max notes duration
    const lastDelay = previewNotes.length > 0
      ? Math.min(12500, (previewNotes[previewNotes.length - 1].tickStart - firstTick) * msPerTick + 800)
      : 3000;

    const endTimer = setTimeout(() => {
      setPlayingPreviewId(null);
    }, lastDelay);
    timers.push(endTimer);

    previewTimersRef.current = timers;
  };

  // Calculate total selected notes
  const totalSelectedNotes = structure.tracks
    .filter((t) => selectedIds.has(t.id))
    .reduce((sum, t) => sum + t.noteCount, 0);

  const handleApply = () => {
    stopAudioPreview();

    if (selectedIds.size === 0) {
      alert('Please select at least one track to import.');
      return;
    }

    try {
      const chosenIds = Array.from(selectedIds);
      const song = buildSongFromMidiStructure(structure, chosenIds);
      onConfirm(song, chosenIds);
    } catch (err: any) {
      alert(`Error converting song: ${err.message || 'Unexpected error'}`);
    }
  };

  const getInstrumentIcon = (track: MidiTrackDetail) => {
    if (track.isDrums) return '🥁';
    if (track.role === 'melody') return '🎤';
    if (track.role === 'bass') return '🎸';
    if (track.isPiano || track.role === 'chords') return '🎹';
    if (track.programNumber !== undefined) {
      if (track.programNumber >= 40 && track.programNumber <= 55) return '🎻';
      if (track.programNumber >= 56 && track.programNumber <= 79) return '🎺';
      if (track.programNumber >= 80 && track.programNumber <= 95) return '🎛️';
    }
    return '🎼';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={() => {
        stopAudioPreview();
        onClose();
      }}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center text-2xl shadow-lg shrink-0">
              🎹
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-wide">Filter MIDI Instruments</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                  {structure.bpm} BPM
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5 line-clamp-1 font-medium">
                {structure.title} ({structure.totalNotes} notes across {structure.tracks.length} tracks)
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopAudioPreview();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Quick Explanation Banner */}
        <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-200/90 flex items-center justify-between gap-2">
          <span>
            💡 <strong>How to spot the lead melody:</strong> tap <strong>▶️ Listen</strong> on any track to preview it right away!
          </span>
        </div>

        {/* Preset Filter Buttons */}
        <div className="px-4 py-3 bg-slate-800/40 border-b border-slate-800/80 flex items-center flex-wrap gap-1.5 text-xs">
          <span className="text-slate-400 font-medium mr-1">Quick filters:</span>
          <button
            onClick={selectMelodyOnly}
            className="px-2.5 py-1 rounded-md bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all active:scale-95 flex items-center gap-1"
          >
            🎤 Lead Melody Only
          </button>
          <button
            onClick={selectMelodyAndChords}
            className="px-2.5 py-1 rounded-md bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all active:scale-95 flex items-center gap-1"
          >
            🎹 Melody + Chords
          </button>
          <button
            onClick={selectExcludeDrums}
            className="px-2.5 py-1 rounded-md bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-all active:scale-95"
          >
            🚫🥁 No Drums
          </button>
          <button
            onClick={selectOnlyPiano}
            className="px-2.5 py-1 rounded-md bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
          >
            Piano Only
          </button>
          <button
            onClick={selectAll}
            className="px-2.5 py-1 rounded-md bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
          >
            All
          </button>
          <button
            onClick={selectNone}
            className="px-2.5 py-1 rounded-md bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
          >
            Clear
          </button>
        </div>

        {/* Tracks List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 divide-y divide-slate-800/40">
          {structure.tracks.map((track) => {
            const isChecked = selectedIds.has(track.id);
            const isPreviewing = playingPreviewId === track.id;
            const icon = getInstrumentIcon(track);

            return (
              <div
                key={track.id}
                onClick={() => toggleTrack(track.id)}
                className={`pt-2.5 first:pt-0 flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  isChecked
                    ? 'bg-slate-800/80 border-indigo-500/60 shadow-md ring-1 ring-indigo-500/20'
                    : 'bg-slate-900/40 border-slate-800/70 hover:bg-slate-800/40 opacity-70'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Custom Checkbox */}
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-sm shrink-0 transition-all ${
                      isChecked
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'border border-slate-600 bg-slate-800 text-transparent'
                    }`}
                  >
                    ✓
                  </div>

                  {/* Instrument Icon */}
                  <div className="text-2xl shrink-0">{icon}</div>

                  {/* Track Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-white text-sm truncate">{track.name}</span>

                      {/* Role Badges */}
                      {track.role === 'melody' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                          🎤 Melody / Lead
                        </span>
                      )}
                      {track.role === 'chords' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                          🎹 Chords / Piano
                        </span>
                      )}
                      {track.role === 'bass' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                          🎸 Bass
                        </span>
                      )}
                      {track.isDrums && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                          🥁 Drums (Ch 10)
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>{track.instrumentName}</span>
                      {track.channel !== undefined && (
                        <span className="text-slate-500">• Channel {track.channel + 1}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions: Audio Preview & Note Count */}
                <div className="flex items-center gap-2 shrink-0 pl-2">
                  {/* Audio Preview Button */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleAudioPreview(track, e)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow active:scale-95 ${
                      isPreviewing
                        ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                        : 'bg-slate-700/80 hover:bg-slate-600 text-indigo-300 hover:text-white border border-slate-600'
                    }`}
                    title={isPreviewing ? 'Stop preview' : 'Preview this track audio'}
                  >
                    <span>{isPreviewing ? '⏹️' : '▶️'}</span>
                    <span className="hidden sm:inline">{isPreviewing ? 'Stop' : 'Listen'}</span>
                  </button>

                  {/* Note Count Badge */}
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      isChecked
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {track.noteCount} notes
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs sm:text-sm text-center sm:text-left">
            <span className="text-slate-400">Selected: </span>
            <span className="font-bold text-emerald-400">
              {selectedIds.size} / {structure.tracks.length} tracks
            </span>
            <span className="text-slate-500 mx-2">•</span>
            <span className="font-bold text-white">{totalSelectedNotes} total notes</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                stopAudioPreview();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold transition-colors flex-1 sm:flex-initial"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={selectedIds.size === 0 || totalSelectedNotes === 0}
              className={`px-5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial ${
                selectedIds.size > 0 && totalSelectedNotes > 0
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>🎹 Import {totalSelectedNotes} Notes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
