import React, { useState, useEffect, useRef } from 'react';
import { audioEngine } from '../utils/audioEngine';
import { pitchDetector } from '../utils/pitchDetector';
import {
  Timer,
  Play,
  Square,
  Volume2,
  X,
  Sparkles,
  Zap,
  Music,
  Activity,
  Sliders,
  HelpCircle,
  Mic,
  MicOff,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface MetronomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBpmChange?: (bpm: number) => void;
}

const TEMPO_PRESETS = [
  { name: 'Grave', bpm: 44, desc: 'Very slow and solemn' },
  { name: 'Largo', bpm: 56, desc: 'Slow and majestic' },
  { name: 'Adagio', bpm: 68, desc: 'Slow and expressive' },
  { name: 'Andante', bpm: 88, desc: 'Natural walking pace' },
  { name: 'Moderato', bpm: 112, desc: 'Moderate speed' },
  { name: 'Allegro', bpm: 132, desc: 'Fast and bright' },
  { name: 'Presto', bpm: 168, desc: 'Very fast and rapid' },
  { name: 'Prestissimo', bpm: 200, desc: 'Maximum speed' },
];

const TIME_SIGNATURES = [
  { label: '2/4', beats: 2, name: 'March' },
  { label: '3/4', beats: 3, name: 'Waltz' },
  { label: '4/4', beats: 4, name: 'Common Time' },
  { label: '6/8', beats: 6, name: 'Barcarolle / Pastorale' },
];

export const MetronomeModal: React.FC<MetronomeModalProps> = ({
  isOpen,
  onClose,
  onBpmChange,
}) => {
  const [activeTab, setActiveTab] = useState<'metronome' | 'chords' | 'tuner'>('metronome');

  // Metronome State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [bpm, setBpm] = useState<number>(100);
  const [timeSignature, setTimeSignature] = useState<number>(4);
  const [accentFirstBeat, setAccentFirstBeat] = useState<boolean>(true);
  const [currentBeat, setCurrentBeat] = useState<number>(0);

  // Tap Tempo State
  const tapTimesRef = useRef<number[]>([]);
  const [tapMessage, setTapMessage] = useState<string | null>(null);

  // Interval timer ref
  const metronomeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Tuner State
  const [isTunerActive, setIsTunerActive] = useState<boolean>(false);
  const [tunerNote, setTunerNote] = useState<string | null>(null);
  const [tunerCents, setTunerCents] = useState<number>(0);
  const [tunerFreq, setTunerFreq] = useState<number>(0);

  useEffect(() => {
    if (isPlaying) {
      startMetronomeTimer();
    } else {
      stopMetronomeTimer();
    }
    return () => stopMetronomeTimer();
  }, [isPlaying, bpm, timeSignature, accentFirstBeat]);

  const stopMetronomeTimer = () => {
    if (metronomeTimerRef.current) {
      clearInterval(metronomeTimerRef.current);
      metronomeTimerRef.current = null;
    }
  };

  const startMetronomeTimer = () => {
    stopMetronomeTimer();
    audioEngine.init().catch(() => {});

    let beat = 0;
    const intervalMs = (60 / bpm) * 1000;

    const isAccent = accentFirstBeat && beat === 0;
    audioEngine.playMetronomeClick(isAccent);
    setCurrentBeat(beat);

    beat = (beat + 1) % timeSignature;

    metronomeTimerRef.current = setInterval(() => {
      const isAccentNow = accentFirstBeat && beat === 0;
      audioEngine.playMetronomeClick(isAccentNow);
      setCurrentBeat(beat);
      beat = (beat + 1) % timeSignature;
    }, intervalMs);
  };

  const handleBpmUpdate = (newBpm: number) => {
    const clamped = Math.min(260, Math.max(30, newBpm));
    setBpm(clamped);
    if (onBpmChange) onBpmChange(clamped);
  };

  const handleTapTempo = () => {
    const now = Date.now();
    const times = tapTimesRef.current;

    if (times.length > 0 && now - times[times.length - 1] > 2500) {
      tapTimesRef.current = [now];
      setTapMessage('Detecting Tap...');
      return;
    }

    times.push(now);
    if (times.length > 5) times.shift();

    if (times.length >= 2) {
      const intervals = [];
      for (let i = 1; i < times.length; i++) {
        intervals.push(times[i] - times[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      if (calculatedBpm >= 30 && calculatedBpm <= 260) {
        handleBpmUpdate(calculatedBpm);
        setTapMessage(`TAP: ${calculatedBpm} BPM`);
      }
    } else {
      setTapMessage('Tap again to the beat...');
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    if (isTunerActive && activeTab === 'tuner') {
      if (pitchDetector && typeof pitchDetector.startListening === 'function') {
        pitchDetector.startListening().then((success) => {
          if (success && pitchDetector && typeof pitchDetector.subscribe === 'function') {
            unsubscribe = pitchDetector.subscribe((res) => {
              if (res && res.note) {
                setTunerNote(res.note);
                setTunerCents(res.cents || 0);
                setTunerFreq(res.frequency || 0);
              }
            });
          } else {
            alert('Unable to access microphone for tuner.');
            setIsTunerActive(false);
          }
        });
      }
    } else {
      if (pitchDetector && typeof pitchDetector.stopListening === 'function') {
        pitchDetector.stopListening();
      } else if (pitchDetector && typeof pitchDetector.stop === 'function') {
        pitchDetector.stop();
      }
    }

    return () => {
      if (unsubscribe) unsubscribe();
      if (pitchDetector && typeof pitchDetector.stopListening === 'function') {
        pitchDetector.stopListening();
      } else if (pitchDetector && typeof pitchDetector.stop === 'function') {
        pitchDetector.stop();
      }
    };
  }, [isTunerActive, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/40 w-full max-w-xl rounded-3xl p-6 space-y-6 shadow-2xl relative animate-fadeIn select-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Timer className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Metronome & Studio Tools
              </h2>
              <p className="text-slate-400 text-xs">
                Professional metronome, chord guide, and pitch tuner
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs navigation */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('metronome')}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === 'metronome'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Timer className="w-4 h-4" />
            <span>Metronome</span>
          </button>

          <button
            onClick={() => setActiveTab('chords')}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === 'chords'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>Chord Handbook</span>
          </button>

          <button
            onClick={() => setActiveTab('tuner')}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === 'tuner'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Live Tuner</span>
          </button>
        </div>

        {/* TAB 1: METRONOME */}
        {activeTab === 'metronome' && (
          <div className="space-y-6">
            {/* Visual Pendulum / Beats LED */}
            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                {Array.from({ length: timeSignature }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-6 h-6 rounded-full transition-all duration-75 flex items-center justify-center font-black text-xs ${
                      isPlaying && currentBeat === idx
                        ? idx === 0 && accentFirstBeat
                          ? 'bg-amber-400 text-slate-950 scale-125 shadow-lg shadow-amber-400/50'
                          : 'bg-yellow-300 text-slate-950 scale-110 shadow-md shadow-yellow-300/40'
                        : 'bg-slate-900 text-slate-600 border border-slate-800'
                    }`}
                  >
                    {idx + 1}
                  </div>
                ))}
              </div>

              {/* BPM Big Display */}
              <div className="space-y-1">
                <div className="text-6xl font-black text-white tracking-tight flex items-center justify-center gap-3">
                  <button
                    onClick={() => handleBpmUpdate(bpm - 1)}
                    className="w-10 h-10 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xl flex items-center justify-center border border-slate-800 transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono w-32 text-amber-300">{bpm}</span>
                  <button
                    onClick={() => handleBpmUpdate(bpm + 1)}
                    className="w-10 h-10 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xl flex items-center justify-center border border-slate-800 transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Beats Per Minute (BPM)
                </div>
              </div>

              {/* Play / Stop Button */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 mx-auto transition-all shadow-xl cursor-pointer ${
                  isPlaying
                    ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/20'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/30'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Square className="w-5 h-5 fill-current" />
                    <span>Stop Metronome</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>Start Metronome</span>
                  </>
                )}
              </button>
            </div>

            {/* Tap Tempo & Slider */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-300 mb-1">Tap Tempo</div>
                  <p className="text-[11px] text-slate-400">
                    Tap the button repeatedly to sync tempo to your rhythm.
                  </p>
                </div>
                <button
                  onClick={handleTapTempo}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-black text-xs rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  {tapMessage || 'TAP HERE'}
                </button>
              </div>

              {/* Time Signature & Accents */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-slate-300 block">Time Signature</label>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_SIGNATURES.map((ts) => (
                    <button
                      key={ts.label}
                      onClick={() => setTimeSignature(ts.beats)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                        timeSignature === ts.beats
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="font-black text-sm">{ts.label}</div>
                      <div className="text-[9px] opacity-70">{ts.name}</div>
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={accentFirstBeat}
                    onChange={(e) => setAccentFirstBeat(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-300">
                    Accent first beat (1)
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CHORDS HANDBOOK */}
        {activeTab === 'chords' && (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Music className="w-4 h-4" />
                <span>Essential Piano Chords</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-black text-white">C Major (C)</div>
                  <div className="text-amber-300 font-mono font-bold">C4 - E4 - G4</div>
                  <div className="text-[10px] text-slate-400">Root, Major Third, Perfect Fifth</div>
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-black text-white">A Minor (Am)</div>
                  <div className="text-amber-300 font-mono font-bold">A3 - C4 - E4</div>
                  <div className="text-[10px] text-slate-400">Root, Minor Third, Perfect Fifth</div>
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-black text-white">F Major (F)</div>
                  <div className="text-amber-300 font-mono font-bold">F3 - A3 - C4</div>
                  <div className="text-[10px] text-slate-400">Root, Major Third, Perfect Fifth</div>
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-black text-white">G Major 7 (G7)</div>
                  <div className="text-amber-300 font-mono font-bold">G3 - B3 - D4 - F4</div>
                  <div className="text-[10px] text-slate-400">Dominant Seventh Chord</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PITCH DETECTOR TUNER */}
        {activeTab === 'tuner' && (
          <div className="space-y-4 text-center">
            <div className="bg-slate-950 p-6 rounded-3xl border border-amber-500/30 space-y-4">
              <button
                onClick={() => setIsTunerActive(!isTunerActive)}
                className={`px-6 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 mx-auto cursor-pointer ${
                  isTunerActive
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                }`}
              >
                {isTunerActive ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Deactivate Microphone</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Activate Microphone & Tuner</span>
                  </>
                )}
              </button>

              {isTunerActive && (
                <div className="space-y-3 pt-2">
                  <div className="text-4xl font-black text-amber-300">
                    {tunerNote || '--'}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    Frequency: {tunerFreq ? `${tunerFreq.toFixed(1)} Hz` : '--'}
                  </div>

                  {/* Tuning gauge */}
                  <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden relative border border-slate-800">
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-amber-400 z-10" />
                    <div
                      className="h-full bg-emerald-400 transition-all duration-100"
                      style={{
                        width: '10px',
                        marginLeft: `${Math.min(95, Math.max(5, 50 + tunerCents))}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>♭ Flat</span>
                    <span>In Tune</span>
                    <span>Sharp ♯</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
