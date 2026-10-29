import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { InteractiveSong } from '../types';
import { audioEngine } from '../utils/audioEngine';
import { songPlaybackState } from '../utils/songPlaybackState';
import { recordNoteHitBonus, recordSongCompletedBonus } from '../utils/gamification';
import { shareChallenge } from '../utils/challengeShare';
import { noteNameToMidiNumber } from '../utils/midiEngine';
import { Play, Pause, RotateCcw, Award, Zap, X, Share2, Check, Hand, HelpCircle, BookOpen } from 'lucide-react';
import {
  calculateFingeringForNotes,
  detectSongHand,
  getFingerInfo,
  getPedagogicalFingeringTip,
  getStandardFingeringRules,
  FingeringRuleDescription,
  FINGER_METADATA,
} from '../utils/pianoFingeringEngine';

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
  initialPlayMode?: 'learn' | 'arcade' | 'fingering' | 'demo';
  isMasterclassMode?: boolean;
  onMasterclassFinished?: () => void;
  onActiveGuidanceChange?: (guidance: { note: string | null; finger: number | null; tip?: string | null; hand?: 'right' | 'left' } | null) => void;
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
  initialPlayMode = 'arcade',
  isMasterclassMode = false,
  onMasterclassFinished,
  onActiveGuidanceChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const songDuration = useMemo(() => Math.max(...song.notes.map((n) => n.time + n.duration), 5), [song.notes]);

  const [playMode, setPlayMode] = useState<'learn' | 'arcade' | 'fingering' | 'demo'>(initialPlayMode);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [waitingTargetNote, setWaitingTargetNote] = useState<string | null>(null);
  const [waitingTargetFinger, setWaitingTargetFinger] = useState<number | null>(null);
  const [waitingTip, setWaitingTip] = useState<string | null>(null);
  const [isCopiedChallenge, setIsCopiedChallenge] = useState<boolean>(false);
  const [isFingeringRulesModalOpen, setIsFingeringRulesModalOpen] = useState<boolean>(false);
  const [loopFeedbackMessage, setLoopFeedbackMessage] = useState<string | null>(null);

  // Count-In State
  const [isCountIn, setIsCountIn] = useState<boolean>(true);
  const [countInText, setCountInText] = useState<string | null>('3');

  // Loop A-B State
  const [isLoopABActive, setIsLoopABActive] = useState<boolean>(false);
  const [loopTimeA, setLoopTimeA] = useState<number>(0);
  const [loopTimeB, setLoopTimeB] = useState<number>(songDuration);

  const isLoopABActiveRef = useRef<boolean>(isLoopABActive);
  isLoopABActiveRef.current = isLoopABActive;
  const loopTimeARef = useRef<number>(loopTimeA);
  loopTimeARef.current = loopTimeA;
  const loopTimeBRef = useRef<number>(loopTimeB);
  loopTimeBRef.current = loopTimeB;

  // Rilevamento automatico mano (destra o sinistra) basato su registro/chiave o metadati
  const detectedHand = useMemo<'right' | 'left'>(() => {
    if (song.hand) return song.hand;
    return detectSongHand(song.notes);
  }, [song]);

  const [selectedHand, setSelectedHand] = useState<'right' | 'left' | 'both'>(detectedHand);

  useEffect(() => {
    setSelectedHand(detectedHand);
  }, [detectedHand]);

  const selectedHandRef = useRef<'right' | 'left' | 'both'>(selectedHand);
  selectedHandRef.current = selectedHand;

  // Count-In acoustic effect
  useEffect(() => {
    if (!isCountIn) return;
    setIsPlaying(false);
    setCountInText('3');
    try { audioEngine.playMetronomeClick(true); } catch(e){}

    const t1 = setTimeout(() => {
      setCountInText('2');
      try { audioEngine.playMetronomeClick(false); } catch(e){}
    }, 1000);

    const t2 = setTimeout(() => {
      setCountInText('1');
      try { audioEngine.playMetronomeClick(false); } catch(e){}
    }, 2000);

    const t3 = setTimeout(() => {
      setCountInText('VIA!');
      try { audioEngine.playMetronomeClick(true); } catch(e){}
    }, 3000);

    const t4 = setTimeout(() => {
      setCountInText(null);
      setIsCountIn(false);
      currentTimeRef.current = 0;
      lastFrameTimeRef.current = null;
      setIsPlaying(true);
    }, 4000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isCountIn]);

  // Pre-calcola la diteggiatura ottimale per la mano selezionata (regole speculari DX/SX)
  const songFingering = useMemo(() => {
    const targetH = selectedHand === 'both' ? 'right' : selectedHand;
    return calculateFingeringForNotes(song.notes, targetH);
  }, [song.notes, selectedHand]);

  const onActiveGuidanceChangeRef = useRef(onActiveGuidanceChange);
  onActiveGuidanceChangeRef.current = onActiveGuidanceChange;

  const handleShareChallenge = async () => {
    const res = await shareChallenge({
      songId: song.id,
      songTitle: song.title,
      challengerName: song.author || 'A Teacher',
      targetScore: score,
    });
    if (res.success) {
      setIsCopiedChallenge(true);
      setTimeout(() => setIsCopiedChallenge(false), 2500);
    }
  };

  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;

  const playModeRef = useRef<'learn' | 'arcade' | 'fingering' | 'demo'>(playMode);
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

  const TRAVEL_TIME = 3.8; // Calibrated 3.8s travel time: plenty of time to see notes falling
  const AUDIO_SYNC_OFFSET = 0.0;

  const whiteKeys = useMemo(() => keys.filter((k) => k.type === 'white'), [keys]);
  const numWhiteKeys = Math.max(1, whiteKeys.length);

  const keysRef = useRef(keys);
  keysRef.current = keys;

  const whiteKeysRef = useRef(whiteKeys);
  whiteKeysRef.current = whiteKeys;

  const numWhiteKeysRef = useRef(numWhiteKeys);
  numWhiteKeysRef.current = numWhiteKeys;

  const getTransposedNoteRef = useRef(getTransposedNote);
  getTransposedNoteRef.current = getTransposedNote;

  const songRef = useRef(song);
  songRef.current = song;

  const songDurationRef = useRef(songDuration);
  songDurationRef.current = songDuration;

  const songFingeringRef = useRef(songFingering);
  songFingeringRef.current = songFingering;

  // Recompute position cache whenever keys or canvas dimensions change
  const updateKeyPositionsMap = useCallback((canvasWidth: number) => {
    const map = new Map<string, KeyPosition>();
    const currentKeys = keysRef.current;
    const currentWhiteKeys = whiteKeysRef.current;
    const currentNumWhite = Math.max(1, currentWhiteKeys.length);
    const whiteWidth = canvasWidth / currentNumWhite;

    // Cache white keys
    currentWhiteKeys.forEach((wk, whiteIdx) => {
      map.set(wk.note, {
        x: whiteIdx * whiteWidth,
        width: whiteWidth,
        type: 'white',
      });
    });

    // Cache black keys
    currentKeys.forEach((k, idx) => {
      if (k.type === 'black') {
        let whiteCountBefore = 0;
        for (let i = 0; i < idx; i++) {
          if (currentKeys[i].type === 'white') whiteCountBefore++;
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
  }, []);

  useEffect(() => {
    if (dimsRef.current.width > 0) {
      updateKeyPositionsMap(dimsRef.current.width);
    }
  }, [keys, updateKeyPositionsMap]);

  const processPlayedNote = useCallback((playedNote: string) => {
    const curTime = currentTimeRef.current;

    if (playModeRef.current === 'learn' || playModeRef.current === 'fingering') {
      const waitingIdx = waitingNoteIndexRef.current;
      if (waitingIdx !== null) {
        const expectedNote = song.notes[waitingIdx];
        if (expectedNote && (expectedNote.note === playedNote || getTransposedNote(expectedNote.note) === playedNote)) {
          hitNotesSetRef.current.add(waitingIdx);
          waitingNoteIndexRef.current = null;
          setWaitingTargetNote(null);
          setWaitingTargetFinger(null);
          setWaitingTip(null);
          songPlaybackState.waitingTargetNote = null;
          songPlaybackState.waitingFinger = null;
          songPlaybackState.waitingTip = null;
          if (onActiveGuidanceChangeRef.current) {
            onActiveGuidanceChangeRef.current(null);
          }
          if (!isMasterclassMode) {
            setScore((s) => s + 100);
            recordNoteHitBonus(5);
            setCombo((c) => {
              const next = c + 1;
              setMaxCombo((m) => Math.max(m, next));
              return next;
            });
          }

          // Resume playhead cleanly
          lastFrameTimeRef.current = null;
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
            if (!isMasterclassMode) {
              setScore((s) => s + 100);
              recordNoteHitBonus(5);
              setCombo((c) => {
                const next = c + 1;
                setMaxCombo((m) => Math.max(m, next));
                return next;
              });
            }
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
        if (!isMasterclassMode) {
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
    }
  }, [song.notes, getTransposedNote, isMasterclassMode]);

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

  const sortedNotes = useMemo(() => {
    return [...song.notes]
      .map((n, originalIndex) => ({ ...n, originalIndex }))
      .sort((a, b) => a.time - b.time);
  }, [song.notes]);

  const lastFrameTimeRef = useRef<number | null>(null);

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

    let resizeObserverRafId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (resizeObserverRafId !== null) cancelAnimationFrame(resizeObserverRafId);
        resizeObserverRafId = requestAnimationFrame(() => {
          resizeCanvas();
        });
      });
      resizeObserver.observe(containerRef.current);
    }

    lastFrameTimeRef.current = null;

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

      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = now;
      }
      const deltaSec = Math.max(0, Math.min(0.1, (now - lastFrameTimeRef.current) / 1000));
      lastFrameTimeRef.current = now;

      if (isPlayingRef.current) {
        let newTime = currentTimeRef.current + deltaSec * playbackSpeedRef.current;

        // Loop A-B Studio a Sezioni check
        if (isLoopABActiveRef.current && newTime >= loopTimeBRef.current) {
          newTime = loopTimeARef.current;
        }

        // Learn & Fingering Mode: pause right at target note line
        if (playModeRef.current === 'learn' || playModeRef.current === 'fingering') {
          for (let i = 0; i < sortedNotes.length; i++) {
            const sn = sortedNotes[i];
            const origIdx = sn.originalIndex;
            if (!hitNotesSetRef.current.has(origIdx)) {
              if (newTime >= sn.time) {
                newTime = sn.time;
                waitingNoteIndexRef.current = origIdx;
                setIsPlaying(false);
                setWaitingTargetNote(sn.note);

                if (playModeRef.current === 'fingering') {
                  const finger = songFingering[origIdx] || 1;
                  setWaitingTargetFinger(finger);
                  const prevNote = origIdx > 0 ? song.notes[origIdx - 1]?.note : undefined;
                  const prevFinger = origIdx > 0 ? songFingering[origIdx - 1] : undefined;
                  const rawH = selectedHandRef.current;
                  const curHand = rawH === 'both' ? 'right' : rawH;
                  const tip = getPedagogicalFingeringTip(sn.note, finger, prevNote, prevFinger, curHand);
                  setWaitingTip(tip);

                  songPlaybackState.waitingTargetNote = sn.note;
                  songPlaybackState.waitingNoteIndex = origIdx;
                  songPlaybackState.waitingFinger = finger;
                  songPlaybackState.waitingTip = tip;
                  if (onActiveGuidanceChangeRef.current) {
                    onActiveGuidanceChangeRef.current({ note: sn.note, finger, tip, hand: curHand });
                  }
                } else {
                  // Modalità Impara originale: NESSUNA mano sulla tastiera, nessun dito e nessun auto-scroll
                  setWaitingTargetFinger(null);
                  setWaitingTip(null);
                  songPlaybackState.waitingTargetNote = sn.note;
                  songPlaybackState.waitingNoteIndex = origIdx;
                  songPlaybackState.waitingFinger = null;
                  songPlaybackState.waitingTip = null;
                  if (onActiveGuidanceChangeRef.current) {
                    onActiveGuidanceChangeRef.current(null);
                  }
                }
                break;
              }
            }
          }
        }

        // Demo Mode: automated acoustic playback
        if (playModeRef.current === 'demo') {
          sortedNotes.forEach((sn) => {
            const origIdx = sn.originalIndex;
            if (!hitNotesSetRef.current.has(origIdx) && newTime >= sn.time) {
              hitNotesSetRef.current.add(origIdx);
              audioEngine.playNote(getTransposedNoteRef.current(sn.note), '4n', 'piano');
            }
          });
        }

        currentTimeRef.current = newTime;

        // Synchronize real-time clock with 88-Key Mini-Map Waterfall
        songPlaybackState.currentTime = newTime;
        songPlaybackState.isPlaying = isPlayingRef.current;
        songPlaybackState.activeSong = songRef.current;
        songPlaybackState.waitingTargetNote = waitingTargetNote;
        songPlaybackState.waitingNoteIndex = waitingNoteIndexRef.current;

        // UI state throttled to 500ms to eliminate React re-render stutter during 60 FPS Canvas playback
        if (Math.abs(newTime - lastUiUpdateTimeRef.current) >= 0.5 || newTime >= songDurationRef.current) {
          lastUiUpdateTimeRef.current = newTime;
          setCurrentTime(newTime);
        }

        if (newTime >= songDurationRef.current + 0.8) {
          if (!isCompleted) {
            if (!isMasterclassMode) {
              recordSongCompletedBonus(score, maxCombo);
            } else if (onMasterclassFinished) {
              onMasterclassFinished();
            }
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
      const currentNumWhiteKeys = numWhiteKeysRef.current;
      const whiteWidth = width / Math.max(1, currentNumWhiteKeys);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.beginPath();
      for (let i = 0; i < currentNumWhiteKeys; i += 2) {
        ctx.rect(i * whiteWidth, 0, whiteWidth, hitLineY);
      }
      ctx.fill();

      // Smooth 3.8s travel speed for falling notes
      const travelTime = 3.8;
      const pixelsPerSecond = hitLineY / travelTime;
      const keyPosMap = keyPositionsMapRef.current;

      const notes = songRef.current.notes;
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
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(noteX, yTop, noteWidth, noteHeight);
        } else {
          let noteFillColor = keyPos.type === 'black' ? '#a855f7' : '#0284c7';
          if (selectedHandRef.current === 'left') {
            noteFillColor = keyPos.type === 'black' ? '#059669' : '#10b981';
          } else if (selectedHandRef.current === 'both') {
            const midiNum = noteNameToMidiNumber(n.note);
            if (midiNum < 60) {
              noteFillColor = '#10b981'; // Emerald for LH
            } else {
              noteFillColor = '#06b6d4'; // Cyan for RH
            }
          }
          ctx.fillStyle = noteFillColor;
          ctx.fillRect(noteX, yTop, noteWidth, noteHeight);
        }

        // --- DRAW FINGER NUMBER BADGE ON NOTE BLOCK (Solo Modalità Diteggiatura) ---
        if (playModeRef.current === 'fingering') {
          const fingerNum = songFingeringRef.current[i] || 1;
          const badgeD = Math.min(18, Math.min(noteWidth - 2, noteHeight - 2));
          if (badgeD >= 9) {
            const bX = noteX + noteWidth / 2;
            const bY = yTop + noteHeight / 2;
            const fingerColor = FINGER_METADATA[fingerNum]?.color || '#f59e0b';

            ctx.beginPath();
            ctx.arc(bX, bY, badgeD / 2, 0, Math.PI * 2);
            ctx.fillStyle = isHit ? 'rgba(15, 23, 42, 0.4)' : '#0f172a';
            ctx.fill();
            ctx.lineWidth = isWaiting ? 2 : 1.2;
            ctx.strokeStyle = isWaiting ? '#ffffff' : fingerColor;
            ctx.stroke();

            ctx.fillStyle = isHit ? '#94a3b8' : '#ffffff';
            ctx.font = `bold ${Math.max(8, Math.round(badgeD * 0.7))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(fingerNum), bX, bY + 0.5);
          }
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
  }, [song.id]);

  const handleReset = () => {
    currentTimeRef.current = 0;
    setCurrentTime(0);
    lastFrameTimeRef.current = null;
    songPlaybackState.currentTime = 0;
    songPlaybackState.isPlaying = true;
    songPlaybackState.activeSong = song;
    songPlaybackState.waitingTargetNote = null;
    songPlaybackState.waitingNoteIndex = null;
    songPlaybackState.waitingFinger = null;
    songPlaybackState.waitingTip = null;
    songPlaybackState.playMode = playMode;
    if (onActiveGuidanceChangeRef.current) {
      onActiveGuidanceChangeRef.current(null);
    }
    hitNotesSetRef.current.clear();
    waitingNoteIndexRef.current = null;
    setWaitingTargetNote(null);
    setWaitingTargetFinger(null);
    setWaitingTip(null);
    setScore(0);
    setCombo(0);
    setIsCompleted(false);
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    if (!isPlaying) {
      lastFrameTimeRef.current = null;
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
      {/* HUD Header Bar - Sleek Single Row */}
      <div className="absolute top-1 left-2 right-2 z-20 flex items-center justify-between text-xs pointer-events-auto flex-nowrap gap-1">
        {/* Song Info */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-0.5 backdrop-blur-md shrink-0">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-extrabold text-white truncate max-w-[110px] sm:max-w-[180px] text-[11px]">
            {song.title}
          </span>
          <span className="text-[9px] text-slate-400 hidden md:inline">&bull; {song.author}</span>
        </div>

        {/* Mode Selector & Controls - Single Row */}
        <div className="flex items-center gap-1 bg-slate-900/95 border border-slate-800 rounded-lg p-0.5 backdrop-blur-md flex-nowrap shrink-0 overflow-x-auto scrollbar-none">
          {([
            { id: 'learn', label: 'Impara', icon: '🎯' },
            { id: 'fingering', label: 'Dita', icon: '🖐️' },
            { id: 'arcade', label: 'Arcade', icon: '🎮' },
            { id: 'demo', label: 'Demo', icon: '🤖' },
          ] as const).map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => {
                setPlayMode(id);
                songPlaybackState.playMode = id;
                if (id !== 'fingering') {
                  if (onActiveGuidanceChangeRef.current) {
                    onActiveGuidanceChangeRef.current(null);
                  }
                }
                handleReset();
              }}
              className={`px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold rounded flex items-center gap-0.5 transition-all cursor-pointer whitespace-nowrap ${
                playMode === id
                  ? id === 'fingering'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow-sm ring-1 ring-amber-300'
                    : 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={
                id === 'fingering'
                  ? 'Guida passo-passo con la Mano Trasparente e numeri delle dita (1-5)'
                  : id === 'learn'
                  ? 'Aspetta che tu suoni la nota corretta'
                  : id === 'arcade'
                  ? 'Gioco ritmico a tempo con punteggio'
                  : 'Dimostrazione con mano virtuale che suona da sola'
              }
            >
              <span>{icon}</span>
              <span className="hidden xs:inline">{label}</span>
            </button>
          ))}

          {/* Quick Info: Standard Fingering Rules button */}
          <button
            onClick={() => setIsFingeringRulesModalOpen(true)}
            className="p-0.5 text-amber-400 hover:text-amber-300 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Regole Diteggiatura Pianistica"
          >
            <HelpCircle className="w-3 h-3" />
          </button>

          {/* Selettore Mano (Mano Destra ✋ / Mano Sinistra 🤚 / Entrambe le Mani 👐) */}
          <button
            onClick={() => {
              const nextHand = selectedHand === 'right' ? 'left' : selectedHand === 'left' ? 'both' : 'right';
              setSelectedHand(nextHand);
              selectedHandRef.current = nextHand;
            }}
            className={`px-1.5 py-0.5 text-[9px] font-bold rounded flex items-center gap-0.5 transition-all border cursor-pointer whitespace-nowrap ${
              selectedHand === 'right'
                ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                : selectedHand === 'left'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
            }`}
            title={`Mano: ${selectedHand === 'right' ? 'Mano Destra (Dx)' : selectedHand === 'left' ? 'Mano Sinistra (Sx)' : 'Entrambe le Mani (Insieme)'}. Clicca per cambiare!`}
          >
            <span>{selectedHand === 'right' ? '✋ Dx' : selectedHand === 'left' ? '🤚 Sx' : '👐 Insieme'}</span>
          </button>

          {/* Loop A-B Studio a Sezioni Controls */}
          <div className="flex items-center gap-0.5 bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-[9px]">
            <button
              onClick={() => {
                const t = Math.round(currentTimeRef.current * 10) / 10;
                setLoopTimeA(t);
                if (loopTimeB <= t) {
                  setLoopTimeB(Math.min(songDuration, t + 4.0));
                }
                setIsLoopABActive(true);
                setLoopFeedbackMessage(`📍 Punto A impostato a ${t.toFixed(1)}s (Loop Attivo)`);
                setTimeout(() => setLoopFeedbackMessage(null), 2500);
              }}
              className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded font-mono font-bold cursor-pointer"
              title="Imposta punto A del Loop al tempo corrente"
            >
              [A: {loopTimeA.toFixed(1)}s]
            </button>
            <button
              onClick={() => {
                const t = Math.max(loopTimeA + 0.5, Math.round(currentTimeRef.current * 10) / 10);
                setLoopTimeB(t);
                setIsLoopABActive(true);
                setLoopFeedbackMessage(`📍 Punto B impostato a ${t.toFixed(1)}s (Loop Attivo)`);
                setTimeout(() => setLoopFeedbackMessage(null), 2500);
              }}
              className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded font-mono font-bold cursor-pointer"
              title="Imposta punto B del Loop al tempo corrente"
            >
              [B: {loopTimeB.toFixed(1)}s]
            </button>
            <button
              onClick={() => {
                const next = !isLoopABActive;
                setIsLoopABActive(next);
                setLoopFeedbackMessage(next ? `🔁 Loop A-B Attivo (${loopTimeA.toFixed(1)}s - ${loopTimeB.toFixed(1)}s)` : `⏹️ Loop A-B Disattivato`);
                setTimeout(() => setLoopFeedbackMessage(null), 2500);
              }}
              className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                isLoopABActive ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
              title={isLoopABActive ? 'Loop A-B attivo (Ripeti Frase)' : 'Attiva Loop A-B (Ripeti Frase)'}
            >
              Loop {isLoopABActive ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Compact Cycle Speed Button */}
          <button
            onClick={() => {
              const speeds = [1.0, 1.25, 0.5, 0.75];
              const curIdx = speeds.indexOf(playbackSpeed);
              const nextSpeed = speeds[(curIdx + 1) % speeds.length];
              setPlaybackSpeed(nextSpeed);
              lastFrameTimeRef.current = null;
            }}
            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-750 text-amber-300 border border-slate-700/60 rounded text-[9px] font-mono font-bold cursor-pointer transition-colors"
            title="Velocità riproduzione (clicca per cambiare)"
          >
            {playbackSpeed}x
          </button>

          <button
            onClick={togglePlayPause}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>

          <button
            onClick={handleReset}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Ricomincia"
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Close waterfall view"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Score & Combo (or Masterclass Badge) */}
        {isMasterclassMode ? (
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1 backdrop-blur-md hidden sm:flex text-amber-300 font-black text-[11px]">
            <span>👑 Masterclass</span>
          </div>
        ) : (
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
        )}
      </div>

      {/* Loop Feedback Toast Banner */}
      {loopFeedbackMessage && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black px-4 py-1.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs animate-in fade-in slide-in-from-top-2 pointer-events-none">
          <span>{loopFeedbackMessage}</span>
        </div>
      )}

      {/* Target Prompt in 'fingering' mode - Shows Note, Finger, and Tip */}
      {waitingTargetNote && playMode === 'fingering' && (
        <div className="absolute top-11 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center max-w-[94vw]">
          <div className="bg-slate-950/95 border-2 border-amber-400/80 text-amber-300 font-extrabold px-3 py-1 rounded-full text-[11px] shadow-2xl backdrop-blur-md flex items-center gap-2 flex-wrap justify-center animate-in fade-in">
            <span className="text-[10px] text-amber-300/80 uppercase font-black">PLAY:</span>
            <span className="text-xs bg-amber-500/25 text-amber-200 px-2 py-0.5 rounded font-mono font-black border border-amber-400/40">
              {waitingTargetNote}
            </span>
            {waitingTargetFinger && (
              <span className="flex items-center gap-1 text-[11px] font-black text-cyan-300 bg-cyan-950/90 border border-cyan-500/50 px-2.5 py-0.5 rounded-full">
                <span>{selectedHand === 'left' ? '🤚 Left Hand' : '✋ Right Hand'}: Finger {waitingTargetFinger} ({getFingerInfo(waitingTargetFinger).englishName})</span>
              </span>
            )}
          </div>
          {waitingTip && (
            <div className="mt-1 bg-slate-900/95 border border-amber-500/30 text-amber-200 text-[10px] px-3 py-1 rounded-lg max-w-md text-center shadow-lg animate-in fade-in slide-in-from-top-1">
              💡 {waitingTip}
            </div>
          )}
        </div>
      )}

      {/* Target Prompt in original 'learn' mode */}
      {waitingTargetNote && playMode === 'learn' && (
        <div className="absolute top-11 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-slate-950/90 border-2 border-amber-400 text-amber-300 font-extrabold px-3 py-1 rounded-full text-xs shadow-2xl backdrop-blur-md flex items-center gap-1.5 animate-pulse">
            <span>Press</span>
            <span className="text-amber-200 font-mono font-black">{waitingTargetNote}</span>
            <span>to continue...</span>
          </div>
        </div>
      )}

      {/* 60 FPS Canvas with zero lag and O(1) rendering */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-pointer" />

      {/* Masterclass Completion Screen (No points, No rigioca modal, Handover back to Maestro) */}
      {isCompleted && isMasterclassMode ? (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-30 flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-slate-900 border border-emerald-500/60 rounded-2xl p-5 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center text-emerald-400 font-bold text-xl mb-3">
              👑
            </div>
            <h3 className="text-base font-black text-white">Phrase Completed!</h3>
            <p className="text-xs text-slate-300 mt-1 mb-5">
              You completed all {song.notes.length} notes sent by the Teacher! Turn goes back to the Teacher.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-lg cursor-pointer"
            >
              ⬅️ Back to Piano
            </button>
          </div>
        </div>
      ) : isCompleted && (
        /* Final Report & Stars Screen */
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-30 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 text-2xl mb-3 shadow-lg shadow-amber-500/20 animate-bounce">
              🏆
            </div>
            <h3 className="text-lg font-black text-white">Report &amp; Performance</h3>
            <p className="text-xs text-amber-300 font-bold mb-4">{song.title} ({song.author})</p>

            {/* Stars & Accuracy Card */}
            <div className="w-full bg-slate-950/90 border border-slate-800 rounded-xl p-4 mb-5 space-y-3">
              <div className="text-3xl font-black tracking-widest text-amber-400 drop-shadow">
                {(() => {
                  const hitCount = hitNotesSetRef.current.size;
                  const acc = Math.min(100, Math.max(0, Math.round((hitCount / Math.max(1, song.notes.length)) * 100)));
                  return acc >= 92 ? '⭐⭐⭐' : acc >= 78 ? '⭐⭐' : '⭐';
                })()}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Accuracy</div>
                  <div className="text-sm font-black text-emerald-400 font-mono">
                    {Math.min(100, Math.max(0, Math.round((hitNotesSetRef.current.size / Math.max(1, song.notes.length)) * 100)))}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">XP Points</div>
                  <div className="text-sm font-black text-amber-400 font-mono">+{score}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Streak</div>
                  <div className="text-sm font-black text-cyan-400 font-mono">🔥 5 Days</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={handleShareChallenge}
                className="py-3 px-3 bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg cursor-pointer flex items-center justify-center gap-1"
                title="Share challenge"
              >
                {isCopiedChallenge ? <Check className="w-4 h-4 text-emerald-950" /> : <Share2 className="w-4 h-4" />}
                <span>{isCopiedChallenge ? 'Copied!' : 'Challenge'}</span>
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry Song</span>
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold rounded-xl text-xs transition-all border border-slate-700 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Count-In Acoustic Countdown Overlay ("3, 2, 1... Go!") */}
      {countInText && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-40 flex items-center justify-center pointer-events-none animate-in fade-in">
          <div className="flex flex-col items-center">
            <div className="text-6xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-400 animate-bounce tracking-tight drop-shadow-2xl">
              {countInText}
            </div>
            <div className="text-xs sm:text-sm font-bold text-amber-200 uppercase tracking-widest mt-3 bg-amber-500/20 px-5 py-1.5 rounded-full border border-amber-500/40">
              🥁 Tempo Count-In ("3, 2, 1... Go!")
            </div>
          </div>
        </div>
      )}

      {/* MODAL: STANDARD FINGERING RULES */}
      {isFingeringRulesModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border-b border-amber-500/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-lg">
                  🖐️
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">Standard Fingering Rules</h3>
                  <p className="text-[10px] sm:text-xs text-amber-300/80">
                    How the system calculates optimal fingering for all sheets
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFingeringRulesModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-3 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {/* Color Legend of Fingers */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  5-Finger Legend (Right Hand)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((f) => {
                    const info = getFingerInfo(f);
                    return (
                      <div
                        key={f}
                        className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 flex flex-col items-center text-center"
                      >
                        <div
                          style={{ borderColor: info.color }}
                          className="w-7 h-7 rounded-full border-2 flex items-center justify-center font-black text-white text-xs mb-1 bg-slate-950"
                        >
                          {info.number}
                        </div>
                        <span className="font-bold text-white text-[11px]">{info.englishName}</span>
                        <span className="text-[9px] text-slate-400 mt-0.5">{info.icon}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* The 6 Rules */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Applied Automatic Principles
                </span>
                {getStandardFingeringRules().map((rule) => (
                  <div
                    key={rule.id}
                    className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 hover:border-amber-500/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{rule.icon}</span>
                      <span className="font-bold text-white text-xs">{rule.title}</span>
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-semibold border border-amber-500/30">
                        {rule.rule}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed pl-6">
                      {rule.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end shrink-0">
              <button
                onClick={() => setIsFingeringRulesModalOpen(false)}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow"
              >
                Ho Capito!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
