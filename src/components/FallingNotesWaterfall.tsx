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
  initialViewMode?: 'waterfall' | 'sheet';
  onViewModeChange?: (mode: 'waterfall' | 'sheet') => void;
  isMasterclassMode?: boolean;
  onMasterclassFinished?: () => void;
  onActiveGuidanceChange?: (guidance: { note: string | null; finger: number | null; tip?: string | null; hand?: 'right' | 'left' } | null) => void;
  sheetScrollMode?: 'sweeping' | 'continuous';
}

interface KeyPosition {
  x: number;
  width: number;
  type: 'white' | 'black';
}

function getNoteStaffY(noteName: string, trebleCenterY: number, bassCenterY: number, staffLineSpacing: number): { y: number; isTreble: boolean; hasLedger: boolean } {
  const match = noteName.match(/^([A-G])([#b]?)(-?\d+)?$/);
  if (!match) return { y: trebleCenterY, isTreble: true, hasLedger: false };
  const [, letter, accidental, octaveStr] = match;
  const octave = octaveStr !== undefined ? parseInt(octaveStr, 10) : 4;
  const noteLetters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const letterIdx = noteLetters.indexOf(letter);
  if (letterIdx === -1) return { y: trebleCenterY, isTreble: true, hasLedger: false };

  const semitones = [0, 2, 4, 5, 7, 9, 11][letterIdx];
  const midi = (octave + 1) * 12 + semitones + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);

  const stepH = staffLineSpacing / 2;

  if (midi >= 60) {
    // Treble staff centered around B4 (MIDI 71)
    const diatonicSteps = midiToDiatonicOffset(midi) - midiToDiatonicOffset(71);
    const y = trebleCenterY - diatonicSteps * stepH;
    const hasLedger = Math.abs(diatonicSteps) >= 5 && Math.abs(diatonicSteps) % 2 === 0;
    return { y, isTreble: true, hasLedger };
  } else {
    // Bass staff centered around D3 (MIDI 50)
    const diatonicSteps = midiToDiatonicOffset(midi) - midiToDiatonicOffset(50);
    const y = bassCenterY - diatonicSteps * stepH;
    const hasLedger = Math.abs(diatonicSteps) >= 5 && Math.abs(diatonicSteps) % 2 === 0;
    return { y, isTreble: false, hasLedger };
  }
}

function midiToDiatonicOffset(midi: number): number {
  const octave = Math.floor(midi / 12) - 1;
  const semitone = midi % 12;
  const semitoneToStep = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
  return octave * 7 + semitoneToStep[semitone];
}

export const FallingNotesWaterfall: React.FC<FallingNotesWaterfallProps> = React.memo(({
  song,
  keys,
  getTransposedNote,
  onClose,
  initialPlayMode = 'arcade',
  initialViewMode = 'waterfall',
  onViewModeChange,
  isMasterclassMode = false,
  onMasterclassFinished,
  onActiveGuidanceChange,
  sheetScrollMode = 'sweeping',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isMelodyOnly, setIsMelodyOnly] = useState<boolean>(false);
  type WaterfallFxMode =
    | 'all'
    | 'bounce_balls'
    | 'fireworks'
    | 'aurora'
    | 'lightning'
    | 'fire'
    | 'vortex'
    | 'gold_rain'
    | 'matrix'
    | 'meteor'
    | 'crystal'
    | 'wave'
    | 'stars'
    | 'off';
  const [fxMode, setFxMode] = useState<WaterfallFxMode>('all');
  const fxModeRef = useRef<WaterfallFxMode>(fxMode);
  fxModeRef.current = fxMode;
  const [isFxPickerOpen, setIsFxPickerOpen] = useState<boolean>(false);

  // Smart 1-Hand Melody Filter: extracts the top vocal/lead melody line and removes simultaneous accompaniment chords
  const effectiveSong = useMemo<InteractiveSong>(() => {
    if (!isMelodyOnly || !song.notes || song.notes.length === 0) return song;
    const sorted = [...song.notes].sort((a, b) => {
      const tDiff = a.time - b.time;
      if (Math.abs(tDiff) > 0.01) return tDiff;
      return noteNameToMidiNumber(b.note) - noteNameToMidiNumber(a.note);
    });

    const melodyNotes: typeof song.notes = [];
    let i = 0;
    while (i < sorted.length) {
      const clusterStart = sorted[i].time;
      let highestNote = sorted[i];
      let highestMidi = noteNameToMidiNumber(highestNote.note);
      let j = i + 1;
      // Group notes within 65ms window as a simultaneous chord/cluster and pick the highest pitch (lead melody)
      while (j < sorted.length && sorted[j].time - clusterStart <= 0.065) {
        const m = noteNameToMidiNumber(sorted[j].note);
        if (m > highestMidi) {
          highestMidi = m;
          highestNote = sorted[j];
        }
        j++;
      }

      const prev = melodyNotes[melodyNotes.length - 1];
      // Avoid impossible ultra-fast machine-gun repeats (<90ms on the same or adjacent note)
      if (!prev || highestNote.time - prev.time >= 0.09 || highestNote.note !== prev.note) {
        melodyNotes.push({
          ...highestNote,
          duration: Math.max(highestNote.duration, 0.22),
        });
      }
      i = j;
    }

    return {
      ...song,
      notes: melodyNotes.length > 0 ? melodyNotes : song.notes,
    };
  }, [song, isMelodyOnly]);

  const songDuration = useMemo(() => Math.max(...effectiveSong.notes.map((n) => n.time + n.duration), 5), [effectiveSong.notes]);

  const [playMode, setPlayMode] = useState<'learn' | 'arcade' | 'fingering' | 'demo'>(initialPlayMode);
  const [viewMode, setViewMode] = useState<'waterfall' | 'sheet'>(initialViewMode);
  const viewModeRef = useRef<'waterfall' | 'sheet'>(viewMode);
  viewModeRef.current = viewMode;

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
      setCountInText('GO!');
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
    return calculateFingeringForNotes(effectiveSong.notes, targetH);
  }, [effectiveSong.notes, selectedHand]);

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

  const sheetScrollModeRef = useRef<'sweeping' | 'continuous'>(sheetScrollMode);
  sheetScrollModeRef.current = sheetScrollMode;

  const currentTimeRef = useRef<number>(0);
  const sheetPageStartTimeRef = useRef<number>(0);
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

  const songRef = useRef(effectiveSong);
  songRef.current = effectiveSong;

  const songDurationRef = useRef(songDuration);
  songDurationRef.current = songDuration;

  const songFingeringRef = useRef(songFingering);
  songFingeringRef.current = songFingering;

  // Lightweight zero-latency pools for 13 selectable show-stopping viral FX modes
  const sparksRef = useRef<
    {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      color: string;
      size: number;
      kind: 'spark' | 'star' | 'ember' | 'prism' | 'music_note' | 'hex';
      symbol?: string;
      rot: number;
      vRot: number;
    }[]
  >([]);

  const shockwavesRef = useRef<
    {
      x: number;
      y: number;
      width: number;
      life: number;
      maxLife: number;
      color: string;
    }[]
  >([]);

  const lightningBoltsRef = useRef<
    {
      x: number;
      y: number;
      points: { dx: number; dy: number }[];
      branchPoints?: { startIdx: number; dx: number; dy: number }[];
      life: number;
      maxLife: number;
      color: string;
    }[]
  >([]);

  const fireworksRef = useRef<
    {
      x: number;
      y: number;
      targetY: number;
      vy: number;
      color: string;
      exploded: boolean;
    }[]
  >([]);

  const laserBeamsRef = useRef<
    {
      x: number;
      width: number;
      life: number;
      maxLife: number;
      color: string;
    }[]
  >([]);

  const meteorsRef = useRef<
    {
      x: number;
      y: number;
      vx: number;
      vy: number;
      len: number;
      life: number;
      maxLife: number;
      color: string;
    }[]
  >([]);

  const energyLevelRef = useRef<number>(0);

  const bgStarsRef = useRef<
    { xRatio: number; yRatio: number; size: number; speed: number; alpha: number; color: string; char?: string }[]
  >(
    Array.from({ length: 42 }, (_, idx) => ({
      xRatio: ((idx * 37) % 100) / 100,
      yRatio: ((idx * 61) % 100) / 100,
      size: 1.1 + (idx % 3) * 0.9,
      speed: 0.045 + (idx % 4) * 0.03,
      alpha: 0.28 + (idx % 5) * 0.12,
      color: idx % 3 === 0 ? '#38bdf8' : idx % 3 === 1 ? '#fbbf24' : '#c084fc',
      char: ['0', '1', '♪', '♫', '7', '9', '♯', '♮'][idx % 8],
    }))
  );

  const spawnNoteSparks = useCallback((rawNoteName: string, isBlack?: boolean) => {
    const mode = fxModeRef.current;
    if (mode === 'off' || viewModeRef.current === 'sheet') return;
    const keyPos =
      keyPositionsMapRef.current.get(rawNoteName) ||
      keyPositionsMapRef.current.get(getTransposedNoteRef.current(rawNoteName));
    if (!keyPos) return;

    const hitY = Math.max(20, dimsRef.current.height - 2);
    const centerX = keyPos.x + keyPos.width / 2;
    const black = isBlack ?? keyPos.type === 'black';
    const isLowNote = noteNameToMidiNumber(rawNoteName) < 60;

    // Boost reactive musical energy level
    energyLevelRef.current = Math.min(1.0, energyLevelRef.current + 0.42);

    const palette =
      mode === 'bounce_balls'
        ? ['#22d3ee', '#f472b6', '#fde047', '#34d399', '#fb923c', '#a855f7', '#ffffff']
        : mode === 'fire' || mode === 'meteor'
        ? ['#fde047', '#fb923c', '#f97316', '#ef4444', '#ffffff']
        : mode === 'matrix'
        ? ['#4ade80', '#22c55e', '#38bdf8', '#a7f3d0', '#ffffff']
        : mode === 'gold_rain'
        ? ['#fef08a', '#facc15', '#eab308', '#f59e0b', '#ffffff']
        : mode === 'aurora' || mode === 'vortex' || mode === 'fireworks'
        ? ['#22d3ee', '#a855f7', '#f472b6', '#fde047', '#34d399', '#ffffff']
        : mode === 'crystal'
        ? ['#67e8f9', '#38bdf8', '#c084fc', '#f472b6', '#ffffff']
        : black
        ? ['#fbbf24', '#f59e0b', '#fef08a', '#ffffff', '#f472b6']
        : isLowNote
        ? ['#fdba74', '#fb923c', '#fde047', '#ffffff', '#f43f5e']
        : ['#38bdf8', '#22d3ee', '#a855f7', '#fde047', '#ffffff'];

    // 1. Fireworks Shells ('fireworks' or 'all')
    if (mode === 'fireworks' || mode === 'all') {
      const fw = fireworksRef.current;
      if (fw.length > 10) fw.splice(0, 2);
      fw.push({
        x: centerX,
        y: hitY - 4,
        targetY: Math.max(18, hitY * (0.2 + Math.random() * 0.38)),
        vy: -(165 + Math.random() * 90),
        color: palette[Math.floor(Math.random() * (palette.length - 1))],
        exploded: false,
      });
    }

    // 2. Vertical Aurora / Laser Beams ('aurora', 'matrix', or 'all')
    if (mode === 'aurora' || mode === 'matrix' || mode === 'all') {
      const beams = laserBeamsRef.current;
      if (beams.length > 20) beams.splice(0, 4);
      beams.push({
        x: centerX,
        width: Math.max(8, keyPos.width * 0.85),
        life: 0,
        maxLife: 0.42,
        color: mode === 'matrix' ? '#22c55e' : palette[Math.floor(Math.random() * (palette.length - 1))],
      });
    }

    // 3. Shooting Stars / Meteors ('meteor' or 'all')
    if (mode === 'meteor' || mode === 'all') {
      const mets = meteorsRef.current;
      if (mets.length > 14) mets.splice(0, 3);
      mets.push({
        x: Math.random() * dimsRef.current.width * 0.85,
        y: -10,
        vx: 140 + Math.random() * 120,
        vy: 160 + Math.random() * 110,
        len: 35 + Math.random() * 30,
        life: 0,
        maxLife: 0.65,
        color: palette[Math.floor(Math.random() * (palette.length - 1))],
      });
    }

    // 4. Tesla Lightning Bolts ('lightning', 'vortex', or 'all')
    if (mode === 'lightning' || mode === 'vortex' || mode === 'all') {
      const bolts = lightningBoltsRef.current;
      if (bolts.length > 18) bolts.splice(0, 4);
      const boltCount = mode === 'lightning' ? 2 : 1;
      for (let b = 0; b < boltCount; b++) {
        const segments = 6;
        const maxH = 48 + Math.random() * 52;
        const pts: { dx: number; dy: number }[] = [{ dx: 0, dy: 0 }];
        let curX = 0;
        for (let s = 1; s <= segments; s++) {
          curX += (Math.random() - 0.5) * 20;
          pts.push({ dx: curX, dy: -(maxH * (s / segments)) });
        }
        bolts.push({
          x: centerX + (Math.random() - 0.5) * Math.max(4, keyPos.width * 0.4),
          y: hitY - 2,
          points: pts,
          branchPoints: [
            {
              startIdx: 2,
              dx: pts[2].dx + (Math.random() > 0.5 ? 16 : -16),
              dy: pts[2].dy - 15 - Math.random() * 14,
            },
          ],
          life: 0,
          maxLife: 0.24 + Math.random() * 0.12,
          color: black ? '#fde047' : isLowNote ? '#fb923c' : '#38bdf8',
        });
      }
    }

    // 5. Shockwave rings
    const waves = shockwavesRef.current;
    if (waves.length > 22) waves.splice(0, 4);
    waves.push({
      x: centerX,
      y: hitY,
      width: Math.max(14, keyPos.width * 1.15),
      life: 0,
      maxLife: 0.4,
      color: mode === 'matrix' ? '#4ade80' : black ? '#fbbf24' : isLowNote ? '#fb923c' : '#38bdf8',
    });

    // 6. Particle fountain (Musical notes, Hexagons, Prisms, Starbursts, Embers)
    const pool = sparksRef.current;
    if (pool.length > 140) {
      pool.splice(0, 24);
    }

    const noteSymbols = ['♪', '♫', '𝄞', '✦', '♬'];
    const count = mode === 'wave' ? 8 : 14;
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * (0.1 + Math.random() * 0.8);
      const speed = mode === 'fire' || mode === 'gold_rain' ? 32 + Math.random() * 75 : 48 + Math.random() * 115;
      let kind: 'spark' | 'star' | 'ember' | 'prism' | 'music_note' | 'hex' = 'spark';
      if (mode === 'gold_rain') {
        kind = i % 2 === 0 ? 'music_note' : 'star';
      } else if (mode === 'matrix') {
        kind = i % 2 === 0 ? 'hex' : 'prism';
      } else if (mode === 'crystal') {
        kind = i % 2 === 0 ? 'prism' : 'star';
      } else if (mode === 'fire' || mode === 'meteor') {
        kind = i % 3 === 0 ? 'star' : 'ember';
      } else if (mode === 'stars' || mode === 'aurora' || mode === 'vortex') {
        kind = i % 2 === 0 ? 'star' : 'spark';
      } else if (mode === 'all') {
        const kinds: ('spark' | 'star' | 'ember' | 'prism' | 'music_note' | 'hex')[] = [
          'music_note',
          'prism',
          'star',
          'ember',
          'hex',
          'spark',
        ];
        kind = kinds[i % kinds.length];
      }

      pool.push({
        x: centerX + (Math.random() - 0.5) * Math.max(6, keyPos.width * 0.8),
        y: hitY - 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (kind === 'ember' || kind === 'music_note' ? 42 : 20),
        life: 0,
        maxLife: kind === 'music_note' || kind === 'ember' ? 0.58 + Math.random() * 0.3 : 0.35 + Math.random() * 0.25,
        color: palette[i % palette.length],
        size:
          kind === 'music_note'
            ? 11 + Math.random() * 5
            : kind === 'prism' || kind === 'hex'
            ? 3.8 + Math.random() * 2.8
            : kind === 'star'
            ? 3.5 + Math.random() * 2.5
            : 2.2 + Math.random() * 2.4,
        kind,
        symbol: noteSymbols[i % noteSymbols.length],
        rot: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 9,
      });
    }
  }, []);

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
    const activeNotes = songRef.current.notes;

    if (playModeRef.current === 'learn' || playModeRef.current === 'fingering') {
      const waitingIdx = waitingNoteIndexRef.current;
      if (waitingIdx !== null) {
        const expectedNote = activeNotes[waitingIdx];
        if (expectedNote && (expectedNote.note === playedNote || getTransposedNote(expectedNote.note) === playedNote)) {
          hitNotesSetRef.current.add(waitingIdx);
          spawnNoteSparks(expectedNote.note);
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
      for (let i = 0; i < activeNotes.length; i++) {
        if (!hitNotesSetRef.current.has(i)) {
          const n = activeNotes[i];
          if (Math.abs(n.time - curTime) <= 0.4 && (n.note === playedNote || getTransposedNote(n.note) === playedNote)) {
            hitNotesSetRef.current.add(i);
            spawnNoteSparks(n.note);
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
      activeNotes.forEach((n, idx) => {
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
        spawnNoteSparks(activeNotes[bestIdx].note);
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
  }, [getTransposedNote, isMasterclassMode, spawnNoteSparks]);

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
    return [...effectiveSong.notes]
      .map((n, originalIndex) => ({ ...n, originalIndex }))
      .sort((a, b) => {
        const dt = a.time - b.time;
        if (Math.abs(dt) > 0.01) return dt;
        // For simultaneous notes on the same beat, trigger bass/chords first and highest melody note last
        return noteNameToMidiNumber(a.note) - noteNameToMidiNumber(b.note);
      });
  }, [effectiveSong.notes]);

  const sortedNotesRef = useRef(sortedNotes);
  sortedNotesRef.current = sortedNotes;

  // Bouncing Rhythm Balls track assignments (groups simultaneous chords cleanly into rhythmic bouncing ball paths)
  const ballTracks = useMemo(() => {
    interface BallTrackNote {
      time: number;
      note: string;
      duration: number;
      origIdx: number;
      midi: number;
    }
    const tracks: BallTrackNote[][] = [[], []]; // Track 0: Lead/Right, Track 1: Bass/Left
    const hasHighNotes = sortedNotes.some((n) => noteNameToMidiNumber(n.note) >= 58);

    let i = 0;
    while (i < sortedNotes.length) {
      const t0 = sortedNotes[i].time;
      const cluster: BallTrackNote[] = [];
      while (i < sortedNotes.length && sortedNotes[i].time - t0 <= 0.038) {
        const sn = sortedNotes[i];
        cluster.push({
          time: sn.time,
          note: sn.note,
          duration: sn.duration,
          origIdx: sn.originalIndex,
          midi: noteNameToMidiNumber(sn.note),
        });
        i++;
      }
      cluster.sort((a, b) => a.midi - b.midi);

      if (cluster.length === 1) {
        const single = cluster[0];
        const useTrack1 = hasHighNotes && single.midi < 58;
        tracks[useTrack1 ? 1 : 0].push(single);
      } else {
        // Chord: highest note -> Track 0, lowest note -> Track 1, remaining -> chord harmony tracks
        tracks[0].push(cluster[cluster.length - 1]);
        tracks[1].push(cluster[0]);
        for (let c = 1; c < cluster.length - 1; c++) {
          const extraIdx = c + 1;
          while (tracks.length <= extraIdx) tracks.push([]);
          tracks[extraIdx].push(cluster[c]);
        }
      }
    }
    return tracks.filter((tr) => tr.length > 0);
  }, [sortedNotes]);

  const ballTracksRef = useRef(ballTracks);
  ballTracksRef.current = ballTracks;

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
        const curSorted = sortedNotesRef.current;
        const curFingering = songFingeringRef.current;
        const curNotes = songRef.current.notes;
        if (playModeRef.current === 'learn' || playModeRef.current === 'fingering') {
          for (let i = 0; i < curSorted.length; i++) {
            const sn = curSorted[i];
            const origIdx = sn.originalIndex;
            if (!hitNotesSetRef.current.has(origIdx)) {
              if (newTime >= sn.time) {
                newTime = sn.time;
                waitingNoteIndexRef.current = origIdx;
                setIsPlaying(false);
                setWaitingTargetNote(sn.note);

                if (playModeRef.current === 'fingering') {
                  const finger = curFingering[origIdx] || 1;
                  setWaitingTargetFinger(finger);
                  const prevNote = origIdx > 0 ? curNotes[origIdx - 1]?.note : undefined;
                  const prevFinger = origIdx > 0 ? curFingering[origIdx - 1] : undefined;
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

        // Demo Mode: automated acoustic playback & real-time piano keys highlight
        if (playModeRef.current === 'demo') {
          const currentDemoNotes = new Set<string>();

          curSorted.forEach((sn) => {
            const origIdx = sn.originalIndex;
            if (!hitNotesSetRef.current.has(origIdx) && newTime >= sn.time) {
              hitNotesSetRef.current.add(origIdx);
              const durTone = sn.duration > 0.8 ? '2n' : sn.duration < 0.25 ? '16n' : '8n';
              audioEngine.playNote(getTransposedNoteRef.current(sn.note), durTone, 'piano', false);
              spawnNoteSparks(sn.note);
            }

            // A note is actively sounding while currentTime is within its duration
            const noteStart = sn.time;
            const noteDur = Math.max(0.2, Math.min(2.5, sn.duration));
            if (newTime >= noteStart && newTime <= noteStart + noteDur) {
              currentDemoNotes.add(getTransposedNoteRef.current(sn.note));
            }
          });

          songPlaybackState.activeDemoNotes = currentDemoNotes;
        } else {
          if (songPlaybackState.activeDemoNotes.size > 0) {
            songPlaybackState.activeDemoNotes.clear();
          }
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
          songPlaybackState.activeDemoNotes.clear();
        }
      }

      // Visual time with calibrated lead offset so the visual note arrives right on the hit line
      const visualTime = currentTimeRef.current + AUDIO_SYNC_OFFSET;

      // Dark background fill
      ctx.fillStyle = '#080d1a';
      ctx.fillRect(0, 0, width, height);

      if (viewModeRef.current === 'sheet') {
        // --- RENDER COMPACT TRADITIONAL SHEET MUSIC (WHITE BACKGROUND GRAND STAFF) ---
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        const isContinuous = sheetScrollModeRef.current === 'continuous';
        const pixelsPerSecondX = 110 * playbackSpeedRef.current;

        const startX = 45; // Start position after clef
        const triggerX = Math.max(startX + 120, width - 65); // Trigger threshold near right edge
        const usableWidth = triggerX - startX;
        const maxTimeSpanPerPage = usableWidth / pixelsPerSecondX;

        let playheadX = Math.round(width * 0.25);
        let activeBaseTime = 0;

        if (isContinuous) {
          // Continuous scroll mode: line stationary at 25%, staff slides underneath
          playheadX = Math.round(width * 0.25);
        } else {
          // Sweeping page mode: playhead sweeps from left to right, turns page
          let pageStartTime = sheetPageStartTimeRef.current;
          const timeInPage = visualTime - pageStartTime;

          if (timeInPage < -0.1 || timeInPage > maxTimeSpanPerPage * 1.5) {
            pageStartTime = Math.max(0, visualTime - 0.1);
            sheetPageStartTimeRef.current = pageStartTime;
          } else {
            const rawPlayheadX = startX + timeInPage * pixelsPerSecondX;
            if (rawPlayheadX >= triggerX) {
              pageStartTime = Math.max(0, visualTime - 0.15);
              sheetPageStartTimeRef.current = pageStartTime;
            }
          }

          activeBaseTime = sheetPageStartTimeRef.current;
          playheadX = startX + (visualTime - activeBaseTime) * pixelsPerSecondX;
        }

        const staffLineSpacing = Math.min(10, Math.max(7, Math.floor(height / 21)));
        const trebleCenterY = Math.round(height * 0.50 + 2);
        const bassCenterY = Math.round(height * 0.80 + 2);

        // Draw Treble Staff (5 lines)
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.2;
        for (let l = -2; l <= 2; l++) {
          const ly = trebleCenterY + l * staffLineSpacing;
          ctx.beginPath();
          ctx.moveTo(0, ly);
          ctx.lineTo(width, ly);
          ctx.stroke();
        }

        // Draw Bass Staff (5 lines)
        for (let l = -2; l <= 2; l++) {
          const ly = bassCenterY + l * staffLineSpacing;
          ctx.beginPath();
          ctx.moveTo(0, ly);
          ctx.lineTo(width, ly);
          ctx.stroke();
        }

        // Draw Middle C Ledger Line reference in between
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        const middleCY = (trebleCenterY + 2 * staffLineSpacing + bassCenterY - 2 * staffLineSpacing) / 2;
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.moveTo(0, middleCY);
        ctx.lineTo(width, middleCY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Measure / Bar Lines on the staff (stanghette di battuta)
        const bpm = songRef.current.bpm || 100;
        const measureDuration = (60 / bpm) * 4;
        const firstMeasureIdx = isContinuous
          ? Math.max(0, Math.floor((visualTime - 2) / measureDuration))
          : Math.floor(activeBaseTime / measureDuration);
        const lastMeasureIdx = isContinuous
          ? Math.ceil((visualTime + (width / pixelsPerSecondX)) / measureDuration)
          : Math.ceil((activeBaseTime + maxTimeSpanPerPage + 1) / measureDuration);

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.2;
        for (let m = firstMeasureIdx; m <= lastMeasureIdx; m++) {
          const mTime = m * measureDuration;
          const mx = isContinuous
            ? playheadX + (mTime - visualTime) * pixelsPerSecondX
            : startX + (mTime - activeBaseTime) * pixelsPerSecondX;

          if (mx >= 45 && mx <= width - 15) {
            ctx.beginPath();
            ctx.moveTo(mx, trebleCenterY - 2 * staffLineSpacing);
            ctx.lineTo(mx, bassCenterY + 2 * staffLineSpacing);
            ctx.stroke();
          }
        }

        // Draw Clef symbols on left
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${Math.round(staffLineSpacing * 1.5)}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('𝄞', 10, trebleCenterY);
        ctx.fillText('𝄢', 10, bassCenterY);

        // Draw vertical Red Playhead Line
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(playheadX, 5);
        ctx.lineTo(playheadX, height - 5);
        ctx.stroke();

        // Draw Playhead Top Indicator
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(playheadX, 6, 3.5, 0, Math.PI * 2);
        ctx.fill();

        const notes = songRef.current.notes;
        const len = notes.length;

        for (let i = 0; i < len; i++) {
          const n = notes[i];
          const x = isContinuous
            ? playheadX + (n.time - visualTime) * pixelsPerSecondX
            : startX + (n.time - activeBaseTime) * pixelsPerSecondX;

          if (x < -20 || x > width + 40) continue;

          const notePos = getNoteStaffY(n.note, trebleCenterY, bassCenterY, staffLineSpacing);
          const radius = Math.max(4.5, Math.round(staffLineSpacing * 0.4));

          const isHit = hitNotesSetRef.current.has(i);
          const isWaiting = waitingNoteIndexRef.current === i;

          let noteColor = notePos.isTreble ? '#0284c7' : '#059669';
          if (isHit) noteColor = '#94a3b8';
          if (isWaiting) noteColor = '#f59e0b';

          if (notePos.hasLedger) {
            ctx.strokeStyle = isHit ? '#cbd5e1' : '#334155';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x - radius * 1.4, notePos.y);
            ctx.lineTo(x + radius * 1.4, notePos.y);
            ctx.stroke();
          }

          ctx.save();
          ctx.translate(x, notePos.y);
          ctx.rotate(-0.2);
          ctx.beginPath();
          ctx.ellipse(0, 0, radius * 1.2, radius, 0, 0, Math.PI * 2);
          ctx.fillStyle = noteColor;
          ctx.fill();
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = isWaiting ? '#ffffff' : '#0f172a';
          ctx.stroke();
          ctx.restore();

          ctx.strokeStyle = noteColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          if (notePos.y > (notePos.isTreble ? trebleCenterY : bassCenterY)) {
            ctx.moveTo(x + radius * 1.0, notePos.y);
            ctx.lineTo(x + radius * 1.0, notePos.y - staffLineSpacing * 2.0);
          } else {
            ctx.moveTo(x - radius * 1.0, notePos.y);
            ctx.lineTo(x - radius * 1.0, notePos.y + staffLineSpacing * 2.0);
          }
          ctx.stroke();

          ctx.fillStyle = isWaiting ? '#b45309' : '#1e293b';
          ctx.font = `bold 9px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(n.note, x, notePos.y - radius - 4);
        }
      } else {
        // --- RENDER FALLING NOTES WATERFALL (CASCATA) ---
        const curFx = fxModeRef.current;
        energyLevelRef.current = Math.max(0, energyLevelRef.current - deltaSec * 1.4);
        const energy = energyLevelRef.current;

        // Vertical lane guides - Batched single-path fill for zero GPU overhead
        const currentNumWhiteKeys = numWhiteKeysRef.current;
        const whiteWidth = width / Math.max(1, currentNumWhiteKeys);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.beginPath();
        for (let i = 0; i < currentNumWhiteKeys; i += 2) {
          ctx.rect(i * whiteWidth, 0, whiteWidth, hitLineY);
        }
        ctx.fill();

        // --- BACKGROUND FX 1: REACTIVE STARFIELD, MATRIX DIGITAL RAIN OR GOLDEN BOKEH ---
        if (curFx === 'stars' || curFx === 'matrix' || curFx === 'gold_rain' || curFx === 'bounce_balls' || curFx === 'all') {
          ctx.save();
          const stars = bgStarsRef.current;
          const speedBoost = 1 + energy * 3.5;
          for (let s = 0; s < stars.length; s++) {
            const st = stars[s];
            st.yRatio = (st.yRatio + st.speed * deltaSec * speedBoost) % 1.0;
            const sx = st.xRatio * width;
            const sy = st.yRatio * hitLineY;
            const twinkle = 0.65 + 0.35 * Math.sin(now * 0.006 + s * 1.7);
            ctx.globalAlpha = st.alpha * twinkle * (0.75 + energy * 0.5);
            if (curFx === 'matrix') {
              ctx.fillStyle = s % 3 === 0 ? '#4ade80' : '#22c55e';
              ctx.font = 'bold 10px monospace';
              ctx.fillText(st.char || '1', sx, sy);
            } else {
              ctx.fillStyle = curFx === 'gold_rain' ? '#facc15' : st.color;
              ctx.beginPath();
              ctx.arc(sx, sy, st.size * (1 + energy * 0.5), 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.restore();
        }

        // --- BACKGROUND FX 2: SUPERNOVA VORTEX / WARP GALAXY ('vortex' or 'all') ---
        if (curFx === 'vortex' || curFx === 'all') {
          ctx.save();
          const cx = width / 2;
          const cy = hitLineY * 0.48;
          const rotBase = now * 0.0025;
          const maxR = Math.min(width * 0.35, hitLineY * 0.85) * (0.85 + energy * 0.35);
          for (let ring = 0; ring < 4; ring++) {
            const r = maxR * ((ring + 1) / 4);
            ctx.beginPath();
            ctx.ellipse(
              cx,
              cy,
              r * 1.8,
              r * 0.55,
              rotBase * (ring % 2 === 0 ? 1 : -1.3) + ring * 0.6,
              0,
              Math.PI * 1.65
            );
            ctx.strokeStyle =
              ring % 2 === 0
                ? `rgba(168, 85, 247, ${0.14 + energy * 0.28})`
                : `rgba(34, 211, 238, ${0.14 + energy * 0.28})`;
            ctx.lineWidth = 2.2 + energy * 2;
            ctx.stroke();
          }
          ctx.restore();
        }

        // --- BACKGROUND FX 3: NORTHERN LIGHTS AURORA RIBBONS ('aurora' or 'all') ---
        if (curFx === 'aurora' || curFx === 'all') {
          ctx.save();
          const aPhase = now * 0.003;
          const aGrad = ctx.createLinearGradient(0, 0, width, 0);
          aGrad.addColorStop(0, `rgba(16, 185, 129, ${0.12 + energy * 0.22})`);
          aGrad.addColorStop(0.5, `rgba(56, 189, 248, ${0.16 + energy * 0.26})`);
          aGrad.addColorStop(1, `rgba(168, 85, 247, ${0.14 + energy * 0.24})`);
          ctx.fillStyle = aGrad;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          for (let x = 0; x <= width; x += 20) {
            const ay =
              hitLineY * 0.32 +
              Math.sin(x * 0.012 + aPhase) * (14 + energy * 18) +
              Math.cos(x * 0.025 - aPhase * 1.4) * 10;
            ctx.lineTo(x, ay);
          }
          ctx.lineTo(width, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // --- BACKGROUND FX 4: SYMPHONIC BEAT WAVE VISUALIZER ('wave' or 'all') ---
        if (curFx === 'wave' || curFx === 'all') {
          ctx.save();
          const centerY = hitLineY * 0.52;
          const amp = 8 + energy * (hitLineY * 0.28);
          const phase = now * 0.006;

          const numBars = 32;
          const barW = width / numBars;
          for (let b = 0; b < numBars; b++) {
            const waveVal = Math.abs(Math.sin(phase * 1.3 + b * 0.45) * Math.cos(phase * 0.8 - b * 0.25));
            const bh = (6 + waveVal * amp * 1.45) * (0.35 + energy * 0.95);
            ctx.fillStyle = b % 2 === 0 ? 'rgba(56, 189, 248, 0.11)' : 'rgba(168, 85, 247, 0.11)';
            ctx.fillRect(b * barW + 2, hitLineY - bh, Math.max(2, barW - 4), bh);
          }

          for (let wLayer = 0; wLayer < 2; wLayer++) {
            ctx.beginPath();
            const freq = wLayer === 0 ? 0.018 : 0.028;
            const layerSpeed = wLayer === 0 ? phase : -phase * 1.25;
            for (let x = 0; x <= width; x += 14) {
              const env = Math.sin((x / width) * Math.PI);
              const y =
                centerY +
                Math.sin(x * freq + layerSpeed) * amp * env * (wLayer === 0 ? 1 : 0.65) +
                Math.cos(x * 0.045 - phase * 1.6) * (amp * 0.35 * env);
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.strokeStyle =
              wLayer === 0
                ? `rgba(56, 189, 248, ${0.24 + energy * 0.42})`
                : `rgba(244, 114, 182, ${0.2 + energy * 0.36})`;
            ctx.lineWidth = wLayer === 0 ? 2.5 : 1.7;
            ctx.stroke();
          }
          ctx.restore();
        }

        // Smooth 3.8s travel speed for falling notes
        const travelTime = 3.8;
        const pixelsPerSecond = hitLineY / travelTime;
        const keyPosMap = keyPositionsMapRef.current;

        const notes = songRef.current.notes;
        const len = notes.length;

        // Render notes in 2 passes: first white keys, then black keys on top (just like piano keyboard)
        const renderNoteBar = (i: number) => {
          const n = notes[i];
          const timeToHit = n.time - visualTime;
          const yBottom = hitLineY - timeToHit * pixelsPerSecond;
          const noteHeight = Math.max(14, (n.duration || 0.4) * pixelsPerSecond * 0.75);
          const yTop = yBottom - noteHeight;

          if (yTop > height || yBottom < 0) return;

          const isHit = hitNotesSetRef.current.has(i);
          const isWaiting = waitingNoteIndexRef.current === i;
          const keyPos = keyPosMap.get(n.note);

          if (!keyPos) return;

          const isBlack = keyPos.type === 'black';
          const noteWidth = isBlack 
            ? Math.max(3, Math.round(keyPos.width * 0.72)) 
            : Math.max(4, keyPos.width - 2);
          const noteX = isBlack 
            ? keyPos.x + (keyPos.width - noteWidth) / 2
            : keyPos.x + 1;

          const radius = Math.max(2, Math.min(6, noteWidth * 0.35, noteHeight * 0.25));

          ctx.save();

          if (isHit && playModeRef.current !== 'demo') {
            // Hit note (faded translucent glass)
            ctx.fillStyle = 'rgba(71, 85, 105, 0.22)';
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
              ctx.roundRect(noteX, yTop, noteWidth, noteHeight, radius);
            } else {
              ctx.rect(noteX, yTop, noteWidth, noteHeight);
            }
            ctx.fill();
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
          } else if (isWaiting) {
            // Waiting note - pulsating gold/amber capsule with glowing white border
            const grad = ctx.createLinearGradient(noteX, yTop, noteX, yBottom);
            grad.addColorStop(0, '#fef08a');
            grad.addColorStop(0.4, '#f59e0b');
            grad.addColorStop(1, '#b45309');

            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
              ctx.roundRect(noteX, yTop, noteWidth, noteHeight, radius);
            } else {
              ctx.rect(noteX, yTop, noteWidth, noteHeight);
            }
            ctx.fillStyle = grad;
            ctx.fill();

            // Bright white pulsating highlight border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.2;
            ctx.stroke();

            // Bottom impact shine
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(noteX + 2, yBottom - 4, Math.max(1, noteWidth - 4), 3);
          } else {
            // Active falling note: CRISP 3D CRYSTAL BAR (ZERO COMET TAIL)
            const isLeft = selectedHandRef.current === 'left' || (selectedHandRef.current === 'both' && noteNameToMidiNumber(n.note) < 60);

            let topColor = '#7dd3fc';
            let midColor = '#0284c7';
            let botColor = '#1e40af';
            let glowHex = '#38bdf8';

            if (playModeRef.current === 'fingering') {
              const fingerNum = songFingeringRef.current[i] || 1;
              if (fingerNum === 1) {
                topColor = '#fde047'; midColor = '#f59e0b'; botColor = '#b45309'; glowHex = '#fbbf24';
              } else if (fingerNum === 2) {
                topColor = '#67e8f9'; midColor = '#06b6d4'; botColor = '#0e7490'; glowHex = '#22d3ee';
              } else if (fingerNum === 3) {
                topColor = '#6ee7b7'; midColor = '#10b981'; botColor = '#047857'; glowHex = '#34d399';
              } else if (fingerNum === 4) {
                topColor = '#d8b4fe'; midColor = '#a855f7'; botColor = '#6b21a8'; glowHex = '#c084fc';
              } else {
                topColor = '#f9a8d4'; midColor = '#ec4899'; botColor = '#be185d'; glowHex = '#f472b6';
              }
            } else if (isLeft) {
              if (isBlack) {
                topColor = '#fda4af'; midColor = '#e11d48'; botColor = '#881337'; glowHex = '#fb7185';
              } else {
                topColor = '#fdba74'; midColor = '#f97316'; botColor = '#c2410c'; glowHex = '#fb923c';
              }
            } else {
              if (isBlack) {
                topColor = '#d8b4fe'; midColor = '#9333ea'; botColor = '#4c1d95'; glowHex = '#c084fc';
              } else {
                topColor = '#7dd3fc'; midColor = '#0284c7'; botColor = '#1e40af'; glowHex = '#38bdf8';
              }
            }

            // Main 3D Crystal Note Bar (Clean, sharp edges, no trailing tail)
            const grad = ctx.createLinearGradient(noteX, yTop, noteX, yBottom);
            grad.addColorStop(0, topColor);
            grad.addColorStop(0.4, midColor);
            grad.addColorStop(1, botColor);

            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
              ctx.roundRect(noteX, yTop, noteWidth, noteHeight, radius);
            } else {
              ctx.rect(noteX, yTop, noteWidth, noteHeight);
            }
            ctx.fillStyle = grad;
            ctx.fill();

            // Inner glowing neon core spine
            if (noteWidth >= 7 && noteHeight >= 12) {
              const coreW = Math.max(1.5, noteWidth * 0.22);
              const coreGrad = ctx.createLinearGradient(noteX, yTop + 2, noteX, yBottom - 2);
              coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
              coreGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.42)');
              coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0.78)');
              ctx.fillStyle = coreGrad;
              ctx.fillRect(noteX + (noteWidth - coreW) / 2, yTop + 3, coreW, Math.max(2, noteHeight - 6));
            }

            // Sleek translucent border with specular glow
            ctx.strokeStyle = playModeRef.current === 'fingering'
              ? 'rgba(255, 255, 255, 0.9)'
              : isLeft
              ? 'rgba(254, 215, 170, 0.85)'
              : 'rgba(186, 230, 253, 0.85)';
            ctx.lineWidth = 1.4;
            ctx.stroke();

            // Top glassy highlight cap
            if (noteHeight > 10 && noteWidth > 6) {
              ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
              ctx.beginPath();
              ctx.ellipse(noteX + noteWidth / 2, yTop + 3.5, Math.max(2, (noteWidth - 4) / 2), 2, 0, 0, Math.PI * 2);
              ctx.fill();
            }

            // Bottom laser impact leading edge & SUSTAINED KEY ENERGY FOUNTAIN while note crosses hitLineY
            if (noteHeight > 8 && noteWidth > 4) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(noteX + 1, yBottom - 3.5, Math.max(1, noteWidth - 2), 2.5);
            }
            if (curFx !== 'off' && yBottom >= hitLineY - 2 && yTop <= hitLineY) {
              const cx = noteX + noteWidth / 2;
              // Blinding plasma contact flare on the keyboard line for the entire duration of the held note
              const flareR = Math.max(10, noteWidth * 1.15);
              const spotGrad = ctx.createRadialGradient(cx, hitLineY - 1, 1, cx, hitLineY - 1, flareR);
              spotGrad.addColorStop(0, '#ffffff');
              spotGrad.addColorStop(0.45, glowHex);
              spotGrad.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = spotGrad;
              ctx.beginPath();
              ctx.arc(cx, hitLineY - 1, flareR, Math.PI, Math.PI * 2);
              ctx.fill();

              // Continuous micro-sparks while a long note is being held
              if (isPlayingRef.current && Math.random() < 0.28 && sparksRef.current.length < 130) {
                sparksRef.current.push({
                  x: cx + (Math.random() - 0.5) * noteWidth * 0.6,
                  y: hitLineY - 2,
                  vx: (Math.random() - 0.5) * 55,
                  vy: -(35 + Math.random() * 65),
                  life: 0,
                  maxLife: 0.26 + Math.random() * 0.15,
                  color: Math.random() > 0.4 ? glowHex : '#ffffff',
                  size: 1.8 + Math.random() * 1.8,
                  kind: curFx === 'gold_rain' ? 'star' : 'spark',
                  rot: 0,
                  vRot: 4,
                });
              }
            }
          }

          // Note Name or Finger Number on the falling bar if spacious enough
          const minWForText = isBlack ? 11 : 14;
          if (noteHeight >= 20 && noteWidth >= minWForText) {
            ctx.fillStyle = isHit ? 'rgba(255, 255, 255, 0.45)' : '#ffffff';
            ctx.font = `bold ${Math.max(8, Math.min(10, Math.round(noteWidth * 0.48)))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 3;
            
            const displayText = playModeRef.current === 'fingering' 
              ? String(songFingeringRef.current[i] || 1)
              : n.note;

            ctx.fillText(displayText, noteX + noteWidth / 2, yTop + noteHeight / 2);
            ctx.shadowBlur = 0;
          }

          ctx.restore();

          if (playModeRef.current === 'fingering') {
            const fingerNum = songFingeringRef.current[i] || 1;
            const badgeD = Math.min(18, Math.min(noteWidth - 2, noteHeight - 2));
            if (badgeD >= 8) {
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
              ctx.font = `bold ${Math.max(7, Math.round(badgeD * 0.7))}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(String(fingerNum), bX, bY + 0.5);
            }
          }
        };

        if (curFx === 'bounce_balls') {
          // --- SPECTACULAR BOUNCING RHYTHM BALLS MODE (NO FALLING BARS) ---
          const BALL_COLORS = [
            { light: '#a5f3fc', mid: '#06b6d4', dark: '#0e7490', glow: '#22d3ee' }, // C
            { light: '#bfdbfe', mid: '#3b82f6', dark: '#1e3a8a', glow: '#60a5fa' }, // C#
            { light: '#a7f3d0', mid: '#10b981', dark: '#065f46', glow: '#34d399' }, // D
            { light: '#d9f99d', mid: '#84cc16', dark: '#3f6212', glow: '#a3e635' }, // D#
            { light: '#fef08a', mid: '#f59e0b', dark: '#92400e', glow: '#fbbf24' }, // E
            { light: '#fed7aa', mid: '#f97316', dark: '#9a3412', glow: '#fb923c' }, // F
            { light: '#fecdd3', mid: '#e11d48', dark: '#881337', glow: '#fb7185' }, // F#
            { light: '#fbcfe8', mid: '#ec4899', dark: '#831843', glow: '#f472b6' }, // G
            { light: '#f5d0fe', mid: '#d946ef', dark: '#701a75', glow: '#e879f9' }, // G#
            { light: '#e9d5ff', mid: '#9333ea', dark: '#4c1d95', glow: '#c084fc' }, // A
            { light: '#c7d2fe', mid: '#6366f1', dark: '#312e81', glow: '#818cf8' }, // A#
            { light: '#99f6e4', mid: '#14b8a6', dark: '#115e59', glow: '#2dd4bf' }, // B
          ];

          // 1. Draw upcoming key target landing reticles right on the hit line (next 1.0s)
          for (let i = 0; i < len; i++) {
            const n = notes[i];
            const dt = n.time - visualTime;
            const isWaiting = waitingNoteIndexRef.current === i;
            if (!isWaiting && (dt < -0.05 || dt > 1.0)) continue;
            const kp = keyPosMap.get(n.note);
            if (!kp) continue;
            const kx = kp.x + kp.width / 2;
            const pitchClr = BALL_COLORS[noteNameToMidiNumber(n.note) % 12];
            const progress = isWaiting ? 1 : Math.max(0, Math.min(1, 1 - dt / 1.0));

            ctx.save();
            // Subtle vertical column glow on upcoming target key
            const colGrad = ctx.createLinearGradient(kx, hitLineY - 55, kx, hitLineY);
            colGrad.addColorStop(0, 'rgba(0,0,0,0)');
            colGrad.addColorStop(1, pitchClr.glow);
            ctx.globalAlpha = isWaiting ? 0.52 : 0.14 + progress * 0.28;
            ctx.fillStyle = colGrad;
            ctx.fillRect(kp.x + 1, hitLineY - 55, Math.max(3, kp.width - 2), 55);

            // Contracting rhythmic landing ring
            const ringR = Math.max(4, (kp.width * 0.45) * (1.35 - progress * 0.65));
            ctx.globalAlpha = isWaiting ? 1 : 0.35 + progress * 0.65;
            ctx.strokeStyle = isWaiting ? '#ffffff' : pitchClr.glow;
            ctx.lineWidth = isWaiting ? 2.5 : 1.8;
            ctx.beginPath();
            ctx.ellipse(kx, hitLineY - 3, ringR, Math.max(3, ringR * 0.45), 0, 0, Math.PI * 2);
            ctx.stroke();

            // Show note name / finger badge near key for learn/fingering clarity
            if (isWaiting || dt <= 0.45) {
              const label = playModeRef.current === 'fingering'
                ? String(songFingeringRef.current[i] || 1)
                : n.note;
              ctx.globalAlpha = isWaiting ? 1 : 0.78;
              ctx.fillStyle = isWaiting ? '#fde047' : '#ffffff';
              ctx.font = `900 ${Math.max(8, Math.min(11, Math.round(kp.width * 0.5)))}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'bottom';
              ctx.fillText(label, kx, hitLineY - 7);
            }
            ctx.restore();
          }

          // Helper to evaluate a ball's position on a parabolic trajectory at time t
          const evalBallAt = (
            trNotes: { time: number; note: string; duration: number; origIdx: number; midi: number }[],
            t: number,
            isPersistent: boolean
          ) => {
            if (!trNotes || trNotes.length === 0) return null;
            // Binary search for last note <= t
            let lo = 0;
            let hi = trNotes.length - 1;
            let idx = -1;
            while (lo <= hi) {
              const mid = (lo + hi) >> 1;
              if (trNotes[mid].time <= t) {
                idx = mid;
                lo = mid + 1;
              } else {
                hi = mid - 1;
              }
            }

            const getXAndR = (noteName: string) => {
              const kp = keyPosMap.get(noteName);
              if (!kp) return null;
              const r = Math.max(7, Math.min(13.5, kp.width * 0.44));
              return { x: kp.x + kp.width / 2, r, kp };
            };

            if (idx === -1) {
              const n0 = trNotes[0];
              const dt = n0.time - t;
              const lead = isPersistent ? 1.8 : 0.72;
              if (dt > lead || dt < 0) return null;
              const xr = getXAndR(n0.note);
              if (!xr) return null;
              const u = 1 - dt / lead;
              const x = xr.x - (1 - u) * 32;
              const y = (hitLineY - xr.r) * (u * u);
              return {
                x,
                y,
                r: xr.r,
                sx: u > 0.92 ? 1.24 : 0.94,
                sy: u > 0.92 ? 0.78 : 1.08,
                alpha: Math.min(1, u * 2.2),
                noteObj: n0,
                nextObj: n0,
                u,
              };
            }

            if (idx === trNotes.length - 1) {
              const last = trNotes[idx];
              const dt = t - last.time;
              if (dt > 0.65) return null;
              const xr = getXAndR(last.note);
              if (!xr) return null;
              const u = dt / 0.65;
              const arcH = 38 * (1 - u);
              const y = hitLineY - xr.r - 4 * arcH * u * (1 - u);
              return {
                x: xr.x,
                y,
                r: xr.r,
                sx: u < 0.14 ? 1.22 : 1,
                sy: u < 0.14 ? 0.8 : 1,
                alpha: Math.max(0, 1 - u),
                noteObj: last,
                nextObj: null,
                u,
              };
            }

            const prev = trNotes[idx];
            const next = trNotes[idx + 1];
            const xr1 = getXAndR(prev.note);
            const xr2 = getXAndR(next.note);
            if (!xr1 && !xr2) return null;
            const x1 = xr1 ? xr1.x : xr2!.x;
            const x2 = xr2 ? xr2.x : x1;
            const r = xr2 ? xr2.r : xr1!.r;
            const gap = Math.max(0.025, next.time - prev.time);
            const dt = t - prev.time;

            if (!isPersistent) {
              if (dt <= 0.25) {
                const u = dt / 0.25;
                return {
                  x: x1,
                  y: hitLineY - r - 24 * 4 * u * (1 - u),
                  r,
                  sx: u < 0.2 ? 1.22 : 1,
                  sy: u < 0.2 ? 0.8 : 1,
                  alpha: Math.max(0, 1 - u),
                  noteObj: prev,
                  nextObj: null,
                  u,
                };
              } else if (next.time - t <= 0.62) {
                const u = 1 - (next.time - t) / 0.62;
                const arcH = Math.min(hitLineY * 0.72, 74);
                return {
                  x: x2 - (1 - u) * 24,
                  y: hitLineY - r - 4 * arcH * u * (1 - u),
                  r,
                  sx: u > 0.9 ? 1.22 : 0.94,
                  sy: u > 0.9 ? 0.8 : 1.07,
                  alpha: Math.min(1, u * 2.4),
                  noteObj: next,
                  nextObj: next,
                  u,
                };
              }
              return null;
            }

            // Persistent hero ball trajectory
            if (gap <= 1.35) {
              const u = dt / gap;
              const x = x1 + (x2 - x1) * u;
              const arcH = Math.min(hitLineY * 0.84, Math.max(22, 18 + gap * 128));
              const y = hitLineY - r - 4 * arcH * u * (1 - u);
              const nearBounce = u < 0.09 || u > 0.91;
              return {
                x,
                y,
                r,
                sx: nearBounce ? 1.24 : 0.93,
                sy: nearBounce ? 0.78 : 1.09,
                alpha: 1,
                noteObj: u < 0.5 ? prev : next,
                nextObj: next,
                u,
              };
            } else {
              if (dt <= 0.30) {
                const u = dt / 0.30;
                return {
                  x: x1,
                  y: hitLineY - r - 22 * 4 * u * (1 - u),
                  r,
                  sx: u < 0.16 ? 1.2 : 1,
                  sy: u < 0.16 ? 0.82 : 1,
                  alpha: 1,
                  noteObj: prev,
                  nextObj: null,
                  u,
                };
              } else if (t < next.time - 1.05) {
                const hover = Math.abs(Math.sin((dt - 0.30) * 4.2)) * 9;
                return {
                  x: x1,
                  y: hitLineY - r - hover,
                  r,
                  sx: hover < 1.5 ? 1.16 : 1,
                  sy: hover < 1.5 ? 0.86 : 1,
                  alpha: 1,
                  noteObj: prev,
                  nextObj: next,
                  u: 0,
                };
              } else {
                const u = (t - (next.time - 1.05)) / 1.05;
                const arcH = Math.min(hitLineY * 0.82, 125);
                return {
                  x: x1 + (x2 - x1) * u,
                  y: hitLineY - r - 4 * arcH * u * (1 - u),
                  r,
                  sx: u > 0.92 ? 1.24 : 0.92,
                  sy: u > 0.92 ? 0.78 : 1.1,
                  alpha: 1,
                  noteObj: next,
                  nextObj: next,
                  u,
                };
              }
            }
          };

          // 2. Render each active Bouncing Ball Track with ribbon comet trail + dotted preview arc + 3D glossy orb
          const curTracks = ballTracksRef.current;
          for (let trIdx = curTracks.length - 1; trIdx >= 0; trIdx--) {
            const trNotes = curTracks[trIdx];
            const isPersistent = trIdx < 2;
            const cur = evalBallAt(trNotes, visualTime, isPersistent);
            if (!cur) continue;

            const clr = BALL_COLORS[cur.noteObj.midi % 12];

            // Dotted guide arc toward next key for persistent balls
            if (isPersistent && cur.nextObj && cur.nextObj.time - visualTime <= 1.15) {
              const targetKp = keyPosMap.get(cur.nextObj.note);
              if (targetKp) {
                ctx.save();
                ctx.setLineDash([3, 5]);
                ctx.strokeStyle = clr.glow;
                ctx.globalAlpha = 0.22 * cur.alpha;
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.moveTo(cur.x, cur.y);
                const nx = targetKp.x + targetKp.width / 2;
                ctx.quadraticCurveTo((cur.x + nx) / 2, Math.max(8, cur.y - 24), nx, hitLineY - 3);
                ctx.stroke();
                ctx.restore();
              }
            }

            // Smooth analytical glowing ribbon trail behind the ball (8 samples back in time)
            ctx.save();
            for (let k = 8; k >= 1; k--) {
              const trailEval = evalBallAt(trNotes, visualTime - k * 0.022, isPersistent);
              if (!trailEval) continue;
              const tFrac = 1 - k / 9;
              ctx.globalAlpha = cur.alpha * tFrac * 0.42;
              ctx.fillStyle = clr.glow;
              ctx.beginPath();
              ctx.arc(trailEval.x, trailEval.y, Math.max(1.5, cur.r * tFrac * 0.82), 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();

            // Draw the 3D Glossy Neon Sphere with Squash & Stretch
            ctx.save();
            ctx.globalAlpha = cur.alpha;
            ctx.translate(cur.x, cur.y);
            ctx.scale(cur.sx, cur.sy);

            // Outer ambient halo
            const haloGrad = ctx.createRadialGradient(0, 0, cur.r * 0.3, 0, 0, cur.r * 2.1);
            haloGrad.addColorStop(0, clr.glow);
            haloGrad.addColorStop(0.45, clr.mid + '66');
            haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = haloGrad;
            ctx.beginPath();
            ctx.arc(0, 0, cur.r * 2.1, 0, Math.PI * 2);
            ctx.fill();

            // 3D sphere body gradient
            const orbGrad = ctx.createRadialGradient(-cur.r * 0.32, -cur.r * 0.35, cur.r * 0.1, 0, 0, cur.r);
            orbGrad.addColorStop(0, '#ffffff');
            orbGrad.addColorStop(0.28, clr.light);
            orbGrad.addColorStop(0.68, clr.mid);
            orbGrad.addColorStop(1, clr.dark);
            ctx.fillStyle = orbGrad;
            ctx.beginPath();
            ctx.arc(0, 0, cur.r, 0, Math.PI * 2);
            ctx.fill();

            // Crisp bright rim outline
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = 1.25;
            ctx.stroke();

            // Note / Finger label inside main spheres if large enough
            if (cur.r >= 8.5) {
              ctx.fillStyle = '#0f172a';
              ctx.font = `900 ${Math.max(7, Math.round(cur.r * 0.85))}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const txt = playModeRef.current === 'fingering'
                ? String(songFingeringRef.current[cur.noteObj.origIdx] || 1)
                : cur.noteObj.note.replace(/\d+$/, '');
              ctx.fillText(txt, 0, 0.5);
            }

            ctx.restore();
          }
        } else {
          // Pass 1: Render White Key Notes
          for (let i = 0; i < len; i++) {
            const keyPos = keyPosMap.get(notes[i].note);
            if (keyPos && keyPos.type === 'white') {
              renderNoteBar(i);
            }
          }

          // Pass 2: Render Black Key Notes on top (clean layering, exactly like the physical piano)
          for (let i = 0; i < len; i++) {
            const keyPos = keyPosMap.get(notes[i].note);
            if (keyPos && keyPos.type === 'black') {
              renderNoteBar(i);
            }
          }
        }

        // --- FOREGROUND FX: VERTICAL HOLOGRAPHIC LASER BEAMS ('aurora', 'matrix', 'all') ---
        if ((curFx === 'aurora' || curFx === 'matrix' || curFx === 'all') && laserBeamsRef.current.length > 0) {
          const beams = laserBeamsRef.current;
          ctx.save();
          for (let bIdx = beams.length - 1; bIdx >= 0; bIdx--) {
            const bm = beams[bIdx];
            bm.life += deltaSec;
            if (bm.life >= bm.maxLife) {
              beams.splice(bIdx, 1);
              continue;
            }
            const alpha = Math.max(0, 1 - bm.life / bm.maxLife);
            const bGrad = ctx.createLinearGradient(bm.x, 0, bm.x, hitLineY);
            bGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
            bGrad.addColorStop(0.45, bm.color);
            bGrad.addColorStop(1, '#ffffff');
            ctx.globalAlpha = alpha * 0.55;
            ctx.fillStyle = bGrad;
            const curW = bm.width * (0.4 + 0.6 * alpha);
            ctx.fillRect(bm.x - curW / 2, 0, curW, hitLineY);
          }
          ctx.restore();
        }

        // --- FOREGROUND FX: SHOOTING STARS / METEOR SHOWER ('meteor', 'all') ---
        if ((curFx === 'meteor' || curFx === 'all') && meteorsRef.current.length > 0) {
          const mets = meteorsRef.current;
          ctx.save();
          for (let mIdx = mets.length - 1; mIdx >= 0; mIdx--) {
            const m = mets[mIdx];
            m.life += deltaSec;
            if (m.life >= m.maxLife || m.y > hitLineY + 20) {
              mets.splice(mIdx, 1);
              continue;
            }
            m.x += m.vx * deltaSec;
            m.y += m.vy * deltaSec;
            const alpha = Math.max(0, 1 - m.life / m.maxLife);
            const tailX = m.x - (m.vx / 200) * m.len;
            const tailY = m.y - (m.vy / 200) * m.len;
            const mGrad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
            mGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
            mGrad.addColorStop(0.7, m.color);
            mGrad.addColorStop(1, '#ffffff');
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = mGrad;
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
          }
          ctx.restore();
        }

        // --- FOREGROUND FX: PYROTECHNIC FIREWORKS MORTARS ('fireworks', 'all') ---
        if ((curFx === 'fireworks' || curFx === 'all') && fireworksRef.current.length > 0) {
          const fw = fireworksRef.current;
          ctx.save();
          for (let fIdx = fw.length - 1; fIdx >= 0; fIdx--) {
            const shell = fw[fIdx];
            shell.y += shell.vy * deltaSec;
            // Draw rising rocket trail
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(shell.x, shell.y, 2.6, 0, Math.PI * 2);
            ctx.fill();

            if (shell.y <= shell.targetY && !shell.exploded) {
              shell.exploded = true;
              fw.splice(fIdx, 1);
              // Spawn 360-degree firework explosion burst!
              const pool = sparksRef.current;
              const ringColors = ['#fde047', '#22d3ee', '#f472b6', '#a855f7', '#4ade80', '#ffffff'];
              for (let k = 0; k < 18; k++) {
                const ang = (Math.PI * 2 * k) / 18;
                const spd = 55 + Math.random() * 55;
                pool.push({
                  x: shell.x,
                  y: shell.y,
                  vx: Math.cos(ang) * spd,
                  vy: Math.sin(ang) * spd,
                  life: 0,
                  maxLife: 0.48 + Math.random() * 0.2,
                  color: ringColors[k % ringColors.length],
                  size: 2.8 + Math.random() * 1.8,
                  kind: k % 2 === 0 ? 'star' : 'spark',
                  rot: ang,
                  vRot: 6,
                });
              }
            }
          }
          ctx.restore();
        }

        // --- FOREGROUND FX: FIRE & PLASMA HORIZON ('fire', 'meteor', or 'all') ---
        if (curFx === 'fire' || curFx === 'meteor' || curFx === 'all') {
          ctx.save();
          const flameMaxH = 14 + energy * 32;
          const fireGrad = ctx.createLinearGradient(0, hitLineY - flameMaxH, 0, hitLineY);
          fireGrad.addColorStop(0, 'rgba(239, 68, 68, 0)');
          fireGrad.addColorStop(0.55, `rgba(249, 115, 22, ${0.22 + energy * 0.38})`);
          fireGrad.addColorStop(1, `rgba(254, 240, 138, ${0.48 + energy * 0.45})`);
          ctx.fillStyle = fireGrad;
          ctx.beginPath();
          ctx.moveTo(0, hitLineY);
          const fPhase = now * 0.012;
          for (let x = 0; x <= width; x += 12) {
            const flicker =
              Math.sin(x * 0.05 + fPhase) * 0.5 +
              Math.cos(x * 0.11 - fPhase * 1.4) * 0.5;
            const fy = hitLineY - Math.max(3, (0.55 + 0.45 * flicker) * flameMaxH);
            ctx.lineTo(x, fy);
          }
          ctx.lineTo(width, hitLineY);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // --- FOREGROUND FX: EXPANDING SONIC SHOCKWAVES ---
        if (curFx !== 'off' && shockwavesRef.current.length > 0) {
          const waves = shockwavesRef.current;
          ctx.save();
          for (let wIdx = waves.length - 1; wIdx >= 0; wIdx--) {
            const w = waves[wIdx];
            w.life += deltaSec;
            if (w.life >= w.maxLife) {
              waves.splice(wIdx, 1);
              continue;
            }
            const progress = w.life / w.maxLife;
            const alpha = Math.max(0, 1 - progress);

            const rx = w.width * (0.5 + progress * 1.65);
            const ry = 4 + progress * 16;
            ctx.globalAlpha = alpha * 0.92;
            ctx.strokeStyle = progress < 0.3 ? '#ffffff' : w.color;
            ctx.lineWidth = Math.max(1, 2.8 * (1 - progress));
            ctx.beginPath();
            ctx.ellipse(w.x, w.y - 2, rx, ry, 0, Math.PI, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
        }

        // --- FOREGROUND FX: TESLA LIGHTNING ARCS ('lightning', 'vortex', or 'all') ---
        if ((curFx === 'lightning' || curFx === 'vortex' || curFx === 'all') && lightningBoltsRef.current.length > 0) {
          const bolts = lightningBoltsRef.current;
          ctx.save();
          for (let bIdx = bolts.length - 1; bIdx >= 0; bIdx--) {
            const b = bolts[bIdx];
            b.life += deltaSec;
            if (b.life >= b.maxLife) {
              bolts.splice(bIdx, 1);
              continue;
            }
            const alpha = Math.max(0, 1 - b.life / b.maxLife);

            ctx.globalAlpha = alpha * 0.88;
            ctx.strokeStyle = b.color;
            ctx.lineWidth = 3.4;
            ctx.beginPath();
            for (let p = 0; p < b.points.length; p++) {
              const pt = b.points[p];
              const jitterX = p === 0 ? 0 : (Math.random() - 0.5) * 4.0;
              if (p === 0) ctx.moveTo(b.x + pt.dx, b.y + pt.dy);
              else ctx.lineTo(b.x + pt.dx + jitterX, b.y + pt.dy);
            }
            ctx.stroke();

            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.4;
            ctx.stroke();

            if (b.branchPoints) {
              for (const br of b.branchPoints) {
                const origin = b.points[br.startIdx] || b.points[0];
                ctx.beginPath();
                ctx.moveTo(b.x + origin.dx, b.y + origin.dy);
                ctx.lineTo(b.x + br.dx, b.y + br.dy);
                ctx.strokeStyle = b.color;
                ctx.lineWidth = 1.6;
                ctx.stroke();
              }
            }
          }
          ctx.restore();
        }

        // --- FOREGROUND FX: MUSICAL NOTES, HEXAGONS, PRISMS, STARBURSTS & EMBERS ---
        if (curFx !== 'off' && sparksRef.current.length > 0) {
          const pool = sparksRef.current;
          ctx.save();
          for (let sIdx = pool.length - 1; sIdx >= 0; sIdx--) {
            const sp = pool[sIdx];
            sp.life += deltaSec;
            if (sp.life >= sp.maxLife) {
              pool.splice(sIdx, 1);
              continue;
            }
            sp.x += sp.vx * deltaSec;
            sp.y += sp.vy * deltaSec;
            sp.vy += (sp.kind === 'ember' || sp.kind === 'music_note' ? -22 : sp.kind === 'prism' || sp.kind === 'hex' ? 60 : 125) * deltaSec;
            sp.rot += sp.vRot * deltaSec;
            const alpha = Math.max(0, 1 - sp.life / sp.maxLife);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = sp.color;

            if (sp.kind === 'music_note') {
              ctx.font = `900 ${Math.round(sp.size)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(sp.symbol || '♪', sp.x, sp.y);
            } else if (sp.kind === 'hex') {
              const r = sp.size * (0.65 + 0.55 * alpha);
              ctx.save();
              ctx.translate(sp.x, sp.y);
              ctx.rotate(sp.rot);
              ctx.beginPath();
              for (let h = 0; h < 6; h++) {
                const ha = (Math.PI / 3) * h;
                if (h === 0) ctx.moveTo(Math.cos(ha) * r, Math.sin(ha) * r);
                else ctx.lineTo(Math.cos(ha) * r, Math.sin(ha) * r);
              }
              ctx.closePath();
              ctx.strokeStyle = sp.color;
              ctx.lineWidth = 1.5;
              ctx.stroke();
              ctx.restore();
            } else if (sp.kind === 'prism') {
              const r = sp.size * (0.6 + 0.6 * alpha);
              ctx.save();
              ctx.translate(sp.x, sp.y);
              ctx.rotate(sp.rot);
              ctx.beginPath();
              ctx.moveTo(0, -r * 1.5);
              ctx.lineTo(r * 1.1, 0);
              ctx.lineTo(0, r * 1.5);
              ctx.lineTo(-r * 1.1, 0);
              ctx.closePath();
              ctx.fill();
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 0.8;
              ctx.stroke();
              ctx.restore();
            } else if (sp.kind === 'star') {
              const r = sp.size * (0.5 + 0.7 * alpha);
              ctx.save();
              ctx.translate(sp.x, sp.y);
              ctx.rotate(sp.rot);
              ctx.beginPath();
              ctx.moveTo(0, -r * 1.8);
              ctx.quadraticCurveTo(r * 0.25, -r * 0.25, r * 1.8, 0);
              ctx.quadraticCurveTo(r * 0.25, r * 0.25, 0, r * 1.8);
              ctx.quadraticCurveTo(-r * 0.25, r * 0.25, -r * 1.8, 0);
              ctx.quadraticCurveTo(-r * 0.25, -r * 0.25, 0, -r * 1.8);
              ctx.closePath();
              ctx.fill();
              ctx.restore();
            } else {
              ctx.beginPath();
              ctx.arc(sp.x, sp.y, sp.size * alpha + 0.6, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.restore();
        }
      }

      // Target hit line (Luminous gold & white plasma bar right above piano keys)
      const hitBarGrad = ctx.createLinearGradient(0, hitLineY - 2, 0, hitLineY + 2);
      hitBarGrad.addColorStop(0, '#fef08a');
      hitBarGrad.addColorStop(0.5, '#f59e0b');
      hitBarGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = hitBarGrad;
      ctx.fillRect(0, hitLineY - 2, width, 4);

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
      songPlaybackState.activeDemoNotes.clear();
    };
  }, [song.id]);

  const handleReset = () => {
    currentTimeRef.current = 0;
    sheetPageStartTimeRef.current = 0;
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
    songPlaybackState.activeDemoNotes.clear();
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
      songPlaybackState.activeDemoNotes.clear();
    }
  };

  const progressPercent = Math.min(100, Math.round((currentTime / songDuration) * 100));

  return (
    <div
      ref={containerRef}
      style={{ height: 'clamp(82px, 35dvh, 152px)' }}
      className={`relative w-full shrink-0 ${viewMode === 'sheet' ? 'bg-white text-slate-900 border-b border-slate-300 shadow-md' : 'bg-slate-950 text-white'} flex flex-col overflow-hidden select-none px-1 sm:px-2`}
    >
      {/* HUD Header Bar - Sleek Single Row */}
      <div className="absolute top-1 left-2 right-2 z-20 flex items-center justify-between text-xs pointer-events-auto flex-nowrap gap-1">
        {/* Song Info */}
        <div className={`flex items-center gap-1.5 ${viewMode === 'sheet' ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-slate-900/90 border-slate-800 text-white'} border rounded-lg px-2 py-0.5 backdrop-blur-md shrink-0 max-w-[30vw]`}>
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping shrink-0" />
          <span className={`font-extrabold ${viewMode === 'sheet' ? 'text-slate-900' : 'text-white'} truncate text-[11px]`}>
            {song.title}
          </span>
          <span className="text-[9px] text-slate-500 hidden md:inline shrink-0">&bull; {song.author}</span>
        </div>

        {/* Mode Selector & Controls - Single Row */}
        <div className={`flex items-center gap-1 ${viewMode === 'sheet' ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-slate-900/95 border-slate-800 text-white'} border rounded-lg p-0.5 backdrop-blur-md flex-nowrap shrink-0 overflow-x-auto scrollbar-thin max-w-[62vw] sm:max-w-[72vw]`}>
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

          {/* View Mode Toggle: Waterfall vs Sheet Music Staff */}
          <button
            onClick={() => {
              const next = viewMode === 'waterfall' ? 'sheet' : 'waterfall';
              setViewMode(next);
              if (onViewModeChange) onViewModeChange(next);
            }}
            className={`px-2 py-0.5 text-[9px] sm:text-[10px] font-black rounded flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'sheet'
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-400 text-slate-950 shadow-md ring-1 ring-emerald-300'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Cambia visualizzazione tra note in caduta (Cascata) e pentagramma scorrevole (Spartito)"
          >
            <span>{viewMode === 'sheet' ? '🎼 Spartito' : '🎹 Cascata'}</span>
          </button>

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

          {/* 🪄 Smart MIDI Filter: Solo Melodia (1 Mano) */}
          <button
            onClick={() => {
              const next = !isMelodyOnly;
              setIsMelodyOnly(next);
              hitNotesSetRef.current.clear();
              waitingNoteIndexRef.current = null;
              setWaitingTargetNote(null);
              setLoopFeedbackMessage(
                next
                  ? '🪄 Solo Melodia (1 Mano) ATTIVO: accordi e doppie voci rimossi per rendere il brano suonabile!'
                  : '🎼 Brano Originale Completo ripristinato (tutte le note MIDI)'
              );
              setTimeout(() => setLoopFeedbackMessage(null), 3200);
            }}
            className={`px-1.5 py-0.5 text-[9px] font-black rounded flex items-center gap-0.5 transition-all border cursor-pointer whitespace-nowrap ${
              isMelodyOnly
                ? 'bg-gradient-to-r from-fuchsia-500 to-amber-500 text-slate-950 border-amber-300 shadow-sm'
                : 'bg-slate-800/90 border-fuchsia-500/40 text-fuchsia-300 hover:text-white'
            }`}
            title="Semplifica per 1 Mano (Solo Melodia): filtra automaticamente gli accordi simultanei dei file MIDI lasciando solo la melodia principale cantata!"
          >
            <span>🪄 1 Mano</span>
          </button>

          {/* ✨ Selettore 13 Effetti Visivi Spettacolari (Tap per aprire galleria o ciclare) */}
          <button
            onClick={() => setIsFxPickerOpen((v) => !v)}
            className={`px-1.5 py-0.5 text-[9px] font-black rounded flex items-center gap-0.5 transition-all border cursor-pointer whitespace-nowrap ${
              fxMode !== 'off'
                ? 'bg-gradient-to-r from-amber-500/25 via-fuchsia-500/25 to-cyan-500/25 border-amber-400/70 text-amber-300 shadow-sm'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Scegli tra i 13 Effetti Visivi Spettacolari per i tuoi Video!"
          >
            <span>
              {fxMode === 'all'
                ? '👑 Ultra Mix'
                : fxMode === 'bounce_balls'
                ? '🏀 Rimbalzi'
                : fxMode === 'fireworks'
                ? '🎆 Fuochi'
                : fxMode === 'aurora'
                ? '🌈 Laser'
                : fxMode === 'lightning'
                ? '⚡ Fulmini'
                : fxMode === 'fire'
                ? '🔥 Lava'
                : fxMode === 'vortex'
                ? '🌀 Portale'
                : fxMode === 'gold_rain'
                ? '🎵 Note Oro'
                : fxMode === 'matrix'
                ? '🟢 Matrix'
                : fxMode === 'meteor'
                ? '☄️ Meteore'
                : fxMode === 'crystal'
                ? '💎 Cristalli'
                : fxMode === 'wave'
                ? '🌊 Onde'
                : fxMode === 'stars'
                ? '🌌 Stelle'
                : '🚫 FX Off'}
            </span>
            <span className="text-[8px] opacity-80">▾</span>
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
            title="Restart"
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
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black px-3 py-1 rounded-lg shadow-xl flex items-center gap-1.5 text-[10px] sm:text-xs animate-in fade-in slide-in-from-top-1 pointer-events-none whitespace-nowrap">
          <span>{loopFeedbackMessage}</span>
        </div>
      )}

      {/* Target Prompt in 'fingering' mode - Shows Note, Finger, and Tip */}
      {waitingTargetNote && playMode === 'fingering' && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center max-w-[94vw]">
          <div className="bg-slate-950/95 border border-amber-400/90 text-amber-300 font-extrabold px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] shadow-xl backdrop-blur-md flex items-center gap-1.5 flex-nowrap justify-center animate-in fade-in">
            <span className="text-[9px] text-amber-300/80 uppercase font-black">PLAY:</span>
            <span className="text-[11px] bg-amber-500/25 text-amber-200 px-1.5 py-0.2 rounded font-mono font-black border border-amber-400/40">
              {waitingTargetNote}
            </span>
            {waitingTargetFinger && (
              <span className="flex items-center gap-1 text-[10px] font-black text-cyan-300 bg-cyan-950/90 border border-cyan-500/50 px-2 py-0.2 rounded-full whitespace-nowrap">
                <span>{selectedHand === 'left' ? '🤚 Left' : '✋ Right'}: Finger {waitingTargetFinger}</span>
              </span>
            )}
          </div>
          {waitingTip && (
            <div className="mt-0.5 bg-slate-900/95 border border-amber-500/30 text-amber-200 text-[9px] px-2.5 py-0.5 rounded-md max-w-sm text-center shadow-lg animate-in fade-in">
              💡 {waitingTip}
            </div>
          )}
        </div>
      )}

      {/* Target Prompt in original 'learn' mode */}
      {waitingTargetNote && playMode === 'learn' && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-slate-950/90 border border-amber-400 text-amber-300 font-extrabold px-3 py-0.5 rounded-full text-[10px] sm:text-[11px] shadow-xl backdrop-blur-md flex items-center gap-1.5 animate-pulse whitespace-nowrap">
            <span>Press</span>
            <span className="text-amber-200 font-mono font-black text-xs">{waitingTargetNote}</span>
            <span>to continue...</span>
          </div>
        </div>
      )}

      {/* 60 FPS Canvas with zero lag and O(1) rendering */}
      <canvas ref={canvasRef} data-waterfall-canvas="true" className="w-full h-full block cursor-pointer" />

      {/* Masterclass Completion Screen (No points, No rigioca modal, Handover back to Maestro) */}
      {isCompleted && isMasterclassMode ? (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex items-center justify-center p-2 animate-in fade-in">
          <div className="bg-slate-900/95 border border-emerald-500/60 rounded-xl p-3 max-w-xs w-full shadow-2xl flex flex-col items-center text-center max-h-[96%] overflow-y-auto">
            <div className="w-8 h-8 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center text-emerald-400 font-bold text-base mb-1">
              👑
            </div>
            <h3 className="text-xs sm:text-sm font-black text-white">Phrase Completed!</h3>
            <p className="text-[10px] text-slate-300 mt-0.5 mb-2.5">
              You completed all {song.notes.length} notes from the Teacher! Turn passes back.
            </p>
            <button
              onClick={onClose}
              className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[11px] transition-all shadow cursor-pointer"
            >
              ⬅️ Back to Piano
            </button>
          </div>
        </div>
      ) : isCompleted && (
        /* Final Report & Stars Screen - Compact Horizontal-Friendly Layout designed for black waterfall box */
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-30 flex items-center justify-center p-2 animate-in fade-in">
          <div className="bg-slate-900/95 border border-amber-500/60 rounded-xl p-2.5 sm:p-3 max-w-md w-full shadow-2xl flex flex-col items-center text-center max-h-[96%] overflow-y-auto scrollbar-thin">
            {/* Header: Trophy + Title + Stars in sleek row */}
            <div className="flex items-center justify-between w-full pb-1.5 border-b border-slate-800 gap-2">
              <div className="flex items-center gap-1.5 text-left">
                <span className="text-base sm:text-lg">🏆</span>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-white leading-tight">Song Result</h3>
                  <p className="text-[9px] text-amber-300 font-bold truncate max-w-[170px] sm:max-w-[220px]">
                    {song.title} {song.author ? `• ${song.author}` : ''}
                  </p>
                </div>
              </div>
              <div className="text-base sm:text-xl font-black text-amber-400 tracking-wider drop-shadow shrink-0">
                {(() => {
                  const hitCount = hitNotesSetRef.current.size;
                  const acc = Math.min(100, Math.max(0, Math.round((hitCount / Math.max(1, song.notes.length)) * 100)));
                  return acc >= 92 ? '⭐⭐⭐' : acc >= 78 ? '⭐⭐' : '⭐';
                })()}
              </div>
            </div>

            {/* Stats row: Accuracy, XP, Streak in compact pills */}
            <div className="grid grid-cols-3 gap-1.5 w-full my-2">
              <div className="bg-slate-950/90 border border-slate-800 rounded-lg py-1 px-1.5">
                <div className="text-[8.5px] text-slate-400 font-bold uppercase leading-none">Accuracy</div>
                <div className="text-xs sm:text-sm font-black text-emerald-400 font-mono mt-0.5">
                  {Math.min(100, Math.max(0, Math.round((hitNotesSetRef.current.size / Math.max(1, song.notes.length)) * 100)))}%
                </div>
              </div>
              <div className="bg-slate-950/90 border border-slate-800 rounded-lg py-1 px-1.5">
                <div className="text-[8.5px] text-slate-400 font-bold uppercase leading-none">XP Points</div>
                <div className="text-xs sm:text-sm font-black text-amber-400 font-mono mt-0.5">+{score}</div>
              </div>
              <div className="bg-slate-950/90 border border-slate-800 rounded-lg py-1 px-1.5">
                <div className="text-[8.5px] text-slate-400 font-bold uppercase leading-none">Streak</div>
                <div className="text-xs sm:text-sm font-black text-cyan-400 font-mono mt-0.5">🔥 5 Days</div>
              </div>
            </div>

            {/* Action Buttons row: Replay, Challenge, Close */}
            <div className="flex items-center gap-1.5 w-full mt-0.5">
              <button
                onClick={handleShareChallenge}
                className="py-1.5 px-2.5 bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-black rounded-lg text-[10px] sm:text-[11px] transition-all shadow cursor-pointer flex items-center justify-center gap-1"
                title="Share challenge"
              >
                {isCopiedChallenge ? <Check className="w-3.5 h-3.5 text-emerald-950" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{isCopiedChallenge ? 'Copied!' : 'Challenge'}</span>
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-1.5 px-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-lg text-[10px] sm:text-[11px] transition-all shadow cursor-pointer flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Replay</span>
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold rounded-lg text-[10px] sm:text-[11px] transition-all border border-slate-700 cursor-pointer flex items-center justify-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Close</span>
              </button>
            </div>

            {/* Post-Song In-App Rating Prompt (User-Friendly Timing) */}
            <a
              href="https://play.google.com/store/apps/details?id=it.freeserv.virtukeys"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full mt-1 py-1 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <span>⭐⭐⭐⭐⭐</span>
              <span>Enjoyed playing? Rate VirtuKeys on Google Play!</span>
            </a>
          </div>
        </div>
      )}

      {/* Count-In Acoustic Countdown Overlay ("3, 2, 1... Go!") - Fitted perfectly inside the black box */}
      {countInText && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-40 flex items-center justify-center pointer-events-none animate-in fade-in">
          <div className="flex flex-col items-center justify-center text-center p-1">
            <div className="text-4xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-400 tracking-tight drop-shadow-xl animate-pulse">
              {countInText}
            </div>
            <div className="text-[10px] sm:text-[11px] font-bold text-amber-200 uppercase tracking-wider mt-1 bg-amber-500/20 px-3 py-0.5 rounded-full border border-amber-500/40">
              🥁 Ready... Starting song!
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
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING 13-FX GALLERY PICKER BAR */}
      {isFxPickerOpen && (
        <div className="absolute top-8 left-2 right-2 z-40 bg-slate-950/95 border border-amber-500/50 rounded-xl p-2 shadow-2xl backdrop-blur-md animate-in fade-in">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider">
              ✨ Scegli Effetto Spettacolare per il Video (14 Modalità • 0ms Lag)
            </span>
            <button
              onClick={() => setIsFxPickerOpen(false)}
              className="text-slate-400 hover:text-white text-xs font-bold px-1.5 cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-1">
            {([
              { id: 'all', label: '👑 Ultra Mix', desc: 'Tutti insieme!' },
              { id: 'bounce_balls', label: '🏀 Rimbalzi', desc: 'Sfere a ritmo sui tasti' },
              { id: 'fireworks', label: '🎆 Fuochi', desc: 'Esplosioni 360°' },
              { id: 'aurora', label: '🌈 Laser Aurora', desc: 'Raggi verticali' },
              { id: 'lightning', label: '⚡ Fulmini Tesla', desc: 'Archi elettrici' },
              { id: 'fire', label: '🔥 Inferno Lava', desc: 'Fiamme & braci' },
              { id: 'vortex', label: '🌀 Portale 3D', desc: 'Galassia & onde' },
              { id: 'gold_rain', label: '🎵 Note Oro 24K', desc: 'Simboli ♪ ♫ 𝄞' },
              { id: 'matrix', label: '🟢 Cyber Matrix', desc: 'Pioggia digitale' },
              { id: 'meteor', label: '☄️ Meteore', desc: 'Stelle cadenti' },
              { id: 'crystal', label: '💎 Cristalli', desc: 'Prismi diamante' },
              { id: 'wave', label: '🌊 Onde Audio', desc: 'Equalizzatore' },
              { id: 'stars', label: '🌌 Galassia', desc: 'Cielo stellato' },
              { id: 'off', label: '🚫 Nessuno', desc: 'Solo note pulite' },
            ] as const).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setFxMode(item.id);
                  fxModeRef.current = item.id;
                  if (item.id === 'off') {
                    sparksRef.current = [];
                    shockwavesRef.current = [];
                    lightningBoltsRef.current = [];
                    fireworksRef.current = [];
                    laserBeamsRef.current = [];
                    meteorsRef.current = [];
                  }
                  setIsFxPickerOpen(false);
                  setLoopFeedbackMessage(`✨ Effetto attivo: ${item.label} (${item.desc})`);
                  setTimeout(() => setLoopFeedbackMessage(null), 2400);
                }}
                className={`px-2 py-1 rounded-lg border text-left transition-all cursor-pointer flex flex-col ${
                  fxMode === item.id
                    ? 'bg-amber-500/25 border-amber-400 text-amber-200 font-black shadow'
                    : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="text-[10px] font-extrabold truncate">{item.label}</span>
                <span className="text-[8px] text-slate-400 truncate">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
