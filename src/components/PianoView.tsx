import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { audioEngine } from '../utils/audioEngine';
import { InstrumentType, RecordedNote, InteractiveSong } from '../types';
import {
  Home,
  Maximize,
  Minimize,
  BookOpen,
  User,
  Sparkles,
  Check,
  MoreHorizontal,
  X,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Volume1,
  VolumeX,
  RotateCw,
  Flame,
  Mic,
  Radio,
  Trophy,
  Swords,
  Share2,
} from 'lucide-react';
import { SongLibraryModal } from './SongLibraryModal';
import { FallingNotesWaterfall } from './FallingNotesWaterfall';
import { MiniMapKeyboard } from './MiniMapKeyboard';
import { CanvasPiano } from './CanvasPiano';
import { getPublishedSongs } from '../utils/songStorage';
import { getUsername } from '../utils/songStorage';
import { midiEngine } from '../utils/midiEngine';
import { pitchDetector } from '../utils/pitchDetector';
import { loadGamificationState, UserGamificationState, AVAILABLE_BADGES } from '../utils/gamification';
import { parseChallengeFromUrl, ChallengeData } from '../utils/challengeShare';

interface PianoViewProps {
  onBackToHome: () => void;
}

interface KeyConfig {
  note: string;
  type: 'white' | 'black';
  octave: number;
  computerKey?: string;
}

const ALL_PIANO_KEYS: KeyConfig[] = [
  { note: 'A0', type: 'white', octave: 0 },
  { note: 'A#0', type: 'black', octave: 0 },
  { note: 'B0', type: 'white', octave: 0 },

  { note: 'C1', type: 'white', octave: 1 },
  { note: 'C#1', type: 'black', octave: 1 },
  { note: 'D1', type: 'white', octave: 1 },
  { note: 'D#1', type: 'black', octave: 1 },
  { note: 'E1', type: 'white', octave: 1 },
  { note: 'F1', type: 'white', octave: 1 },
  { note: 'F#1', type: 'black', octave: 1 },
  { note: 'G1', type: 'white', octave: 1 },
  { note: 'G#1', type: 'black', octave: 1 },
  { note: 'A1', type: 'white', octave: 1 },
  { note: 'A#1', type: 'black', octave: 1 },
  { note: 'B1', type: 'white', octave: 1 },

  { note: 'C2', type: 'white', octave: 2 },
  { note: 'C#2', type: 'black', octave: 2 },
  { note: 'D2', type: 'white', octave: 2 },
  { note: 'D#2', type: 'black', octave: 2 },
  { note: 'E2', type: 'white', octave: 2 },
  { note: 'F2', type: 'white', octave: 2 },
  { note: 'F#2', type: 'black', octave: 2 },
  { note: 'G2', type: 'white', octave: 2 },
  { note: 'G#2', type: 'black', octave: 2 },
  { note: 'A2', type: 'white', octave: 2 },
  { note: 'A#2', type: 'black', octave: 2 },
  { note: 'B2', type: 'white', octave: 2 },

  { note: 'C3', type: 'white', octave: 3, computerKey: 'z' },
  { note: 'C#3', type: 'black', octave: 3, computerKey: 's' },
  { note: 'D3', type: 'white', octave: 3, computerKey: 'x' },
  { note: 'D#3', type: 'black', octave: 3, computerKey: 'd' },
  { note: 'E3', type: 'white', octave: 3, computerKey: 'c' },
  { note: 'F3', type: 'white', octave: 3, computerKey: 'v' },
  { note: 'F#3', type: 'black', octave: 3, computerKey: 'g' },
  { note: 'G3', type: 'white', octave: 3, computerKey: 'b' },
  { note: 'G#3', type: 'black', octave: 3, computerKey: 'h' },
  { note: 'A3', type: 'white', octave: 3, computerKey: 'n' },
  { note: 'A#3', type: 'black', octave: 3, computerKey: 'j' },
  { note: 'B3', type: 'white', octave: 3, computerKey: 'm' },

  { note: 'C4', type: 'white', octave: 4, computerKey: 'q' },
  { note: 'C#4', type: 'black', octave: 4, computerKey: '2' },
  { note: 'D4', type: 'white', octave: 4, computerKey: 'w' },
  { note: 'D#4', type: 'black', octave: 4, computerKey: '3' },
  { note: 'E4', type: 'white', octave: 4, computerKey: 'e' },
  { note: 'F4', type: 'white', octave: 4, computerKey: 'r' },
  { note: 'F#4', type: 'black', octave: 4, computerKey: '5' },
  { note: 'G4', type: 'white', octave: 4, computerKey: 't' },
  { note: 'G#4', type: 'black', octave: 4, computerKey: '6' },
  { note: 'A4', type: 'white', octave: 4, computerKey: 'y' },
  { note: 'A#4', type: 'black', octave: 4, computerKey: '7' },
  { note: 'B4', type: 'white', octave: 4, computerKey: 'u' },

  { note: 'C5', type: 'white', octave: 5, computerKey: 'i' },
  { note: 'C#5', type: 'black', octave: 5, computerKey: '9' },
  { note: 'D5', type: 'white', octave: 5, computerKey: 'o' },
  { note: 'D#5', type: 'black', octave: 5, computerKey: '0' },
  { note: 'E5', type: 'white', octave: 5, computerKey: 'p' },
  { note: 'F5', type: 'white', octave: 5 },
  { note: 'F#5', type: 'black', octave: 5 },
  { note: 'G5', type: 'white', octave: 5 },
  { note: 'G#5', type: 'black', octave: 5 },
  { note: 'A5', type: 'white', octave: 5 },
  { note: 'A#5', type: 'black', octave: 5 },
  { note: 'B5', type: 'white', octave: 5 },

  { note: 'C6', type: 'white', octave: 6 },
  { note: 'C#6', type: 'black', octave: 6 },
  { note: 'D6', type: 'white', octave: 6 },
  { note: 'D#6', type: 'black', octave: 6 },
  { note: 'E6', type: 'white', octave: 6 },
  { note: 'F6', type: 'white', octave: 6 },
  { note: 'F#6', type: 'black', octave: 6 },
  { note: 'G6', type: 'white', octave: 6 },
  { note: 'G#6', type: 'black', octave: 6 },
  { note: 'A6', type: 'white', octave: 6 },
  { note: 'A#6', type: 'black', octave: 6 },
  { note: 'B6', type: 'white', octave: 6 },

  { note: 'C7', type: 'white', octave: 7 },
  { note: 'C#7', type: 'black', octave: 7 },
  { note: 'D7', type: 'white', octave: 7 },
  { note: 'D#7', type: 'black', octave: 7 },
  { note: 'E7', type: 'white', octave: 7 },
  { note: 'F7', type: 'white', octave: 7 },
  { note: 'F#7', type: 'black', octave: 7 },
  { note: 'G7', type: 'white', octave: 7 },
  { note: 'G#7', type: 'black', octave: 7 },
  { note: 'A7', type: 'white', octave: 7 },
  { note: 'A#7', type: 'black', octave: 7 },
  { note: 'B7', type: 'white', octave: 7 },

  { note: 'C8', type: 'white', octave: 8 },
];

const ALL_WHITE_KEYS = ALL_PIANO_KEYS.filter((k) => k.type === 'white');

const CHORD_PRESETS = [
  { name: 'DO Magg (C)', notes: ['C4', 'E4', 'G4'] },
  { name: 'LAm (Am)', notes: ['A3', 'C4', 'E4'] },
  { name: 'FA Magg (F)', notes: ['F3', 'A3', 'C4'] },
  { name: 'SOL Magg (G)', notes: ['G3', 'B3', 'D4'] },
  { name: 'MIm (Em)', notes: ['E3', 'G3', 'B3'] },
  { name: 'REm (Dm)', notes: ['D3', 'F3', 'A3'] },
];

export type KeyboardLayoutType = 'compact' | 'balanced' | 'extended';

export const PianoView: React.FC<PianoViewProps> = ({ onBackToHome }) => {
  const [instrument, setInstrument] = useState<InstrumentType>('piano');
  const [sustain, setSustain] = useState<boolean>(false);
  const sustainRef = useRef<boolean>(sustain);
  sustainRef.current = sustain;

  // Master Volume Controls (0 to 100)
  const [volume, setVolume] = useState<number>(() => audioEngine.getVolume());
  const [prevVolume, setPrevVolume] = useState<number>(90);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setVolume(val);
    audioEngine.setVolume(val);
  };

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
      audioEngine.setVolume(0);
    } else {
      const restored = prevVolume > 0 ? prevVolume : 90;
      setVolume(restored);
      audioEngine.setVolume(restored);
    }
  };

  // Keyboard Layout
  const [keyboardLayout, setKeyboardLayout] = useState<KeyboardLayoutType>('balanced');

  const windowSize = useMemo(() => {
    switch (keyboardLayout) {
      case 'compact':
        return 14;
      case 'extended':
        return 28;
      case 'balanced':
      default:
        return 21;
    }
  }, [keyboardLayout]);

  const maxStartWhiteIdx = Math.max(0, ALL_WHITE_KEYS.length - windowSize);

  const [startWhiteKeyIdx, setStartWhiteKeyIdx] = useState<number>(() => {
    return Math.min(16, maxStartWhiteIdx);
  });

  const clampedStartWhiteIdx = Math.min(startWhiteKeyIdx, maxStartWhiteIdx);

  const GAMEPLAY_KEYS = useMemo(() => {
    const startWhite = ALL_WHITE_KEYS[clampedStartWhiteIdx] || ALL_WHITE_KEYS[0];
    const endWhiteIdx = Math.min(ALL_WHITE_KEYS.length - 1, clampedStartWhiteIdx + windowSize - 1);
    const endWhite = ALL_WHITE_KEYS[endWhiteIdx];

    const startIndex = ALL_PIANO_KEYS.findIndex((k) => k.note === startWhite.note);
    let endIndex = ALL_PIANO_KEYS.findIndex((k) => k.note === endWhite.note);

    if (endIndex < ALL_PIANO_KEYS.length - 1 && ALL_PIANO_KEYS[endIndex + 1].type === 'black') {
      endIndex += 1;
    }

    return ALL_PIANO_KEYS.slice(startIndex, endIndex + 1);
  }, [clampedStartWhiteIdx, windowSize]);

  const [octaveShift, setOctaveShift] = useState<number>(0);
  const [username, setUsername] = useState<string>(() => getUsername());

  const [activeSong, setActiveSong] = useState<InteractiveSong | null>(() => {
    const list = getPublishedSongs();
    return list.length > 0 ? list[0] : null;
  });

  // Waterfall OFF by default for pure piano or ON when requested
  const [showWaterfall, setShowWaterfall] = useState<boolean>(false);

  // Library & Song Creator Modal
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [newRecordedSongData, setNewRecordedSongData] = useState<{
    notes: { note: string; time: number; duration: number }[];
  } | null>(null);

  // Recording
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordStartTime, setRecordStartTime] = useState<number>(0);
  const recordedNotesRef = useRef<RecordedNote[]>([]);

  // Options Modal
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState<boolean>(false);

  // Gamification (Daily Streaks, XP, Levels)
  const [gamification, setGamification] = useState<UserGamificationState>(() => loadGamificationState());
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Web MIDI Physical Piano Connection
  const [midiConnected, setMidiConnected] = useState<boolean>(false);
  const [midiDeviceName, setMidiDeviceName] = useState<string>('');

  // Acoustic Microphone Pitch Detector
  const [isMicListening, setIsMicListening] = useState<boolean>(false);

  // Viral Challenge from URL (?challenge=...)
  const [challengeInvitation, setChallengeInvitation] = useState<ChallengeData | null>(() => parseChallengeFromUrl());

  // ALWAYS HORIZONTAL: Phone is rotated 90deg whenever held in portrait!
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight > window.innerWidth;
    }
    return false;
  });
  const [rotationAngle, setRotationAngle] = useState<number>(90); // 90° or 270°
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [windowDims, setWindowDims] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  }));

  // References for zero-latency direct DOM access
  const keyNodesMapRef = useRef<Map<string, HTMLElement>>(new Map());
  const currentlyPressedNotesRef = useRef<Set<string>>(new Set());
  const keyboardContainerRef = useRef<HTMLDivElement | null>(null);

  interface KeyboardGeometry {
    rect: DOMRect;
    blackKeysGeom: {
      note: string;
      left: number;
      right: number;
      top: number;
      bottom: number;
    }[];
    whiteKeysGeom: {
      note: string;
      left: number;
      right: number;
      top: number;
      bottom: number;
    }[];
  }
  const keyboardGeometryRef = useRef<KeyboardGeometry | null>(null);

  const isMouseDownRef = useRef<boolean>(false);
  const currentMouseNoteRef = useRef<string | null>(null);

  const getTransposedNote = useCallback((baseNote: string): string => {
    if (octaveShift === 0) return baseNote;
    const noteName = baseNote.slice(0, -1);
    const baseOctave = parseInt(baseNote.slice(-1));
    const newOctave = Math.max(1, Math.min(8, baseOctave + octaveShift));
    return `${noteName}${newOctave}`;
  }, [octaveShift]);

  const setKeyVisual = (note: string, active: boolean) => {
    const keyEl = keyNodesMapRef.current.get(note);
    if (keyEl) {
      if (active) keyEl.classList.add('key-pressed-active');
      else keyEl.classList.remove('key-pressed-active');
    }
  };

  const clearAllPressedVisuals = useCallback(() => {
    currentlyPressedNotesRef.current.forEach((note) => {
      setKeyVisual(note, false);
    });
    currentlyPressedNotesRef.current.clear();
    // Instant 0ms memory Map iteration (0 layout thrashing, 0 document.querySelectorAll)
    keyNodesMapRef.current.forEach((el) => el.classList.remove('key-pressed-active'));
  }, []);

  const triggerNoteHit = useCallback((baseNote: string) => {
    const note = getTransposedNote(baseNote);
    audioEngine.playNote(note, '8n', instrument);
    window.dispatchEvent(new CustomEvent('piano:noteplayed', { detail: { note } }));

    if (isRecording) {
      const now = (Date.now() - recordStartTime) / 1000;
      recordedNotesRef.current.push({ note, time: now, duration: 0.5 });
    }
  }, [instrument, isRecording, recordStartTime, getTransposedNote]);

  const handleCanvasNoteDown = useCallback((baseNote: string) => {
    triggerNoteHit(baseNote);
  }, [triggerNoteHit]);

  const handleCanvasNoteUp = useCallback((baseNote: string) => {
    if (!sustainRef.current) {
      const note = getTransposedNote(baseNote);
      audioEngine.releaseNote(note);
    }
  }, [getTransposedNote]);

  // Measured DOM Piano Geometry (100% pixel-perfect match between visual buttons & touch hit-testing)
  const refreshKeyboardGeometry = useCallback(() => {
    const container = keyboardContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const blackKeysGeom: { note: string; left: number; right: number; top: number; bottom: number }[] = [];
    const whiteKeysGeom: { note: string; left: number; right: number; top: number; bottom: number }[] = [];

    // Measure actual mounted DOM button rects directly from keyNodesMapRef
    GAMEPLAY_KEYS.forEach((k) => {
      const node = keyNodesMapRef.current.get(k.note);
      if (node) {
        const r = node.getBoundingClientRect();
        if (k.type === 'black') {
          blackKeysGeom.push({
            note: k.note,
            left: r.left,
            right: r.right,
            top: r.top,
            bottom: r.bottom,
          });
        } else {
          whiteKeysGeom.push({
            note: k.note,
            left: r.left,
            right: r.right,
            top: r.top,
            bottom: r.bottom,
          });
        }
      }
    });

    // Fallback mathematical geometry if DOM elements haven't mounted yet
    if (whiteKeysGeom.length === 0) {
      const whiteKeys = GAMEPLAY_KEYS.filter((k) => k.type === 'white').map((k) => k.note);
      const numWhiteKeys = Math.max(1, whiteKeys.length);
      const whiteWidth = rect.width / numWhiteKeys;
      const blackWidth = Math.max(20, whiteWidth * 0.65);
      const blackHeight = Math.min(rect.height * 0.58, 88);

      GAMEPLAY_KEYS.forEach((k, idx) => {
        if (k.type === 'black') {
          const whiteCountBefore = GAMEPLAY_KEYS.slice(0, idx).filter((x) => x.type === 'white').length;
          const center = rect.left + (whiteCountBefore / numWhiteKeys) * rect.width;
          blackKeysGeom.push({
            note: k.note,
            left: center - blackWidth / 2,
            right: center + blackWidth / 2,
            top: rect.top,
            bottom: rect.top + blackHeight,
          });
        } else {
          const whiteIdx = GAMEPLAY_KEYS.slice(0, idx).filter((x) => x.type === 'white').length;
          whiteKeysGeom.push({
            note: k.note,
            left: rect.left + whiteIdx * whiteWidth,
            right: rect.left + (whiteIdx + 1) * whiteWidth,
            top: rect.top,
            bottom: rect.bottom,
          });
        }
      });
    }

    // Sort white keys left to right for exact binary/sequential lookup
    whiteKeysGeom.sort((a, b) => a.left - b.left);

    keyboardGeometryRef.current = {
      rect,
      blackKeysGeom,
      whiteKeysGeom,
    };
  }, [GAMEPLAY_KEYS]);

  // Window resize & orientation handling
  useEffect(() => {
    const handleResize = () => {
      const isPort = window.innerHeight > window.innerWidth;
      setIsPortrait(isPort);
      setWindowDims({ width: window.innerWidth, height: window.innerHeight });
      refreshKeyboardGeometry();
    };

    const handleFsChange = () => {
      const doc = document as any;
      setIsFullscreen(Boolean(document.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement));
    };

    handleResize();
    handleFsChange();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    const t1 = setTimeout(refreshKeyboardGeometry, 50);
    const t2 = setTimeout(refreshKeyboardGeometry, 200);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [refreshKeyboardGeometry]);

  // VSYNC Ticker: keeps browser GPU & compositor clock at 120Hz/240Hz for maximum touch polling rate even when waterfall is OFF
  useEffect(() => {
    let animId: number;
    const heartbeat = () => {
      animId = requestAnimationFrame(heartbeat);
    };
    animId = requestAnimationFrame(heartbeat);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Re-sync geometry when gameplay keys or layout toggles change
  useEffect(() => {
    refreshKeyboardGeometry();
    const t1 = setTimeout(refreshKeyboardGeometry, 40);
    const t2 = setTimeout(refreshKeyboardGeometry, 150);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [GAMEPLAY_KEYS, showWaterfall, activeSong, refreshKeyboardGeometry]);

  // Instantaneous pixel-exact note detection (0 mismatch between DOM buttons and touch input)
  const findNoteAtPoint = useCallback((x: number, y: number): string | null => {
    let geom = keyboardGeometryRef.current;
    if (!geom || geom.whiteKeysGeom.length === 0) {
      refreshKeyboardGeometry();
      geom = keyboardGeometryRef.current;
      if (!geom || geom.whiteKeysGeom.length === 0) return null;
    }

    const { rect, blackKeysGeom, whiteKeysGeom } = geom;

    // Check vertical bounds with generous tolerance
    if (y < rect.top - 50 || y > rect.bottom + 80) {
      return null;
    }

    // 1. Black Keys check FIRST (exact pixel bounding box of DOM buttons)
    for (let i = 0; i < blackKeysGeom.length; i++) {
      const bk = blackKeysGeom[i];
      if (x >= bk.left - 3 && x <= bk.right + 3 && y >= bk.top - 20 && y <= bk.bottom + 6) {
        return bk.note;
      }
    }

    // 2. White Keys check (exact pixel bounding box of DOM buttons)
    for (let i = 0; i < whiteKeysGeom.length; i++) {
      const wk = whiteKeysGeom[i];
      const minX = i === 0 ? wk.left - 35 : wk.left;
      const maxX = i === whiteKeysGeom.length - 1 ? wk.right + 35 : wk.right;
      if (x >= minX && x <= maxX) {
        return wk.note;
      }
    }

    return null;
  }, [refreshKeyboardGeometry]);

  const processTouchCoordinates = useCallback((touches: TouchList) => {
    if (touches.length === 0) {
      clearAllPressedVisuals();
      return;
    }

    const nextNotes = new Set<string>();
    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i];
      const note = findNoteAtPoint(touch.clientX, touch.clientY);
      if (note) {
        nextNotes.add(note);
      }
    }

    // Fast-path: if touched keys have not changed, exit immediately with zero CPU work!
    if (nextNotes.size === currentlyPressedNotesRef.current.size) {
      let identical = true;
      for (const n of nextNotes) {
        if (!currentlyPressedNotesRef.current.has(n)) {
          identical = false;
          break;
        }
      }
      if (identical) return;
    }

    // Turn off notes no longer touched
    currentlyPressedNotesRef.current.forEach((note) => {
      if (!nextNotes.has(note)) {
        if (!sustainRef.current) {
          setKeyVisual(note, false);
        }
      }
    });

    // Turn on newly touched notes
    nextNotes.forEach((note) => {
      if (!currentlyPressedNotesRef.current.has(note)) {
        setKeyVisual(note, true);
        triggerNoteHit(note);
      }
    });

    currentlyPressedNotesRef.current = nextNotes;
  }, [findNoteAtPoint, clearAllPressedVisuals, triggerNoteHit]);

  // Native non-passive touch event listeners for true 0ms mobile response
  useEffect(() => {
    const container = keyboardContainerRef.current;
    if (!container) return;

    const onNativeTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (!keyboardGeometryRef.current) {
        refreshKeyboardGeometry();
      }
      processTouchCoordinates(e.touches);
    };

    const onNativeTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      processTouchCoordinates(e.touches);
    };

    const onNativeTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 0) {
        clearAllPressedVisuals();
      } else {
        processTouchCoordinates(e.touches);
      }
    };

    container.addEventListener('touchstart', onNativeTouchStart, { passive: false });
    container.addEventListener('touchmove', onNativeTouchMove, { passive: false });
    container.addEventListener('touchend', onNativeTouchEnd, { passive: false });
    container.addEventListener('touchcancel', onNativeTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', onNativeTouchStart);
      container.removeEventListener('touchmove', onNativeTouchMove);
      container.removeEventListener('touchend', onNativeTouchEnd);
      container.removeEventListener('touchcancel', onNativeTouchEnd);
    };
  }, [processTouchCoordinates, clearAllPressedVisuals, refreshKeyboardGeometry]);

  // Ultra-responsive Mouse Glissando Handlers (Desktop & Preview)
  const handleContainerMouseDown = (e: React.MouseEvent) => {
    refreshKeyboardGeometry();
    isMouseDownRef.current = true;
    const note = findNoteAtPoint(e.clientX, e.clientY);
    if (note) {
      currentMouseNoteRef.current = note;
      setKeyVisual(note, true);
      currentlyPressedNotesRef.current.add(note);
      triggerNoteHit(note);
    }
  };

  const handleMouseDownKey = (baseNote: string) => {
    isMouseDownRef.current = true;
    currentMouseNoteRef.current = baseNote;
    setKeyVisual(baseNote, true);
    currentlyPressedNotesRef.current.add(baseNote);
    triggerNoteHit(baseNote);
  };

  const handleMouseEnterKey = (baseNote: string) => {
    if (isMouseDownRef.current && currentMouseNoteRef.current !== baseNote) {
      const oldNote = currentMouseNoteRef.current;
      currentMouseNoteRef.current = baseNote;

      if (oldNote && !sustainRef.current) {
        setKeyVisual(oldNote, false);
        currentlyPressedNotesRef.current.delete(oldNote);
      }

      setKeyVisual(baseNote, true);
      currentlyPressedNotesRef.current.add(baseNote);
      triggerNoteHit(baseNote);
    }
  };

  const handleMouseLeaveKey = (baseNote: string) => {
    if (isMouseDownRef.current && currentMouseNoteRef.current === baseNote) {
      if (!sustainRef.current) {
        setKeyVisual(baseNote, false);
      }
      currentlyPressedNotesRef.current.delete(baseNote);
      currentMouseNoteRef.current = null;
    }
  };

  // Window-level mouse tracking for silky-smooth drag glissando across keys
  useEffect(() => {
    const onWindowMouseMove = (e: MouseEvent) => {
      if (!isMouseDownRef.current) return;
      const note = findNoteAtPoint(e.clientX, e.clientY);
      if (note && note !== currentMouseNoteRef.current) {
        const oldNote = currentMouseNoteRef.current;
        currentMouseNoteRef.current = note;
        if (oldNote && !sustainRef.current) {
          setKeyVisual(oldNote, false);
          currentlyPressedNotesRef.current.delete(oldNote);
        }
        setKeyVisual(note, true);
        currentlyPressedNotesRef.current.add(note);
        triggerNoteHit(note);
      } else if (!note && currentMouseNoteRef.current) {
        if (!sustainRef.current) {
          setKeyVisual(currentMouseNoteRef.current, false);
        }
        currentlyPressedNotesRef.current.delete(currentMouseNoteRef.current);
        currentMouseNoteRef.current = null;
      }
    };

    const onWindowMouseUp = () => {
      if (isMouseDownRef.current) {
        isMouseDownRef.current = false;
        if (currentMouseNoteRef.current) {
          if (!sustainRef.current) {
            setKeyVisual(currentMouseNoteRef.current, false);
          }
          currentlyPressedNotesRef.current.delete(currentMouseNoteRef.current);
          currentMouseNoteRef.current = null;
        }
      }
    };

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, [findNoteAtPoint, triggerNoteHit]);

  // Web MIDI and Gamification Synchronization
  useEffect(() => {
    midiEngine.init();
    const unsubMidi = midiEngine.subscribe((status) => {
      setMidiConnected(status.isConnected);
      setMidiDeviceName(status.deviceNames[0] || '');
    });

    const handleGamification = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) setGamification(detail);
    };
    window.addEventListener('piano:gamificationupdate', handleGamification);

    const handleMidiDown = (e: Event) => {
      const custom = e as CustomEvent<{ note: string; velocity: number }>;
      if (custom.detail?.note) {
        setKeyVisual(custom.detail.note, true);
        currentlyPressedNotesRef.current.add(custom.detail.note);
        triggerNoteHit(custom.detail.note);
      }
    };

    const handleMidiUp = (e: Event) => {
      const custom = e as CustomEvent<{ note: string }>;
      if (custom.detail?.note) {
        if (!sustainRef.current) {
          setKeyVisual(custom.detail.note, false);
        }
        currentlyPressedNotesRef.current.delete(custom.detail.note);
      }
    };

    window.addEventListener('piano:midinotedown', handleMidiDown);
    window.addEventListener('piano:midinoteup', handleMidiUp);

    return () => {
      unsubMidi();
      window.removeEventListener('piano:gamificationupdate', handleGamification);
      window.removeEventListener('piano:midinotedown', handleMidiDown);
      window.removeEventListener('piano:midinoteup', handleMidiUp);
    };
  }, [triggerNoteHit]);

  // Toggle Acoustic Microphone Pitch Detection
  const toggleMicrophonePitch = async () => {
    if (isMicListening) {
      pitchDetector.stop();
      setIsMicListening(false);
    } else {
      try {
        const ok = await pitchDetector.start((detectedNote) => {
          setKeyVisual(detectedNote, true);
          // Play audio and trigger game event
          triggerNoteHit(detectedNote);
          setTimeout(() => {
            if (!sustainRef.current) setKeyVisual(detectedNote, false);
          }, 280);
        });
        setIsMicListening(ok);
        if (!ok) {
          alert("Permesso microfono non concesso o non supportato dal browser. Assicurati di aver consentito l'accesso al microfono nelle impostazioni del sito/browser.");
        }
      } catch (err: any) {
        setIsMicListening(false);
        alert(`Errore microfono: ${err?.message || "Impossibile accedere al microfono."}`);
      }
    }
  };

  // Accept Viral Challenge from URL
  const acceptChallenge = () => {
    if (!challengeInvitation) return;
    const allSongs = getPublishedSongs();
    const found = allSongs.find(
      (s) => s.id === challengeInvitation.songId || s.title.toLowerCase() === challengeInvitation.songTitle.toLowerCase()
    );
    if (found) {
      setActiveSong(found);
      setShowWaterfall(true);
    }
    setChallengeInvitation(null);
  };

  const toggleRecording = () => {
    if (!isRecording) {
      recordedNotesRef.current = [];
      setRecordStartTime(Date.now());
      setIsRecording(true);
    } else {
      setIsRecording(false);
      const notes = recordedNotesRef.current;
      if (notes.length > 0) {
        setNewRecordedSongData({
          notes: notes.map((n) => ({
            note: n.note,
            time: Math.round(n.time * 100) / 100,
            duration: n.duration,
          })),
        });
        setIsLibraryOpen(true);
      }
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor) {
        const plugins = (window as any).Capacitor.Plugins;
        if (plugins && plugins.StatusBar) {
          try {
            await plugins.StatusBar.hide();
          } catch (e) {}
        }
      }
      const doc = document as any;
      const docEl = document.documentElement as any;
      const isFs = Boolean(document.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement);
      if (!isFs) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen({ navigationUI: 'hide' } as any);
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      }
    } catch (e) {
      console.warn('Fullscreen toggle:', e);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      const plugins = (window as any).Capacitor.Plugins;
      if (plugins && plugins.StatusBar) {
        try {
          plugins.StatusBar.hide();
          plugins.StatusBar.setOverlaysWebView({ overlay: true });
        } catch (e) {}
      }
    }
  }, []);

  // ZERO-LATENCY NATIVE LAYOUT:
  // When in landscape (physical phone or Android native locked app), do NOT apply any transform: translate(-50%, -50%) rotate(0deg).
  // Applying CSS transform creates an offscreen GPU compositing layer that delays touch hit-testing in Android WebViews.
  // ALWAYS NATIVE FULLSCREEN LANDSCAPE:
  // Container fills 100% of physical viewport (100vw x 100vh) without any transform rotation layer.
  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100dvh',
    zIndex: 50,
    boxSizing: 'border-box',
    overflow: 'hidden',
    touchAction: 'none',
  };

  return (
    <div
      style={containerStyle}
      className="bg-slate-950 flex flex-col h-full w-full overflow-hidden select-none touch-none p-0 m-0"
    >
      {/* ULTRA-COMPACT TOP BAR (FREED UP SPACE, ZERO OVERLAP) */}
      <div
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 2px)',
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 6px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 6px)',
        }}
        className="h-9 min-h-[36px] max-h-[38px] bg-slate-900/95 border-b border-slate-800/80 px-1 sm:px-2 flex items-center justify-between flex-nowrap overflow-x-auto scrollbar-none shrink-0 z-20 text-[10px] sm:text-[11px]"
      >
        {/* Left: Home & User & Library & Falling Notes Toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={onBackToHome}
            className="p-1 sm:px-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 rounded-md flex items-center gap-1 transition-colors"
            title="Torna al Menu"
          >
            <Home className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline font-bold">Menu</span>
          </button>

          {/* User badge */}
          <button
            onClick={() => setIsLibraryOpen(true)}
            className="flex items-center gap-1 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 px-1.5 py-0.5 rounded-md text-slate-200 transition-colors"
            title="Profilo Utente"
          >
            <User className="w-3 h-3 text-amber-400" />
            <span className="font-semibold text-white max-w-[60px] sm:max-w-[90px] truncate">{username}</span>
          </button>

          {/* Library Button */}
          <button
            onClick={() => setIsLibraryOpen(true)}
            className="px-1.5 sm:px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-md flex items-center gap-1 shadow-sm transition-all active:scale-95"
            title="Apri spartiti"
          >
            <BookOpen className="w-3 h-3" />
            <span className="hidden xs:inline">Spartiti</span>
          </button>

          {/* Streak Badge */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded-md font-bold text-amber-300 transition-colors"
            title={`Streak: ${gamification.currentStreak}d`}
          >
            <Flame className="w-3 h-3 text-orange-400 fill-orange-400" />
            <span>{gamification.currentStreak}d</span>
          </button>

          {/* Acoustic Pitch Mic Toggle */}
          <button
            onClick={toggleMicrophonePitch}
            className={`px-1.5 py-0.5 font-bold rounded-md flex items-center gap-1 transition-all shadow-sm ${
              isMicListening
                ? 'bg-emerald-400 text-slate-950 animate-pulse ring-1 ring-emerald-300'
                : 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 hover:bg-emerald-900 hover:text-white'
            }`}
            title={isMicListening ? "Mic Attivo" : "Attiva microfono"}
          >
            <Mic className={`w-3 h-3 ${isMicListening ? 'text-slate-950' : 'text-emerald-400'}`} />
            <span className="hidden sm:inline">{isMicListening ? 'Mic Attivo' : 'Mic Reale'}</span>
          </button>

          {/* Toggle Falling Notes */}
          {activeSong && (
            <button
              onClick={() => setShowWaterfall(!showWaterfall)}
              className={`px-1.5 py-0.5 font-semibold rounded-md flex items-center gap-1 transition-colors ${
                showWaterfall
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Mostra / Nascondi note a cascata"
            >
              <Sparkles className="w-3 h-3" />
              <span>{showWaterfall ? 'ON' : 'OFF'}</span>
            </button>
          )}
        </div>

        {/* Center: Volume Selector & Keyboard Size Pills */}
        <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-[11px]">
          {/* VOLUME SLIDER CONTROL */}
          <div className="flex items-center gap-1 bg-slate-850 border border-slate-800 px-1.5 py-0.5 rounded-md">
            <button
              onClick={toggleMute}
              className="text-amber-400 hover:text-amber-300 transition-colors"
              title={volume === 0 ? 'Riattiva Audio' : 'Disattiva Audio'}
            >
              {volume === 0 ? (
                <VolumeX className="w-3 h-3 text-red-400" />
              ) : volume < 50 ? (
                <Volume1 className="w-3 h-3" />
              ) : (
                <Volume2 className="w-3 h-3" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="w-10 sm:w-16 md:w-20 h-1 accent-amber-500 bg-slate-700 rounded cursor-pointer"
              title={`Volume Audio: ${volume}%`}
            />
            <span className="font-mono font-bold text-amber-400 text-[9px] sm:text-[10px] min-w-[20px]">
              {volume}%
            </span>
          </div>

          {/* Keyboard Size Pills */}
          <div className="flex items-center gap-0.5 bg-slate-850 rounded-md p-0.5 border border-slate-800">
            {(['compact', 'balanced', 'extended'] as KeyboardLayoutType[]).map((layout) => (
              <button
                key={layout}
                onClick={() => setKeyboardLayout(layout)}
                className={`px-1 py-0.5 text-[9px] sm:text-[10px] font-bold rounded capitalize transition-all ${
                  keyboardLayout === layout
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`Tasti a schermo: ${layout === 'compact' ? '14 (Grandi)' : layout === 'balanced' ? '21 (Standard)' : '28 (Tutti)'}`}
              >
                {layout === 'compact' ? '14' : layout === 'balanced' ? '21' : '28'}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Quick Record, Sustain & Options Menu */}
        <div className="flex items-center gap-1">
          {/* Quick 180° Flip button when rotated on vertical phone */}
          {isPortrait && (
            <button
              onClick={() => setRotationAngle((prev) => (prev === 90 ? 270 : 90))}
              className="p-1 text-slate-400 hover:text-amber-400 bg-slate-800 rounded-md transition-colors"
              title="Ruota 180°"
            >
              <RotateCw className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={toggleRecording}
            className={`px-1.5 py-0.5 font-bold rounded-md flex items-center gap-1 transition-colors ${
              isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
            title={isRecording ? 'Termina registrazione' : 'Registra'}
          >
            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-white' : 'bg-red-500'}`} />
            <span className="hidden sm:inline">{isRecording ? 'Stop' : 'Rec'}</span>
          </button>

          <button
            onClick={() => {
              const next = !sustain;
              setSustain(next);
              audioEngine.setSustain(next);
            }}
            className={`px-1.5 py-0.5 font-semibold rounded-md border transition-colors ${
              sustain
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Sustain (pedale)"
          >
            Pedale
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-md transition-colors"
            title={isFullscreen ? 'Esci da Schermo Intero' : 'Schermo Intero (Nascondi Barre Sistema)'}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsOptionsModalOpen(true)}
            className="p-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-md transition-all"
            title="Tutte le opzioni (...)"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SYNTHESIA FALLING NOTES WATERFALL */}
      {showWaterfall && activeSong ? (
        <div className="flex-1 w-full flex flex-col min-h-0 bg-slate-950 overflow-hidden">
          <FallingNotesWaterfall
            song={activeSong}
            keys={GAMEPLAY_KEYS}
            getTransposedNote={getTransposedNote}
            onClose={() => setShowWaterfall(false)}
          />
        </div>
      ) : (
        /* When waterfall is hidden, compact quick chords strip & dark space above keys */
        <div className="flex-1 w-full flex flex-col items-center justify-center bg-slate-950 border-b border-slate-900 overflow-hidden px-2 py-1 gap-1">
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Accordi Rapidi:</span>
            {CHORD_PRESETS.map((chord) => (
              <button
                key={chord.name}
                onClick={() => audioEngine.playChord(chord.notes.map((n) => getTransposedNote(n)), '2n', instrument)}
                className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 hover:text-amber-400 text-[11px] font-semibold"
              >
                {chord.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FIXED 88-KEY MINI-MAP KEYBOARD (Mostra sempre la posizione su tutti gli 88 tasti) */}
      <div className="w-full bg-slate-900/95 border-t border-b border-slate-800/80 px-1 sm:px-2 py-0.5 flex items-center justify-between gap-1 sm:gap-2 shrink-0 z-20">
        {/* Quick Shift -1 Octave */}
        <button
          onClick={() => setStartWhiteKeyIdx((prev) => Math.max(0, prev - 7))}
          disabled={clampedStartWhiteIdx === 0}
          className="p-1 h-8 sm:h-9 w-7 sm:w-8 flex items-center justify-center bg-slate-800 hover:bg-slate-750 text-slate-300 disabled:opacity-25 rounded shrink-0 transition-colors"
          title="Sposta indietro di 1 Ottava"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-amber-400" />
        </button>

        {/* Interactive 88-Key Mini Piano with Falling Notes Waterfall */}
        <MiniMapKeyboard
          allWhiteKeys={ALL_WHITE_KEYS}
          allPianoKeys={ALL_PIANO_KEYS}
          startWhiteKeyIdx={clampedStartWhiteIdx}
          windowSize={windowSize}
          maxStartWhiteIdx={maxStartWhiteIdx}
          onSelectStartWhiteIdx={setStartWhiteKeyIdx}
          currentlyPressedNotesRef={currentlyPressedNotesRef}
          showWaterfall={Boolean(showWaterfall && activeSong)}
        />

        {/* Quick Shift +1 Octave */}
        <button
          onClick={() => setStartWhiteKeyIdx((prev) => Math.min(maxStartWhiteIdx, prev + 7))}
          disabled={clampedStartWhiteIdx >= maxStartWhiteIdx}
          className="p-1 h-8 sm:h-9 w-7 sm:w-8 flex items-center justify-center bg-slate-800 hover:bg-slate-750 text-slate-300 disabled:opacity-25 rounded shrink-0 transition-colors"
          title="Sposta avanti di 1 Ottava"
        >
          <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
        </button>
      </div>

      {/* Gold Divider Line */}
      <div className="w-full h-1 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.95)] z-10 shrink-0" />

      {/* GPU CANVAS PIANO KEYBOARD ENGINE */}
      <CanvasPiano
        keys={GAMEPLAY_KEYS}
        getTransposedNote={getTransposedNote}
        currentlyPressedNotesRef={currentlyPressedNotesRef}
        onNoteDown={handleCanvasNoteDown}
        onNoteUp={handleCanvasNoteUp}
        sustain={sustain}
        showWaterfall={Boolean(showWaterfall && activeSong)}
      />

      {/* OPTIONS MODAL */}
      {isOptionsModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-850 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Opzioni & Personalizzazione</h3>
              </div>
              <button
                onClick={() => setIsOptionsModalOpen(false)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-5 overflow-y-auto max-h-[75vh] touch-pan-y text-xs">
              {/* Volume Master */}
              <div>
                <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-2">
                  1. Volume Master ({volume}%)
                </label>
                <div className="flex items-center gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                  <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="flex-1 accent-amber-500 bg-slate-700 h-2 rounded cursor-pointer"
                  />
                  <span className="font-mono font-bold text-amber-400 w-10 text-right">{volume}%</span>
                </div>
              </div>

              {/* Dimensione Tasti */}
              <div>
                <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-2">
                  2. Dimensione Tasti
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'compact', label: 'Compatta', keys: '14 Tasti Bianchi', desc: 'Tasti ampi e spaziosi' },
                    { id: 'balanced', label: 'Bilanciata', keys: '21 Tasti Bianchi', desc: 'Standard a 2 mani' },
                    { id: 'extended', label: 'Estesa', keys: '28 Tasti Bianchi', desc: 'Ampia portata' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setKeyboardLayout(item.id as KeyboardLayoutType)}
                      className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
                        keyboardLayout === item.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                          : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>{item.label}</span>
                        {keyboardLayout === item.id && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <div className="text-[10px] font-semibold text-amber-400/90 mt-1">{item.keys}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Timbro Strumento */}
              <div>
                <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-2">
                  3. Timbro Strumento
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'piano', label: 'Pianoforte Gran Coda' },
                    { id: 'guitar', label: 'Chitarra Acustica' },
                    { id: 'strings', label: 'Archi Orchestra' },
                    { id: 'bass', label: 'Basso Elettrico' },
                  ].map((inst) => (
                    <button
                      key={inst.id}
                      onClick={() => setInstrument(inst.id as InstrumentType)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        instrument === inst.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {inst.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trasposizione */}
              <div>
                <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-2">
                  4. Trasposizione Ottave
                </label>
                <div className="flex items-center gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-300">Sposta Ottava:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setOctaveShift((prev) => Math.max(-2, prev - 1))}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold"
                    >
                      -1
                    </button>
                    <span className="font-mono font-bold text-amber-400 px-2">
                      {octaveShift > 0 ? `+${octaveShift}` : octaveShift}
                    </span>
                    <button
                      onClick={() => setOctaveShift((prev) => Math.min(2, prev + 1))}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold"
                    >
                      +1
                    </button>
                  </div>
                </div>
              </div>

              {/* Orientamento Sempre Orizzontale */}
              <div className="pt-2 border-t border-slate-800">
                <div className="p-3 bg-slate-800/50 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>Vista Orizzontale Sempre Attiva</span>
                      <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                        ATTIVA
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      La tastiera si presenta sempre orizzontale a schermo intero per consentire l&apos;uso a due mani.
                    </div>
                  </div>
                  {isPortrait && (
                    <button
                      onClick={() => setRotationAngle((prev) => (prev === 90 ? 270 : 90))}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-amber-400 border border-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>Inverti 180°</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-850 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsOptionsModalOpen(false)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAMIFICATION & PROFILE MODAL */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-850 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Profilo Maestro & Obiettivi</h3>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs overflow-y-auto max-h-[75vh] touch-pan-y">
              {/* Level & XP Card */}
              <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-amber-400 uppercase font-black tracking-wider">Livello Attuale</div>
                  <div className="text-base font-extrabold text-white mt-0.5">{gamification.levelTitle}</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {gamification.xp} / {gamification.nextLevelXp} XP per il prossimo livello
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex flex-col items-center justify-center text-amber-300 font-black">
                  <span className="text-[10px]">LIV.</span>
                  <span className="text-sm">{gamification.level}</span>
                </div>
              </div>

              {/* Daily Streak & Songs stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-orange-400 font-extrabold text-lg">
                    <Flame className="w-5 h-5 fill-orange-400" />
                    <span>{gamification.currentStreak}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Giorni Consecutivi (Streak)</div>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 text-center">
                  <div className="text-emerald-400 font-extrabold text-lg">
                    {gamification.songsCompleted}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Brani Completati</div>
                </div>
              </div>

              {/* Badges / Medals */}
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Medaglie Sbloccate</div>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_BADGES.map((b) => {
                    const isUnlocked = gamification.unlockedBadges.includes(b.id);
                    return (
                      <div
                        key={b.id}
                        className={`p-2 rounded-xl border flex items-center gap-2 ${
                          isUnlocked
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            : 'bg-slate-800/30 border-slate-800 text-slate-500 opacity-60'
                        }`}
                      >
                        <span className="text-xl">{b.icon}</span>
                        <div className="min-w-0">
                          <div className="font-bold text-[11px] truncate">{b.title}</div>
                          <div className="text-[9px] text-slate-400 truncate">{b.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-850 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHALLENGE INVITATION BANNER (Arrivo da link sfide) */}
      {challengeInvitation && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 w-auto max-w-sm px-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 border border-yellow-300">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-950/20 flex items-center justify-center shrink-0">
                <Swords className="w-4 h-4 text-slate-950" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-wider opacity-80">Sfida Ricevuta!</div>
                <div className="font-black text-xs truncate">
                  {challengeInvitation.challengerName} ti sfida su &quot;{challengeInvitation.songTitle}&quot;
                </div>
                <div className="text-[10px] font-bold">Punteggio da battere: {challengeInvitation.targetScore} pt</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={acceptChallenge}
                className="px-2.5 py-1 bg-slate-950 hover:bg-slate-900 text-amber-400 font-black text-xs rounded-lg shadow-sm"
              >
                Accetta
              </button>
              <button
                onClick={() => setChallengeInvitation(null)}
                className="p-1 hover:bg-black/10 rounded-lg text-slate-950"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SONG LIBRARY MODAL */}
      <SongLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => {
          setIsLibraryOpen(false);
          setNewRecordedSongData(null);
        }}
        onSelectSongToPlay={(song: InteractiveSong) => {
          setActiveSong(song);
          setShowWaterfall(true);
          setIsLibraryOpen(false);
          setNewRecordedSongData(null);
        }}
        currentUsername={username}
        onUsernameChange={setUsername}
        newRecordedSongData={newRecordedSongData}
        onClearRecordedData={() => setNewRecordedSongData(null)}
      />
    </div>
  );
};
