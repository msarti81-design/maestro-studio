import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { InteractiveSong } from '../types';
import { audioEngine } from '../utils/audioEngine';
import { songPlaybackState } from '../utils/songPlaybackState';
import { recordNoteHitBonus, recordSongCompletedBonus } from '../utils/gamification';
import { shareChallenge } from '../utils/challengeShare';
import { Play, Pause, RotateCcw, Award, Zap, X, Share2, Check } from 'lucide-react';

interface KeyConfig {
  note: string;
  type: 'white' | 'black';
  octave: number;
}

interface FallingNotesWaterfallProps {
  song: InteractiveSong;
  keys: KeyConfig[];
  getTransposedNote: (note: string) => string;
  onKeyPressExpected?: (note: string) => void;
  onActiveSongChange?: (song: InteractiveSong) => void;
  onClose: () => void;
  lastPlayedNote?: { note: string; timestamp: number } | null;
}

interface KeyPosition {
  x: number;
  width: number;
  type: 'white' | 'black';
}

export const FallingNotesWaterfall: React.FC<FallingNotesWaterfallProps> = React.memo(({
  song,
  keys,
  getTransposedNote,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [playMode, setPlayMode] = useState<'learn' | 'arcade' | 'demo'>('learn');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [waitingTargetNote, setWaitingTargetNote] = useState<string | null>(null);
  const [isCopiedChallenge, setIsCopiedChallenge] = useState<boolean>(false);

  const handleShareChallenge = async () => {
    const res = await shareChallenge({
      songId: song.id,
      songTitle: song.title,
      challengerName: song.author || 'Un Maestro',
      targetScore: score,
    });
    if (res.success) {
      setIsCopiedChallenge(true);
      setTimeout(() => setIsCopiedChallenge(false), 2500);
    }
  };

  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;

  const playModeRef = useRef<'learn' | 'arcade' | 'demo'>(playMode);
  playModeRef.current = playMode;

  const playbackSpeedRef = useRef<number>(playbackSpeed);
  playbackSpeedRef.current = playbackSpeed;

  const currentTimeRef = useRef<number>(0);
  const lastUiUpdateTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // High-precision clock anchoring to prevent drift
  const playheadAnchorRef = useRef<{ audioTime: number; wallTime: number }>({
    audioTime: 0,
    wallTime: performance.now(),
  });

  const hitNotesSetRef = useRef<Set<number>>(new Set());
  const waitingNoteIndexRef = useRef<number | null>(null);

  // Cached dimensions — updated ONLY on resize
  const dimsRef = useRef<{ width: number; height: number }>({ width: 800, height: 200 });

  // Precomputed O(1) Key Positions Map for 60 FPS zero-overhead drawing
  const keyPositionsMapRef = useRef<Map<string, KeyPosition>>(new Map());

  const songDuration = Math.max(...song.notes.map((n) => n.time + n.duration), 5);
  const TRAVEL_TIME = 3.8; // Calibrated 3.8s travel time: plenty of time to see notes falling
  const AUDIO_SYNC_OFFSET = 0.0;

  const whiteKeys = useMemo(() => keys.filter((k) => k.type === 'white'), [keys]);
  const numWhiteKeys = Math.max(1, whiteKeys.length);

  // Recompute position cache whenever keys or canvas dimensions change
  const updateKeyPositionsMap = useCallback((canvasWidth: number) => {
    const map = new Map<string, KeyPosition>();
    const whiteWidth = canvasWidth / numWhiteKeys;

    // Cache white keys
    whiteKeys.forEach((wk, whiteIdx) => {
      map.set(wk.note, {
        x: whiteIdx * whiteWidth,
        width: whiteWidth,
        type: 'white',
      });
    });

    // Cache black keys
    keys.forEach((k, idx) => {
      if (k.type === 'black') {
        let whiteCountBefore = 0;
        for (let i = 0; i < idx; i++) {
          if (keys[i].type === 'white') whiteCountBefore++;
        }
        const blackWidth = whiteWidth * 0.65;
        const x = whiteCountBefore * whiteWidth - blackWidth / 2;
        map.set(k.note, {
          x,
          width: blackWidth,
          type: 'black',
        });
      }
    });

    keyPositionsMapRef.current = map;
  }, [keys, whiteKeys, numWhiteKeys]);

  const processPlayedNote = useCallback((playedNote: string) => {
    const curTime = currentTimeRef.current;

    if (playModeRef.current === 'learn') {
      const waitingIdx = waitingNoteIndexRef.current;
      if (waitingIdx !== null) {
        const expectedNote = song.notes[waitingIdx];
        if (expectedNote && (expectedNote.note === playedNote || getTransposedNote(expectedNote.note) === playedNote)) {
          hitNotesSetRef.current.add(waitingIdx);
          waitingNoteIndexRef.current = null;
          setWaitingTargetNote(null);
          setScore((s) => s + 100);
          recordNoteHitBonus(5);
          setCombo((c) => {
            const next = c + 1;
            setMaxCombo((m) => Math.max(m, next));
            return next;
          });

          // Resume playhead cleanly
          playheadAnchorRef.current = {
            audioTime: currentTimeRef.current,
            wallTime: performance.now(),
          };
          setIsPlaying(true);
          return;
        }
      }

      // Proactive hit: if player hits note as it nears the bar (within 0.4s window)
      for (let i = 0; i < song.notes.length; i++) {
        if (!hitNotesSetRef.current.has(i)) {
          const n = song.notes[i];
          if (Math.abs(n.time - curTime) <= 0.4 && (n.note === playedNote || getTransposedNote(n.note) === playedNote)) {
            hitNotesSetRef.current.add(i);
            setScore((s) => s + 100);
            recordNoteHitBonus(5);
            setCombo((c) => {
              const next = c + 1;
              setMaxCombo((m) => Math.max(m, next));
              return next;
            });
            break;
          }
        }
      }
    } else if (playModeRef.current === 'arcade') {
      let bestIdx = -1;
      let minDiff = 999;
      song.notes.forEach((n, idx) => {
        if (hitNotesSetRef.current.has(idx)) return;
        const diff = Math.abs(n.time - curTime);
        if (diff < 0.35 && (n.note === playedNote || getTransposedNote(n.note) === playedNote)) {
          if (diff < minDiff) {
            minDiff = diff;
            bestIdx = idx;
          }
        }
      });

      if (bestIdx !== -1) {
        hitNotesSetRef.current.add(bestIdx);
        const pts = minDiff < 0.15 ? 100 : 50;
        setScore((s) => s + pts);
        recordNoteHitBonus(minDiff < 0.15 ? 10 : 5);
        setCombo((c) => {
          const next = c + 1;
          setMaxCombo((m) => Math.max(m, next));
          return next;
        });
      }
    }
  }, [song.notes, getTransposedNote]);

  useEffect(() => {
    const handleEvent = (e: Event) => {
      const custom = e as CustomEvent<{ note: string }>;
      if (custom.detail?.note) {
        processPlayedNote(custom.detail.note);
      }
    };
    window.addEventListener('piano:noteplayed', handleEvent);
    return () => window.removeEventListener('piano:noteplayed', handleEvent);
  }, [processPlayedNote]);

  // Main 60 FPS Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const resizeCanvas = () => {
      if (containerRef.current && canvas) {
        const rect = containerRef.current.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        const cssWidth = Math.max(100, Math.floor(rect.width));
        const cssHeight = Math.max(60, Math.floor(rect.height));

        dimsRef.current = { width: cssWidth, height: cssHeight };
        
        canvas.width = Math.floor(cssWidth * dpr);
        canvas.height = Math.floor(cssHeight * dpr);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        ctx.restore();
        ctx.save();
        ctx.scale(dpr, dpr);

        updateKeyPositionsMap(cssWidth);
        // Reset timing anchor on resize so playback clock never stutters when turning screen
        playheadAnchorRef.current = {
          audioTime: currentTimeRef.current,
          wallTime: performance.now(),
        };
      }
    };

    resizeCanvas();

    // Schedule additional resize passes after DOM flex layout pass completes
    const raf1 = requestAnimationFrame(() => resizeCanvas());
    const raf2 = requestAnimationFrame(() => requestAnimationFrame(() => resizeCanvas()));
    const timer = setTimeout(resizeCanvas, 150);

    let resizeTimer: any = null;
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resizeCanvas, 30);
    };

    window.addEventListener('resize', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        resizeCanvas();
      });
      resizeObserver.observe(containerRef.current);
    }

    playheadAnchorRef.current = {
      audioTime: currentTimeRef.current,
      wallTime: performance.now(),
    };

    const render = (now: number) => {
      // Auto-recalibrate canvas if flex container dimensions change or on initial DOM mount
      if (containerRef.current) {
        const curW = Math.floor(containerRef.current.clientWidth);
        const curH = Math.floor(containerRef.current.clientHeight);
        if (curW > 0 && curH > 0 && (curW !== dimsRef.current.width || curH !== dimsRef.current.height)) {
          resizeCanvas();
        }
      }

      const { width, height } = dimsRef.current;
      const hitLineY = height - 1; // Positioned as low as possible right at bottom edge above keys

      if (isPlayingRef.current) {
        // High-precision clock synced with performance.now() to prevent drift
        const elapsedSec = (now - playheadAnchorRef.current.wallTime) / 1000;
        let newTime = playheadAnchorRef.current.audioTime + elapsedSec * playbackSpeedRef.current;

        // Learn Mode: pause right at target note line
        if (playModeRef.current === 'learn') {
          for (let i = 0; i < song.notes.length; i++) {
            if (!hitNotesSetRef.current.has(i)) {
              const n = song.notes[i];
              if (newTime >= n.time) {
                newTime = n.time;
                waitingNoteIndexRef.current = i;
                setIsPlaying(false);
                setWaitingTargetNote(n.note);
                break;
              }
            }
          }
        }

        // Demo Mode: automated acoustic playback
        if (playModeRef.current === 'demo') {
          song.notes.forEach((n, idx) => {
            if (!hitNotesSetRef.current.has(idx) && newTime >= n.time) {
              hitNotesSetRef.current.add(idx);
              audioEngine.playNote(getTransposedNote(n.note), '4n', 'piano');
            }
          });
        }

        currentTimeRef.current = newTime;

        // Synchronize real-time clock with 88-Key Mini-Map Waterfall
        songPlaybackState.currentTime = newTime;
        songPlaybackState.isPlaying = isPlayingRef.current;
        songPlaybackState.activeSong = song;
        songPlaybackState.waitingTargetNote = waitingTargetNote;
        songPlaybackState.waitingNoteIndex = waitingNoteIndexRef.current;

        // UI state throttled to 500ms to eliminate React re-render stutter during 60 FPS Canvas playback
        if (Math.abs(newTime - lastUiUpdateTimeRef.current) >= 0.5 || newTime >= songDuration) {
          lastUiUpdateTimeRef.current = newTime;
          setCurrentTime(newTime);
        }

        if (newTime >= songDuration + 1) {
          if (!isCompleted) {
            recordSongCompletedBonus(score, maxCombo);
          }
          setIsCompleted(true);
          setIsPlaying(false);
          songPlaybackState.isPlaying = false;
        }
      }

      // Visual time with calibrated lead offset so the visual note arrives right on the hit line
      const visualTime = currentTimeRef.current + AUDIO_SYNC_OFFSET;

      // Dark background fill
      ctx.fillStyle = '#080d1a';
      ctx.fillRect(0, 0, width, height);

      // Vertical lane guides - Batched single-path fill for zero GPU overhead
      const whiteWidth = width / numWhiteKeys;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.beginPath();
      for (let i = 0; i < numWhiteKeys; i += 2) {
        ctx.rect(i * whiteWidth, 0, whiteWidth, hitLineY);
      }
      ctx.fill();

      // Smooth 3.8s travel speed for falling notes
      const travelTime = 3.8;
      const pixelsPerSecond = hitLineY / travelTime;
      const keyPosMap = keyPositionsMapRef.current;

      const notes = song.notes;
      const len = notes.length;

      for (let i = 0; i < len; i++) {
        const n = notes[i];
        const timeToHit = n.time - visualTime;
        const yBottom = hitLineY - timeToHit * pixelsPerSecond;
        const noteHeight = Math.max(14, (n.duration || 0.4) * pixelsPerSecond * 0.75);
        const yTop = yBottom - noteHeight;

        if (yTop > height || yBottom < 0) continue;

        const isHit = hitNotesSetRef.current.has(i);
        const isWaiting = waitingNoteIndexRef.current === i;
        const keyPos = keyPosMap.get(n.note);

        if (!keyPos) continue;

        const noteWidth = Math.max(4, keyPos.width - 2);
        const noteX = keyPos.x + 1;

        if (isHit && playModeRef.current !== 'demo') {
          ctx.fillStyle = 'rgba(71, 85, 105, 0.25)';
          ctx.fillRect(noteX, yTop, noteWidth, noteHeight);
        } else if (isWaiting) {
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(noteX, yTop, noteWidth, noteHeight);
        } else {
          ctx.fillStyle = keyPos.type === 'black' ? '#a855f7' : '#0284c7';
          ctx.fillRect(noteX, yTop, noteWidth, noteHeight);
        }
      }

      // Target hit line (Gold bar right above piano keys)
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, hitLineY - 1, width, 3);

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(timer);
      if (resizeTimer) clearTimeout(resizeTimer);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [song, songDuration, numWhiteKeys, updateKeyPositionsMap, getTransposedNote]);

  const handleReset = () => {
    currentTimeRef.current = 0;
    setCurrentTime(0);
    playheadAnchorRef.current = {
      audioTime: 0,
      wallTime: performance.now(),
    };
    songPlaybackState.currentTime = 0;
    songPlaybackState.isPlaying = true;
    songPlaybackState.activeSong = song;
    songPlaybackState.waitingTargetNote = null;
    songPlaybackState.waitingNoteIndex = null;
    hitNotesSetRef.current.clear();
    waitingNoteIndexRef.current = null;
    setWaitingTargetNote(null);
    setScore(0);
    setCombo(0);
    setIsCompleted(false);
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    if (!isPlaying) {
      playheadAnchorRef.current = {
        audioTime: currentTimeRef.current,
        wallTime: performance.now(),
      };
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  const progressPercent = Math.min(100, Math.round((currentTime / songDuration) * 100));

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none px-1 sm:px-2"
    >
      {/* HUD Header Bar */}
      <div className="absolute top-1 left-2 right-2 z-20 flex items-center justify-between text-xs pointer-events-auto">
        {/* Song Info */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1 backdrop-blur-md">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-extrabold text-white truncate max-w-[140px] sm:max-w-[220px]">
            {song.title}
          </span>
          <span className="text-[10px] text-slate-400 hidden sm:inline">&bull; {song.author}</span>
        </div>

        {/* Mode Selector & Controls */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 backdrop-blur-md">
          {(['learn', 'arcade', 'demo'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setPlayMode(m);
                handleReset();
              }}
              className={`px-2 py-0.5 text-[10px] font-bold rounded capitalize transition-all ${
                playMode === m
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {m === 'learn' ? 'Impara' : m === 'arcade' ? 'Arcade' : 'Ascolta'}
            </button>
          ))}

          {/* Speed Selector */}
          <div className="flex items-center bg-slate-800/80 rounded px-1 py-0.5 border border-slate-700/60 text-[9px] font-bold">
            <span className="text-slate-400 mr-1 hidden sm:inline">Velocità:</span>
            {[0.5, 0.75, 1.0, 1.25].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setPlaybackSpeed(s);
                  playheadAnchorRef.current = {
                    audioTime: currentTimeRef.current,
                    wallTime: performance.now(),
                  };
                }}
                className={`px-1 py-0.2 rounded transition-colors ${
                  playbackSpeed === s ? 'bg-amber-400 text-slate-950 font-black' : 'text-slate-300 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <button
            onClick={togglePlayPause}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title={isPlaying ? 'Pausa' : 'Riproduci'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleReset}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Ricomincia"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors ml-1"
            title="Chiudi visuale a cascata"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Score & Combo */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1 backdrop-blur-md hidden sm:flex">
          <div className="flex items-center gap-1 text-amber-400 font-bold">
            <Zap className="w-3.5 h-3.5" />
            <span>{score}</span>
          </div>
          {combo > 1 && (
            <div className="text-[10px] text-cyan-400 font-extrabold uppercase animate-pulse">
              {combo}x Combo!
            </div>
          )}
        </div>
      </div>

      {/* Target prompt in 'learn' mode */}
      {waitingTargetNote && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center">
          <div className="bg-amber-500/95 text-slate-950 font-black px-4 py-1 rounded-full text-xs shadow-lg animate-bounce flex items-center gap-1.5">
            <span>PREMI TASTO:</span>
            <span className="text-sm bg-slate-950 text-amber-400 px-2 py-0.5 rounded font-mono">
              {waitingTargetNote}
            </span>
          </div>
        </div>
      )}

      {/* 60 FPS Canvas with zero lag and O(1) rendering */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-pointer" />

      {/* Sleek, Ultra-Compact Floating Completion Banner */}
      {isCompleted && (
        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm z-30 flex items-center justify-center p-2">
          <div className="bg-slate-900/95 border border-amber-500/60 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 max-w-md w-auto shadow-2xl flex items-center gap-2.5 sm:gap-3.5 animate-in fade-in zoom-in-95 duration-200">
            {/* Trophy Icon */}
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Award className="w-4 h-4" />
            </div>

            {/* Info */}
            <div className="min-w-0 pr-1 text-left">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs font-black text-white">Brano Completato!</span>
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  {score} pt
                </span>
                {maxCombo > 1 && (
                  <span className="text-[10px] font-extrabold text-cyan-400 hidden sm:inline">
                    {maxCombo}x combo
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-300 truncate max-w-[140px] sm:max-w-[200px]">
                {song.title}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-slate-800">
              <button
                onClick={handleShareChallenge}
                className="px-2.5 py-1 bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-black text-[11px] rounded-lg transition-all shadow-sm flex items-center gap-1"
                title="Condividi e sfida un amico su WhatsApp o social"
              >
                {isCopiedChallenge ? <Check className="w-3 h-3 text-emerald-950" /> : <Share2 className="w-3 h-3" />}
                <span>{isCopiedChallenge ? 'Copiato!' : 'Sfida'}</span>
              </button>
              <button
                onClick={handleReset}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-[11px] rounded-lg transition-all shadow-sm flex items-center gap-1"
                title="Ricomincia a suonare"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Rigioca</span>
              </button>
              <button
                onClick={onClose}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                title="Chiudi visuale brano"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
