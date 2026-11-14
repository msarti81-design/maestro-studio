import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { audioEngine } from '../utils/audioEngine';
import { InstrumentType, RecordedNote, InteractiveSong, NoteNotationFormat, SoundProfile, StudioTheme, CenterStageAnimationId } from '../types';
import {
  CENTER_STAGE_ANIMATIONS,
  CenterStageAnimator,
  getCenterAnimationMeta,
  loadCenterAnimation,
  saveCenterAnimation,
} from '../utils/centerStageAnimations';
import {
  WaterfallFxMode,
  WATERFALL_FX_ITEMS,
  STUDIO_THEME_OPTIONS,
  loadWaterfallFx,
  saveWaterfallFx,
  getWaterfallFxMeta,
} from '../utils/waterfallFx';
import { useBackHandler } from '../utils/backNavigation';
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
  Copy,
  MessageCircle,
  Timer,
  Palette,
  Eye,
  Layers,
  Hand,
  Play,
  Square,
  RotateCcw,
  SkipForward,
  SkipBack,
  Music,
} from 'lucide-react';
import { SongLibraryModal } from './SongLibraryModal';
import { MetronomeModal } from './MetronomeModal';
import { FallingNotesWaterfall } from './FallingNotesWaterfall';
import { MiniMapKeyboard } from './MiniMapKeyboard';
import { CanvasPiano } from './CanvasPiano';
import { getPublishedSongs } from '../utils/songStorage';
import { getUsername } from '../utils/songStorage';
import { midiEngine, noteNameToMidiNumber } from '../utils/midiEngine';
import { pitchDetector } from '../utils/pitchDetector';
import { loadGamificationState, UserGamificationState, AVAILABLE_BADGES } from '../utils/gamification';
import { parseChallengeFromUrl, ChallengeData } from '../utils/challengeShare';
import { ScaleExercise, FINGER_NAMES } from '../data/scaleExercises';
import { ChordDetectorModal } from './ChordDetectorModal';
import { identifyChord, IdentifiedChord } from '../utils/chordDetector';

import { ActiveSocialSession, SocialSessionResults } from '../types';
import { normalizeRoomCode } from './SocialView';
import { getAppWebSocketUrl, getAppApiUrl, getOrCreateClientId, getPublicShareBaseUrl } from '../utils/networkHelper';

interface PianoViewProps {
  onBackToHome: () => void;
  socialSession?: ActiveSocialSession | null;
  onExitToSocial?: (results: SocialSessionResults) => void;
  studioTheme?: StudioTheme;
  onThemeChange?: (theme: StudioTheme) => void;
  onOpenScalesModal?: () => void;
  activeScaleExercise?: ScaleExercise | null;
  onCloseScaleExercise?: () => void;
  onNavigateToView?: (view: any) => void;
  selectedSongToPlay?: InteractiveSong | null;
  onClearSelectedSong?: () => void;
  earTrainingStandalone?: boolean;
}

import { ALL_PIANO_KEYS, ALL_WHITE_KEYS } from '../data/pianoKeys';

const WEBRTC_ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:openrelay.metered.ca:80' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turns:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

const CHORD_PRESETS = [
  { name: 'DO Magg (C)', notes: ['C4', 'E4', 'G4'] },
  { name: 'LAm (Am)', notes: ['A3', 'C4', 'E4'] },
  { name: 'FA Magg (F)', notes: ['F3', 'A3', 'C4'] },
  { name: 'SOL Magg (G)', notes: ['G3', 'B3', 'D4'] },
  { name: 'MIm (Em)', notes: ['E3', 'G3', 'B3'] },
  { name: 'REm (Dm)', notes: ['D3', 'F3', 'A3'] },
];

export type KeyboardLayoutType = 'compact' | 'balanced' | 'extended';

export const PianoView: React.FC<PianoViewProps> = ({
  onBackToHome,
  socialSession,
  onExitToSocial,
  studioTheme = 'midnight',
  onThemeChange,
  onOpenScalesModal,
  activeScaleExercise,
  onCloseScaleExercise,
  onNavigateToView,
  selectedSongToPlay,
  onClearSelectedSong,
  earTrainingStandalone = false,
}) => {
  const sessionStartTimeRef = useRef<number>(Date.now());
  const notesCountRef = useRef<number>(0);
  const maxComboRef = useRef<number>(0);

  const handleExitToSocialResults = () => {
    if (onExitToSocial && socialSession) {
      const duration = Math.max(5, Math.floor((Date.now() - sessionStartTimeRef.current) / 1000));
      const results: SocialSessionResults = {
        mode: socialSession.mode,
        roomId: socialSession.roomId,
        songTitle: activeSong?.title || 'Esecuzione Libera',
        score: Math.max(100, notesCountRef.current * 15),
        comboMax: maxComboRef.current || 3,
        accuracy: 95,
        notesPlayed: notesCountRef.current || 12,
        durationSeconds: duration,
      };
      onExitToSocial(results);
    } else {
      onBackToHome();
    }
  };

  const [instrument, setInstrument] = useState<InstrumentType>('piano');
  const [sustain, setSustain] = useState<boolean>(false);
  const sustainRef = useRef<boolean>(sustain);
  sustainRef.current = sustain;

  // Piano View Metronome State
  const [isPianoMetronomeActive, setIsPianoMetronomeActive] = useState<boolean>(false);
  const [pianoBpm, setPianoBpm] = useState<number>(100);
  const [isMetronomeModalOpen, setIsMetronomeModalOpen] = useState<boolean>(false);
  const pianoMetronomeTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPianoMetronomeActive) {
      audioEngine.init().catch(() => {});
      let beat = 0;
      const intervalMs = (60 / pianoBpm) * 1000;

      audioEngine.playMetronomeClick(beat === 0);
      beat = (beat + 1) % 4;

      pianoMetronomeTimerRef.current = setInterval(() => {
        audioEngine.playMetronomeClick(beat === 0);
        beat = (beat + 1) % 4;
      }, intervalMs);
    } else {
      if (pianoMetronomeTimerRef.current) {
        clearInterval(pianoMetronomeTimerRef.current);
        pianoMetronomeTimerRef.current = null;
      }
    }

    return () => {
      if (pianoMetronomeTimerRef.current) {
        clearInterval(pianoMetronomeTimerRef.current);
        pianoMetronomeTimerRef.current = null;
      }
    };
  }, [isPianoMetronomeActive, pianoBpm]);

  // Pre-warm and initialize professional audio engine immediately on PianoView mount
  useEffect(() => {
    audioEngine.init().catch(() => {});
  }, []);

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

  // Keyboard Layout & Viral Reel Central Zoom (10 white keys)
  const [keyboardLayout, setKeyboardLayout] = useState<KeyboardLayoutType>('balanced');
  const [isReelZoomed, setIsReelZoomed] = useState<boolean>(false);

  const windowSize = useMemo(() => {
    if (isReelZoomed) return 10;
    switch (keyboardLayout) {
      case 'compact':
        return 14;
      case 'extended':
        return 28;
      case 'balanced':
      default:
        return 21;
    }
  }, [keyboardLayout, isReelZoomed]);

  const maxStartWhiteIdx = Math.max(0, ALL_WHITE_KEYS.length - windowSize);

  // Exact helper to map any musical note (with or without accidentals) to its corresponding white key index (0 to 51)
  const getWhiteKeyIndexForNote = useCallback((note: string): number => {
    if (!note) return -1;
    const match = note.match(/^([A-G])([#b]?)(-?\d+)$/i);
    if (!match) return -1;
    const targetWhite = `${match[1].toUpperCase()}${match[3]}`;
    return ALL_WHITE_KEYS.findIndex((k) => k.note === targetWhite);
  }, []);

  const [startWhiteKeyIdx, setStartWhiteKeyIdx] = useState<number>(() => {
    if (activeScaleExercise && activeScaleExercise.notes.length > 0) {
      const indices = activeScaleExercise.notes
        .map((n) => {
          const match = n.match(/^([A-G])([#b]?)(-?\d+)$/i);
          if (!match) return -1;
          const targetWhite = `${match[1].toUpperCase()}${match[3]}`;
          return ALL_WHITE_KEYS.findIndex((k) => k.note === targetWhite);
        })
        .filter((idx) => idx !== -1);
      if (indices.length > 0) {
        const minIdx = Math.min(...indices);
        const maxIdx = Math.max(...indices);
        const center = (minIdx + maxIdx) / 2;
        return Math.max(0, Math.min(ALL_WHITE_KEYS.length - 21, Math.round(center - 21 / 2)));
      }
    }
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
  const [isAppShareCopied, setIsAppShareCopied] = useState<boolean>(false);

  // Sequential Glissando Audio Test
  const [isTestingGlissando, setIsTestingGlissando] = useState<boolean>(false);
  const [glissandoTestReport, setGlissandoTestReport] = useState<string | null>(null);

  const handleRunGlissandoTest = async () => {
    setIsTestingGlissando(true);
    setGlissandoTestReport('Playing 36 sequential notes (35ms)...');
    try {
      const res = await audioEngine.testSequentialGlissando(35, 36);
      if (res.ok) {
        setGlissandoTestReport(`✅ Test Passed: ${res.notesPlayed}/36 crystal-clear notes with zero crackling! (State: ${res.finalState})`);
      } else {
        setGlissandoTestReport(`⚠️ Notes: ${res.notesPlayed}, Errors: ${res.errors}, State: ${res.finalState}`);
      }
    } catch (err: any) {
      setGlissandoTestReport(`Test error: ${err?.message || 'unknown'}`);
    } finally {
      setIsTestingGlissando(false);
    }
  };

  const [noteNotation, setNoteNotation] = useState<NoteNotationFormat>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('maestro_note_notation');
        if (saved === 'latin' || saved === 'letter' || saved === 'german' || saved === 'numeric' || saved === 'none') {
          return saved;
        }
      } catch (e) {}
    }
    return 'latin';
  });

  const handleNotationChange = (fmt: NoteNotationFormat) => {
    setNoteNotation(fmt);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('maestro_note_notation', fmt);
      } catch (e) {}
    }
  };

  const [soundProfile, setSoundProfileState] = useState<SoundProfile>(() => audioEngine.getSoundProfile());

  const handleSoundProfileChange = (p: SoundProfile) => {
    setSoundProfileState(p);
    audioEngine.setSoundProfile(p);
    audioEngine.playNote('C4', '4n', instrument);
  };

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

  // Synchronize externally selected song to play in waterfall mode (from Composer or Library)
  useEffect(() => {
    if (selectedSongToPlay) {
      setActiveSong(selectedSongToPlay);
      setShowWaterfall(true);
      if (onClearSelectedSong) onClearSelectedSong();
    }
  }, [selectedSongToPlay]);

  // Options Modal, Scrollable Sub-Modals & Center Stage Animation Gallery Modal
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState<boolean>(false);
  type OptionsSubModalType = 'themes' | 'fx' | 'view' | 'keys' | 'sound' | 'tools' | 'share' | null;
  const [activeOptionsSubModal, setActiveOptionsSubModal] = useState<OptionsSubModalType>(null);
  const [waterfallFxMode, setWaterfallFxMode] = useState<WaterfallFxMode>(() => loadWaterfallFx());
  const [centerAnimation, setCenterAnimation] = useState<CenterStageAnimationId>(() => loadCenterAnimation());
  const [isCenterAnimModalOpen, setIsCenterAnimModalOpen] = useState<boolean>(false);
  const centerAnimationRef = useRef<CenterStageAnimationId>(centerAnimation);
  centerAnimationRef.current = centerAnimation;
  const freeStageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const freeStageAnimatorRef = useRef<CenterStageAnimator>(new CenterStageAnimator());
  const videoFallbackAnimatorRef = useRef<CenterStageAnimator>(new CenterStageAnimator());

  // Gamification (Daily Streaks, XP, Levels)
  const [gamification, setGamification] = useState<UserGamificationState>(() => loadGamificationState());
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Web MIDI Physical Piano Connection
  const [midiConnected, setMidiConnected] = useState<boolean>(false);
  const [midiDeviceName, setMidiDeviceName] = useState<string>('');

  // Acoustic Microphone Pitch Detector
  const [isMicListening, setIsMicListening] = useState<boolean>(false);
  const [micSensitivity, setMicSensitivity] = useState<'economy' | 'balanced' | 'pro'>('economy');

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
  const studentPressedNotesRef = useRef<Set<string>>(new Set());
  const micActiveNotesRef = useRef<Map<string, number>>(new Map());
  const keyboardContainerRef = useRef<HTMLDivElement | null>(null);

  // Microphone active notes cleanup loop to prevent stuck keys
  useEffect(() => {
    if (!isMicListening) return;
    const interval = setInterval(() => {
      const now = performance.now();
      micActiveNotesRef.current.forEach((lastSeen, note) => {
        if (now - lastSeen > 300) {
          micActiveNotesRef.current.delete(note);
          if (!sustainRef.current) {
            setKeyVisual(note, false);
            currentlyPressedNotesRef.current.delete(note);
          }
        }
      });
    }, 60);
    return () => clearInterval(interval);
  }, [isMicListening]);

  // Release sustained notes when sustain is turned off
  useEffect(() => {
    audioEngine.setSustain(sustain);
    if (!sustain) {
      currentlyPressedNotesRef.current.forEach((note) => {
        if (!micActiveNotesRef.current.has(note)) {
          setKeyVisual(note, false);
          currentlyPressedNotesRef.current.delete(note);
        }
      });
    }
  }, [sustain]);

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

  const setKeyVisual = (note: string, active: boolean, isStudent = false) => {
    const keyEl = keyNodesMapRef.current.get(note);
    if (keyEl) {
      if (active) {
        if (isStudent) {
          keyEl.classList.add('key-pressed-student');
        } else {
          keyEl.classList.add('key-pressed-active');
        }
      } else {
        keyEl.classList.remove('key-pressed-active');
        keyEl.classList.remove('key-pressed-student');
      }
    }
  };

  const clearAllPressedVisuals = useCallback(() => {
    currentlyPressedNotesRef.current.forEach((note) => {
      setKeyVisual(note, false);
      audioEngine.releaseNote(getTransposedNote(note));
    });
    currentlyPressedNotesRef.current.clear();
    keyNodesMapRef.current.forEach((el) => {
      el.classList.remove('key-pressed-active');
      el.classList.remove('key-pressed-student');
    });
  }, [getTransposedNote]);

  // Masterclass & Multi-user Real-time WebSocket state
  const wsRef = useRef<WebSocket | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  }, []);

  const handleSelectCenterAnimation = useCallback(
    (id: CenterStageAnimationId) => {
      setCenterAnimation(id);
      centerAnimationRef.current = id;
      saveCenterAnimation(id);
      const meta = getCenterAnimationMeta(id);
      showToast(id === 'none' ? '🚫 Center Stage Animation disabled' : `${meta.icon} Center Stage: ${meta.name}`);
    },
    [showToast]
  );

  const [keyboardDamageLevel, setKeyboardDamageLevel] = useState<number>(0);
  const [bombBlastSeq, setBombBlastSeq] = useState<number>(0);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const shakeRafRef = useRef<number | null>(null);

  const triggerEarthquakeShake = useCallback((intensityPx: number) => {
    if (typeof window === 'undefined') return;
    if (shakeRafRef.current !== null) {
      cancelAnimationFrame(shakeRafRef.current);
      shakeRafRef.current = null;
    }
    const el = stageContainerRef.current;
    if (!el) return;
    const durationMs = 580;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed >= durationMs) {
        el.style.transform = '';
        shakeRafRef.current = null;
        return;
      }
      const progress = elapsed / durationMs;
      const decay = Math.pow(1 - progress, 1.8);
      const freq = elapsed * 0.085;
      const dx = Math.sin(freq * 1.7) * intensityPx * decay + (Math.random() - 0.5) * intensityPx * 0.45 * decay;
      const dy = Math.cos(freq * 2.3) * intensityPx * 0.75 * decay + (Math.random() - 0.5) * intensityPx * 0.4 * decay;
      const rot = Math.sin(freq * 1.3) * (intensityPx * 0.04) * decay;
      el.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg)`;
      shakeRafRef.current = requestAnimationFrame(tick);
    };
    shakeRafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    return () => {
      if (shakeRafRef.current !== null) {
        cancelAnimationFrame(shakeRafRef.current);
      }
    };
  }, []);

  const handleOverloadDetonate = useCallback(
    (_boomCount: number) => {
      setBombBlastSeq((s) => s + 1);
      setKeyboardDamageLevel((prev) => {
        const next = Math.min(4, prev + 1);
        const intensity = next >= 4 ? 22 : next === 3 ? 17 : next === 2 ? 13 : 9;
        triggerEarthquakeShake(intensity);
        return next;
      });
    },
    [triggerEarthquakeShake]
  );

  const handleWaterfallFxChange = useCallback(
    (mode: WaterfallFxMode) => {
      setWaterfallFxMode(mode);
      saveWaterfallFx(mode);
      if (mode === 'off') {
        setKeyboardDamageLevel(0);
        setBombBlastSeq(0);
      }
      const meta = getWaterfallFxMeta(mode);
      showToast(mode === 'off' ? '🚫 Note Visual FX disabled' : `✨ Note FX: ${meta.label}`);
    },
    [showToast]
  );

  // --- VIDEO RECORDING (VERTICAL 9:16 REEL & HORIZONTAL 16:9 WITH ROTATE BANNER) ---
  type VideoRecordMode = 'vertical_reel' | 'horizontal_full';
  interface SavedVideoEntry {
    id: string;
    filename: string;
    mode: VideoRecordMode;
    ext: string;
    createdAt: number;
    sizeBytes: number;
    blob?: Blob;
    serverUrl?: string;
  }
  const [isVideoMenuOpen, setIsVideoMenuOpen] = useState<boolean>(false);
  const [activeVideoMode, setActiveVideoMode] = useState<VideoRecordMode>('vertical_reel');
  const [isReelRecording, setIsReelRecording] = useState<boolean>(false);
  const [reelRecordSeconds, setReelRecordSeconds] = useState<number>(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  const [recordedVideoExt, setRecordedVideoExt] = useState<string>('mp4');
  const [recordedVideoFilename, setRecordedVideoFilename] = useState<string>('VirtuKeys-Video.mp4');
  const [recordedServerStreamUrl, setRecordedServerStreamUrl] = useState<string | null>(null);
  const [recordedServerDownloadUrl, setRecordedServerDownloadUrl] = useState<string | null>(null);
  const [isUploadingVideoChunks, setIsUploadingVideoChunks] = useState<boolean>(false);
  const [videoUploadPercent, setVideoUploadPercent] = useState<number>(0);
  const [savedVideosArchive, setSavedVideosArchive] = useState<SavedVideoEntry[]>([]);
  const [waterfallRestartTrigger, setWaterfallRestartTrigger] = useState<number>(0);
  const reelRecorderRef = useRef<MediaRecorder | null>(null);
  const videoUploadPromiseRef = useRef<Promise<{ streamUrl: string; downloadUrl: string } | null> | null>(null);

  useEffect(() => {
    setKeyboardDamageLevel(0);
    setBombBlastSeq(0);
  }, [activeSong?.id, waterfallRestartTrigger]);

  const resolveAbsoluteAppUrl = useCallback((apiPath: string): string => {
    const resolved = getAppApiUrl(apiPath);
    if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
      return resolved;
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}${resolved.startsWith('/') ? '' : '/'}${resolved}`;
    }
    return resolved;
  }, []);

  const uploadVideoInChunks = useCallback(
    async (blob: Blob, filename: string): Promise<{ streamUrl: string; downloadUrl: string } | null> => {
      try {
        setIsUploadingVideoChunks(true);
        setVideoUploadPercent(5);
        // 384 KB chunks so every POST request is well below Nginx's 1MB default client_max_body_size
        const CHUNK_SIZE = 384 * 1024;
        const totalChunks = Math.max(1, Math.ceil(blob.size / CHUNK_SIZE));
        let lastData: any = null;

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(blob.size, start + CHUNK_SIZE);
          const chunk = blob.slice(start, end);
          const chunkEndpoint = `/api/video-upload-chunk/${encodeURIComponent(filename)}?index=${i}&total=${totalChunks}`;
          const resp = await fetch(getAppApiUrl(chunkEndpoint), {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: chunk,
          });
          if (!resp.ok) {
            throw new Error(`Chunk ${i} HTTP ${resp.status}`);
          }
          lastData = await resp.json();
          setVideoUploadPercent(Math.min(100, Math.round(((i + 1) / totalChunks) * 100)));
        }

        const rawStream = lastData?.streamUrl || `/api/videos/file/${encodeURIComponent(filename)}`;
        const rawDl = lastData?.downloadUrl || `${rawStream}?dl=1`;
        const fullStreamUrl = resolveAbsoluteAppUrl(rawStream);
        const fullDownloadUrl = resolveAbsoluteAppUrl(rawDl);

        setRecordedServerStreamUrl(fullStreamUrl);
        setRecordedServerDownloadUrl(fullDownloadUrl);
        setIsUploadingVideoChunks(false);
        setVideoUploadPercent(100);
        return { streamUrl: fullStreamUrl, downloadUrl: fullDownloadUrl };
      } catch (err) {
        console.warn('Chunked video upload failed:', err);
        setIsUploadingVideoChunks(false);
        return null;
      }
    },
    [resolveAbsoluteAppUrl]
  );

  const openVideoArchiveDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      const req = indexedDB.open('virtukeys_video_archive_db', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('videos')) {
          db.createObjectStore('videos', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }, []);

  const refreshSavedVideosArchive = useCallback(async () => {
    const merged = new Map<string, SavedVideoEntry>();
    try {
      const db = await openVideoArchiveDB();
      const localItems: SavedVideoEntry[] = await new Promise((resolve) => {
        const tx = db.transaction('videos', 'readonly');
        const store = tx.objectStore('videos');
        const getAllReq = store.getAll();
        getAllReq.onsuccess = () => resolve((getAllReq.result as SavedVideoEntry[]) || []);
        getAllReq.onerror = () => resolve([]);
      });
      for (const item of localItems) {
        merged.set(item.filename, item);
      }
    } catch {}

    try {
      const resp = await fetch(getAppApiUrl('/api/videos'));
      if (resp.ok) {
        const data = await resp.json();
        if (data && Array.isArray(data.videos)) {
          for (const sv of data.videos) {
            const existing = merged.get(sv.filename);
            const serverFullUrl = resolveAbsoluteAppUrl(sv.url || `/api/videos/file/${encodeURIComponent(sv.filename)}`);
            if (existing) {
              existing.serverUrl = serverFullUrl;
            } else {
              merged.set(sv.filename, {
                id: sv.filename,
                filename: sv.filename,
                mode: sv.filename.includes('Reel') ? 'vertical_reel' : 'horizontal_full',
                ext: sv.filename.endsWith('.mp4') ? 'mp4' : 'webm',
                createdAt: sv.createdAt || Date.now(),
                sizeBytes: sv.sizeBytes || 0,
                serverUrl: serverFullUrl,
              });
            }
          }
        }
      }
    } catch {}

    const sorted = Array.from(merged.values()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);
    setSavedVideosArchive(sorted);
  }, [openVideoArchiveDB, resolveAbsoluteAppUrl]);

  const saveVideoToLocalArchive = useCallback(
    async (entry: SavedVideoEntry) => {
      try {
        const db = await openVideoArchiveDB();
        await new Promise<void>((resolve) => {
          const tx = db.transaction('videos', 'readwrite');
          const store = tx.objectStore('videos');
          store.put(entry);
          const getAllReq = store.getAll();
          getAllReq.onsuccess = () => {
            const all = ((getAllReq.result as SavedVideoEntry[]) || []).sort((a, b) => b.createdAt - a.createdAt);
            for (const old of all.slice(5)) {
              store.delete(old.id);
            }
          };
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      } catch {}
      refreshSavedVideosArchive();
    },
    [openVideoArchiveDB, refreshSavedVideosArchive]
  );

  useEffect(() => {
    refreshSavedVideosArchive();
  }, [refreshSavedVideosArchive]);
  const reelAnimFrameRef = useRef<number | null>(null);
  const reelTimerRef = useRef<number | null>(null);
  const reelStartTimeRef = useRef<number>(0);
  const prevStartIdxBeforeReelRef = useRef<number | null>(null);
  const studioThemeRef = useRef<StudioTheme>(studioTheme);
  useEffect(() => {
    studioThemeRef.current = studioTheme;
  }, [studioTheme]);
  const activeSongRef = useRef<InteractiveSong | null>(activeSong);
  useEffect(() => {
    activeSongRef.current = activeSong;
  }, [activeSong]);

  const computeCentralZoomStartIdx = useCallback((): number => {
    const zoomWin = 10;
    const maxIdx = Math.max(0, ALL_WHITE_KEYS.length - zoomWin);
    if (activeSong && activeSong.notes && activeSong.notes.length > 0) {
      const indices = activeSong.notes
        .map((n) => getWhiteKeyIndexForNote(n.note))
        .filter((idx) => idx !== -1)
        .sort((a, b) => a - b);
      if (indices.length > 0) {
        const medianIdx = indices[Math.floor(indices.length / 2)];
        return Math.max(0, Math.min(maxIdx, Math.round(medianIdx - zoomWin / 2)));
      }
    }
    // Default central register: B3..D5 (around C4..C5, white key index 22)
    return Math.min(22, maxIdx);
  }, [activeSong, getWhiteKeyIndexForNote]);

  const stopReelVideoRecording = useCallback(() => {
    if (reelAnimFrameRef.current) {
      cancelAnimationFrame(reelAnimFrameRef.current);
      reelAnimFrameRef.current = null;
    }
    if (reelTimerRef.current) {
      window.clearInterval(reelTimerRef.current);
      reelTimerRef.current = null;
    }
    if (reelRecorderRef.current && reelRecorderRef.current.state !== 'inactive') {
      try {
        reelRecorderRef.current.stop();
      } catch (e) {}
    }
    if (reelTimerRef.current) {
      clearInterval(reelTimerRef.current);
      reelTimerRef.current = null;
    }
    if (reelAnimFrameRef.current !== null) {
      cancelAnimationFrame(reelAnimFrameRef.current);
      reelAnimFrameRef.current = null;
    }
    setIsReelRecording(false);
    setIsReelZoomed(false);
    if (prevStartIdxBeforeReelRef.current !== null) {
      setStartWhiteKeyIdx(prevStartIdxBeforeReelRef.current);
      prevStartIdxBeforeReelRef.current = null;
    }
  }, []);

  const startVideoRecording = useCallback(async (mode: VideoRecordMode) => {
    if (isReelRecording) {
      stopReelVideoRecording();
      return;
    }

    setIsVideoMenuOpen(false);
    setActiveVideoMode(mode);

    // Cleanup previous recorded video URL if any
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
      setRecordedVideoBlob(null);
    }

    // 1. If vertical mode: zoom keyboard onto central 10 white keys.
    // If horizontal mode: keep user layout (or balanced) to capture the whole piano keyboard!
    if (mode === 'vertical_reel') {
      prevStartIdxBeforeReelRef.current = startWhiteKeyIdx;
      const centerStart = computeCentralZoomStartIdx();
      setIsReelZoomed(true);
      setStartWhiteKeyIdx(centerStart);
    } else {
      setIsReelZoomed(false);
    }

    if (activeSong && !showWaterfall) {
      setShowWaterfall(true);
    }

    // Ensure AudioContext is warm and running before recording begins
    await audioEngine.ensureAudioContextRunning();

    // Get internal stereo digital stream (with silent carrier keeping clock active)
    const audioStream = audioEngine.getRecordingAudioStream();

    // 2. Setup offscreen compositor canvas:
    // Vertical: 720x1280 (9:16)
    // Horizontal: 1280x720 (16:9)
    const compCanvas = document.createElement('canvas');
    const isVertical = mode === 'vertical_reel';
    compCanvas.width = isVertical ? 720 : 1280;
    compCanvas.height = isVertical ? 1280 : 720;
    const ctx = compCanvas.getContext('2d');
    if (!ctx) {
      showToast('Unable to initialize the video recorder.');
      return;
    }

    const themeBadges: Record<StudioTheme, string> = {
      midnight: '🎹 Classic Ivory',
      mahogany: '🪵 Imperial Wood',
      marble: '🏛️ Carrara Marble',
      gold: '👑 24K Royal Gold',
      emerald: '💎 Emerald Jade',
      ruby: '🔥 Magma Ruby',
      sapphire: '❄️ Arctic Sapphire',
      amethyst: '🔮 Cosmic Amethyst',
      carbon: '🏎️ Titanium Carbon',
      neon: '⚡ Cyber Neon',
      rainbow: '🌈 Pop Rainbow',
      animals: '🐾 Pet & Paws',
      candy: '🍭 Sweet Pastel',
    };

    reelStartTimeRef.current = performance.now();

    const renderCompositeFrame = () => {
      const W = compCanvas.width;
      const H = compCanvas.height;
      const elapsedSec = (performance.now() - reelStartTimeRef.current) / 1000;

      // Studio background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#020617');
      bgGrad.addColorStop(0.5, '#090d16');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Top Header Banner
      const headerH = isVertical ? 115 : 68;
      const headerGrad = ctx.createLinearGradient(0, 0, W, headerH);
      headerGrad.addColorStop(0, 'rgba(15, 23, 42, 0.98)');
      headerGrad.addColorStop(1, 'rgba(30, 41, 59, 0.98)');
      ctx.fillStyle = headerGrad;
      ctx.fillRect(0, 0, W, headerH);

      // Gold accent line under header
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, headerH - 2, W, 2);

      // Brand title: VirtuKeys
      ctx.fillStyle = '#fbbf24';
      ctx.font = isVertical ? '900 32px Inter, system-ui, sans-serif' : '900 24px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎹 VirtuKeys', isVertical ? 28 : 20, isVertical ? 44 : 26);

      // Song title subtitle
      const currentSongTitle = activeSongRef.current ? activeSongRef.current.title : 'Live Piano Performance';
      ctx.fillStyle = '#f8fafc';
      ctx.font = isVertical ? '700 20px Inter, system-ui, sans-serif' : '700 15px Inter, system-ui, sans-serif';
      if (isVertical) {
        ctx.fillText(`🎵 ${currentSongTitle}`, 28, 84);
      } else {
        ctx.fillText(`🎵 ${currentSongTitle}`, 220, 26);
      }

      // Current 3D material pill on top-right
      const badgeText = themeBadges[studioThemeRef.current] || '🎹 Classic Ivory';
      ctx.font = isVertical ? '800 18px Inter, system-ui, sans-serif' : '800 14px Inter, system-ui, sans-serif';
      const metrics = ctx.measureText(badgeText);
      const bw = metrics.width + (isVertical ? 32 : 24);
      const bh = isVertical ? 42 : 32;
      const bx = W - bw - (isVertical ? 24 : 16);
      const by = isVertical ? 36 : 18;
      ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, isVertical ? 12 : 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fde68a';
      ctx.textAlign = 'center';
      ctx.fillText(badgeText, bx + bw / 2, by + bh / 2 + 1);

      // Live canvases from DOM
      const waterfallCanvas = document.querySelector('canvas[data-waterfall-canvas="true"]') as HTMLCanvasElement | null;
      const pianoCanvas = document.querySelector('canvas[data-piano-canvas="true"]') as HTMLCanvasElement | null;

      // Layout geometry: Realistic, large piano proportions matching live app!
      // In live app with waterfall, keyboard is prominent (~45% - 50% of height)
      const footerH = isVertical ? 50 : 36;
      const pianoBottomY = H - footerH;

      // Generous, realistic piano height (keys look deep, bold and lifelike just like real piano)
      const pianoDrawnHeight = isVertical ? 420 : 310;
      const pianoDrawY = pianoBottomY - pianoDrawnHeight;

      if (pianoCanvas && pianoCanvas.width > 0 && pianoCanvas.height > 0) {
        ctx.drawImage(pianoCanvas, 0, 0, pianoCanvas.width, pianoCanvas.height, 0, pianoDrawY, W, pianoDrawnHeight);
      }

      const railTop = pianoDrawY - (isVertical ? 14 : 10);
      const wfTop = headerH;
      const wfHeight = Math.max(80, railTop - wfTop);

      // Waterfall / Center Stage section
      if (waterfallCanvas && waterfallCanvas.width > 0 && waterfallCanvas.height > 0) {
        ctx.drawImage(waterfallCanvas, 0, 0, waterfallCanvas.width, waterfallCanvas.height, 0, wfTop, W, wfHeight);
      } else if (centerAnimationRef.current !== 'none') {
        const stageGrad = ctx.createRadialGradient(W / 2, wfTop + wfHeight / 2, 30, W / 2, wfTop + wfHeight / 2, 420);
        stageGrad.addColorStop(0, 'rgba(34, 211, 238, 0.14)');
        stageGrad.addColorStop(1, 'rgba(2, 6, 23, 0.98)');
        ctx.fillStyle = stageGrad;
        ctx.fillRect(0, wfTop, W, wfHeight);

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, wfTop, W, wfHeight);
        ctx.clip();
        ctx.translate(0, wfTop);
        videoFallbackAnimatorRef.current.draw(
          ctx,
          W,
          wfHeight,
          performance.now(),
          centerAnimationRef.current,
          {
            isCompact: false,
            hitLineY: wfHeight - 8,
            isPlaying: true,
            opacity: 1,
          }
        );
        ctx.restore();
      } else {
        const stageGrad = ctx.createRadialGradient(W / 2, wfTop + wfHeight / 2, 30, W / 2, wfTop + wfHeight / 2, 380);
        stageGrad.addColorStop(0, 'rgba(245, 158, 11, 0.14)');
        stageGrad.addColorStop(1, 'rgba(2, 6, 23, 0.95)');
        ctx.fillStyle = stageGrad;
        ctx.fillRect(0, wfTop, W, wfHeight);

        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'center';
        ctx.font = isVertical ? '900 36px Inter, system-ui, sans-serif' : '900 28px Inter, system-ui, sans-serif';
        ctx.fillText('🎹 VirtuKeys Studio', W / 2, wfTop + wfHeight / 2 - 16);
        ctx.fillStyle = '#94a3b8';
        ctx.font = isVertical ? '600 22px Inter, system-ui, sans-serif' : '600 16px Inter, system-ui, sans-serif';
        ctx.fillText(isVertical ? 'Central Keys Zoom • HD Ratio' : 'Full Keyboard • Pure HD Audio', W / 2, wfTop + wfHeight / 2 + 20);
      }

      // Red plush felt & gold rail separator
      const railH = isVertical ? 14 : 10;
      const railGrad = ctx.createLinearGradient(0, railTop, 0, railTop + railH);
      railGrad.addColorStop(0, '#b45309');
      railGrad.addColorStop(0.5, '#fde047');
      railGrad.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = railGrad;
      ctx.fillRect(0, railTop, W, railH);

      // Bottom Footer Watermark
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, pianoBottomY, W, footerH);
      ctx.fillStyle = '#94a3b8';
      ctx.font = isVertical ? '700 18px Inter, system-ui, sans-serif' : '700 13px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('freeserv.it/Song • Play piano online 🎹', W / 2, pianoBottomY + footerH / 2 + 1);

      // --- ULTRA-PRO CLEAN FLASHING "ROTATE YOUR PHONE" (SENZA SFONDO / NESSUN BOX) ---
      // Scritta a tutto schermo, grandissima, luminosa al neon che lampeggia/pulsa direttamente sul video!
      if (!isVertical && elapsedSec < 4.2) {
        const fadeOut = elapsedSec > 3.4 ? Math.max(0, (4.2 - elapsedSec) / 0.8) : 1.0;
        ctx.save();
        ctx.globalAlpha = fadeOut;

        // Pulso luminoso rapido e dinamico (effetto neon stroboscopico / battito)
        const pulse = Math.abs(Math.sin(elapsedSec * 4.5));
        const glowIntensity = 18 + pulse * 28;
        const scale = 1.0 + pulse * 0.04;

        ctx.translate(W / 2, H / 2 - 15);
        ctx.scale(scale, scale);

        // Icona rotazione animata
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '84px system-ui, sans-serif';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = glowIntensity;
        ctx.fillText('🔄', 0, -85);

        // Scritta PRINCIPALE GIGANTE SENZA SFONDO "ROTATE YOUR PHONE"
        ctx.font = '900 68px Inter, Montserrat, system-ui, sans-serif';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = glowIntensity * 1.3;
        ctx.fillStyle = pulse > 0.4 ? '#ffffff' : '#fef08a';
        ctx.fillText('ROTATE YOUR PHONE', 0, 10);

        // Doppio bagliore neon oro/arancio per renderla incredibilmente vibrante
        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgba(245, 158, 11, ${0.6 + 0.4 * pulse})`;
        ctx.strokeText('ROTATE YOUR PHONE', 0, 10);

        // Sottotitolo chiaro ed elegante
        ctx.font = '800 22px Inter, system-ui, sans-serif';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#fde68a';
        ctx.fillText('⚡ Turn to Landscape for the Best Experience 🎹', 0, 75);

        ctx.restore();
      }

      reelAnimFrameRef.current = requestAnimationFrame(renderCompositeFrame);
    };

    // 3. Combine 60 FPS canvas video stream + internal continuous Web Audio track
    // 60 FPS ensures every rendered animation frame matches the 60Hz display refresh with zero judder or drift
    const videoStream = compCanvas.captureStream(60);
    const combinedTracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
    if (audioStream && audioStream.getAudioTracks().length > 0) {
      combinedTracks.push(...audioStream.getAudioTracks());
    }
    const combinedStream = new MediaStream(combinedTracks);

    // Choose best supported MIME type
    const mimeCandidates = [
      { mime: 'video/mp4;codecs=avc1', ext: 'mp4' },
      { mime: 'video/mp4', ext: 'mp4' },
      { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' },
      { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' },
      { mime: 'video/webm', ext: 'webm' },
    ];
    let selectedMime = '';
    let selectedExt = 'webm';
    for (const c of mimeCandidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mime)) {
        selectedMime = c.mime;
        selectedExt = c.ext;
        break;
      }
    }

    try {
      const chunks: BlobPart[] = [];
      const recorder = selectedMime
        ? new MediaRecorder(combinedStream, {
            mimeType: selectedMime,
            videoBitsPerSecond: isVertical ? 5000000 : 6000000,
            audioBitsPerSecond: 192000,
          })
        : new MediaRecorder(combinedStream);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunks.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const actualMime = selectedMime || recorder.mimeType || 'video/webm';
        let finalExt = selectedExt;
        if (actualMime.includes('mp4')) {
          finalExt = 'mp4';
        } else if (actualMime.includes('webm')) {
          finalExt = 'webm';
        }

        // CRITICAL FIX FOR ANDROID / CHROME DOWNLOAD FILENAME & EXTENSION:
        // Strip ";codecs=..." from the Blob/File MIME type so Android MimeTypeMap recognizes "video/mp4" or "video/webm"
        const cleanMime = finalExt === 'mp4' ? 'video/mp4' : 'video/webm';
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const filename = `VirtuKeys_${isVertical ? 'Reel' : 'Video'}_${stamp}.${finalExt}`;

        let finalBlob: Blob;
        try {
          finalBlob = new File(chunks, filename, { type: cleanMime, lastModified: Date.now() });
        } catch {
          finalBlob = new Blob(chunks, { type: cleanMime });
        }
        const url = URL.createObjectURL(finalBlob);

        setRecordedVideoBlob(finalBlob);
        setRecordedVideoUrl(url);
        setRecordedVideoExt(finalExt);
        setRecordedVideoFilename(filename);
        setRecordedServerStreamUrl(null);
        setRecordedServerDownloadUrl(null);

        // Automatically persist video in local IndexedDB archive so it is NEVER lost if modal closes or download fails
        const archiveEntry: SavedVideoEntry = {
          id: filename,
          filename,
          mode,
          ext: finalExt,
          createdAt: Date.now(),
          sizeBytes: finalBlob.size,
          blob: finalBlob,
        };
        saveVideoToLocalArchive(archiveEntry);

        // Upload in 384KB chunks immediately so Nginx never rejects with 413 and both "Scarica Video" & "⋮ -> Scarica" use a real HTTPS URL
        const upPromise = uploadVideoInChunks(finalBlob, filename);
        videoUploadPromiseRef.current = upPromise;
        upPromise
          .then((res) => {
            if (res) {
              refreshSavedVideosArchive();
            }
          })
          .catch(() => {});
      };

      reelRecorderRef.current = recorder;

      // CRITICAL ZERO-OFFSET SYNCHRONIZATION:
      // Start the MediaRecorder and begin the composite rendering loop at the EXACT same instant
      // so the canvas presentation timestamp matches the continuous audio carrier presentation timestamp from t=0.000s
      recorder.start(100);
      reelStartTimeRef.current = performance.now();
      renderCompositeFrame();

      // Automatically restart the song from the beginning (0:00) with all current user settings active
      if (activeSong) {
        setShowWaterfall(true);
        setWaterfallRestartTrigger((prev) => prev + 1);
      }

      setIsReelRecording(true);
      setReelRecordSeconds(0);
      showToast(
        isVertical
          ? '🎬 Vertical 9:16 Video Recording (Center Zoom) started!'
          : '🖥️ Horizontal 16:9 Video Recording ("Rotate Phone" intro) started!'
      );

      if (reelTimerRef.current) {
        clearInterval(reelTimerRef.current);
      }
      reelTimerRef.current = window.setInterval(() => {
        setReelRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
      stopReelVideoRecording();
      showToast('Error starting video recording.');
    }
  }, [
    isReelRecording,
    stopReelVideoRecording,
    recordedVideoUrl,
    startWhiteKeyIdx,
    computeCentralZoomStartIdx,
    activeSong,
    showWaterfall,
    showToast,
  ]);

  // Cleanup video recorder on unmount
  useEffect(() => {
    return () => {
      if (reelAnimFrameRef.current) cancelAnimationFrame(reelAnimFrameRef.current);
      if (reelTimerRef.current) clearInterval(reelTimerRef.current);
    };
  }, []);

  // --- REAL-TIME CHORD DETECTOR STATE ---
  const [isChordDetectorOpen, setIsChordDetectorOpen] = useState<boolean>(false);

  // Step-by-step Back Navigation Handlers (Android Hardware Back + Browser Popstate)
  useBackHandler(activeOptionsSubModal !== null, () => {
    setActiveOptionsSubModal(null);
    setIsOptionsModalOpen(true);
  }, 40);
  useBackHandler(isCenterAnimModalOpen, () => {
    setIsCenterAnimModalOpen(false);
    setIsOptionsModalOpen(true);
  }, 40);
  useBackHandler(isOptionsModalOpen, () => setIsOptionsModalOpen(false), 30);
  useBackHandler(isLibraryOpen, () => setIsLibraryOpen(false), 30);
  useBackHandler(isChordDetectorOpen, () => setIsChordDetectorOpen(false), 30);
  useBackHandler(isMetronomeModalOpen, () => setIsMetronomeModalOpen(false), 30);
  useBackHandler(isProfileModalOpen, () => setIsProfileModalOpen(false), 30);
  useBackHandler(isVideoMenuOpen, () => setIsVideoMenuOpen(false), 30);
  useBackHandler(Boolean(recordedVideoUrl), () => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
    setRecordedVideoUrl(null);
    setRecordedVideoBlob(null);
  }, 30);
  useBackHandler(showWaterfall, () => {
    setShowWaterfall(false);
    setSongGuidance(null);
    setKeyboardDamageLevel(0);
    setBombBlastSeq(0);
  }, 20);
  const [activeChordNotes, setActiveChordNotes] = useState<string[]>([]);
  const [chordHistory, setChordHistory] = useState<{ chord: IdentifiedChord; time: string }[]>([]);

  useEffect(() => {
    if (!isChordDetectorOpen) return;
    const interval = setInterval(() => {
      const notes = Array.from(currentlyPressedNotesRef.current);
      setActiveChordNotes(notes);
      if (notes.length >= 2) {
        const chord = identifyChord(notes);
        if (chord) {
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setChordHistory(prev => {
            if (prev.length > 0 && prev[0].chord.symbol === chord.symbol) return prev;
            return [{ chord, time: timeStr }, ...prev.slice(0, 19)];
          });
        }
      }
    }, 250);
    return () => clearInterval(interval);
  }, [isChordDetectorOpen]);

  // --- 👂 ORECCHIO ASSOLUTO (EAR TRAINING MINI-GAME) STATE ---
  const [isEarTrainingOpen, setIsEarTrainingOpen] = useState<boolean>(Boolean(earTrainingStandalone));
  const [earLevel, setEarLevel] = useState<'base' | 'expert' | 'maestro'>('base');
  const [earTargetNotes, setEarTargetNotes] = useState<string[]>([]);
  const [earMatchedIdx, setEarMatchedIdx] = useState<number>(0);
  const [earScore, setEarScore] = useState<number>(0);
  const [earStreak, setEarStreak] = useState<number>(0);
  const [earBestStreak, setEarBestStreak] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('maestro_ear_best_streak') || 0);
    } catch {
      return 0;
    }
  });
  const [earHintShown, setEarHintShown] = useState<boolean>(false);
  const [earFeedback, setEarFeedback] = useState<{
    text: string;
    type: 'neutral' | 'correct' | 'higher' | 'lower';
  }>({
    text: 'Listen to the mystery note and play it on the keyboard!',
    type: 'neutral',
  });

  const isEarTrainingOpenRef = useRef<boolean>(isEarTrainingOpen);
  isEarTrainingOpenRef.current = isEarTrainingOpen;
  const earTargetNotesRef = useRef<string[]>(earTargetNotes);
  earTargetNotesRef.current = earTargetNotes;
  const earMatchedIdxRef = useRef<number>(earMatchedIdx);
  earMatchedIdxRef.current = earMatchedIdx;
  const earLevelRef = useRef<'base' | 'expert' | 'maestro'>(earLevel);
  earLevelRef.current = earLevel;

  const playEarMysterySequence = useCallback(
    (notesToPlay: string[]) => {
      if (!notesToPlay || notesToPlay.length === 0) return;
      audioEngine.init().catch(() => {});
      notesToPlay.forEach((n, idx) => {
        setTimeout(() => {
          audioEngine.playNote(n, '4n', instrument);
        }, idx * 430);
      });
    },
    [instrument]
  );

  const startNewEarRound = useCallback(
    (levelOverride?: 'base' | 'expert' | 'maestro') => {
      const lvl = levelOverride || earLevelRef.current;
      const whitePool = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
      const chromaticPool = ['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4', 'C5'];
      const pool = lvl === 'base' ? whitePool : chromaticPool;
      const count = lvl === 'maestro' ? 3 : 1;

      const picked: string[] = [];
      for (let i = 0; i < count; i++) {
        let candidate = pool[Math.floor(Math.random() * pool.length)];
        if (picked.length > 0 && candidate === picked[picked.length - 1]) {
          candidate = pool[(pool.indexOf(candidate) + 2) % pool.length];
        }
        picked.push(candidate);
      }

      setEarTargetNotes(picked);
      earTargetNotesRef.current = picked;
      setEarMatchedIdx(0);
      earMatchedIdxRef.current = 0;
      setEarHintShown(false);
      setEarFeedback({
        text:
          count === 1
            ? '👂 Listen to the mystery note and play it on the keyboard!'
            : '👂 Listen to the 3-note sequence and replay it in order!',
        type: 'neutral',
      });

      // Center keyboard around C4-C5 so the target octave is right in front of the player
      const c4Idx = getWhiteKeyIndexForNote('C4');
      if (c4Idx !== -1) {
        const opt = Math.max(0, Math.min(maxStartWhiteIdx, Math.round(c4Idx - windowSize / 2 + 4)));
        setStartWhiteKeyIdx(opt);
      }

      setTimeout(() => {
        playEarMysterySequence(picked);
      }, 180);
    },
    [getWhiteKeyIndexForNote, maxStartWhiteIdx, playEarMysterySequence, windowSize]
  );

  // Auto-start first mystery note when entering dedicated Orecchio Assoluto mode from the main menu
  useEffect(() => {
    if (earTrainingStandalone) {
      setIsEarTrainingOpen(true);
      isEarTrainingOpenRef.current = true;
      setShowWaterfall(false);
      startNewEarRound('base');
    }
  }, [earTrainingStandalone]);

  // Report song & keyboard material to lightweight analytics when song waterfall is active
  useEffect(() => {
    if (!showWaterfall || !activeSong?.title) return;
    try {
      const clientId = getOrCreateClientId();
      fetch(getAppApiUrl('/api/analytics/ping'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: localStorage.getItem('maestro_device_id') || clientId,
          username,
          view: 'piano',
          theme: studioTheme,
          songTitle: activeSong.title,
        }),
      }).catch(() => {});
    } catch (_) {}
  }, [showWaterfall, activeSong?.title, studioTheme, username]);

  // --- PALESTRA DELLE SCALE & MANO TRASPARENTE STATE ---
  const [scaleActiveIdx, setScaleActiveIdx] = useState<number>(0);
  const [isScaleAutoplay, setIsScaleAutoplay] = useState<boolean>(true);
  const [scaleBpm, setScaleBpm] = useState<number>(() => activeScaleExercise?.tempoBpm || 80);
  const [isScaleLoop, setIsScaleLoop] = useState<boolean>(true);
  const [scaleMode, setScaleMode] = useState<'demo' | 'practice'>('demo');

  // Accurately center the keyboard view on the scale exercise
  const centerKeyboardOnScale = useCallback((exercise: ScaleExercise) => {
    if (!exercise || exercise.notes.length === 0) return;
    const indices = exercise.notes
      .map(getWhiteKeyIndexForNote)
      .filter((idx) => idx !== -1);

    if (indices.length > 0) {
      const minIdx = Math.min(...indices);
      const maxIdx = Math.max(...indices);
      const center = (minIdx + maxIdx) / 2;
      const optimalStart = Math.max(0, Math.min(maxStartWhiteIdx, Math.round(center - windowSize / 2)));
      setStartWhiteKeyIdx(optimalStart);
    }
  }, [getWhiteKeyIndexForNote, maxStartWhiteIdx, windowSize]);

  // Auto-center keyboard & initialize whenever a scale exercise is loaded or changed
  useEffect(() => {
    if (activeScaleExercise && activeScaleExercise.notes.length > 0) {
      setScaleActiveIdx(0);
      setIsScaleAutoplay(true);
      setScaleBpm(activeScaleExercise.tempoBpm || 80);

      // Center keyboard exactly on the scale so the hand and keys are directly in front of the user
      centerKeyboardOnScale(activeScaleExercise);
      showToast(`🖐️ Palestra Scale: ${activeScaleExercise.name}`);
    }
  }, [activeScaleExercise, centerKeyboardOnScale, showToast]);

  // Keep the active hand and note inside visible keyboard viewport as scale plays
  useEffect(() => {
    if (!activeScaleExercise) return;
    const currentNote = activeScaleExercise.notes[scaleActiveIdx];
    if (!currentNote) return;
    const currentWhiteIdx = getWhiteKeyIndexForNote(currentNote);
    if (currentWhiteIdx === -1) return;

    // Margin from edges before scrolling (2 keys)
    const margin = 2;
    if (currentWhiteIdx < clampedStartWhiteIdx + margin) {
      const newStart = Math.max(0, currentWhiteIdx - margin);
      setStartWhiteKeyIdx(newStart);
    } else if (currentWhiteIdx >= clampedStartWhiteIdx + windowSize - margin) {
      const newStart = Math.min(maxStartWhiteIdx, currentWhiteIdx - windowSize + margin + 1);
      setStartWhiteKeyIdx(newStart);
    }
  }, [activeScaleExercise, scaleActiveIdx, clampedStartWhiteIdx, windowSize, maxStartWhiteIdx, getWhiteKeyIndexForNote]);

  // --- LIVE SONG FINGERING GUIDANCE & TRANSPARENT HAND FOR SHEET MUSIC ---
  const [songGuidance, setSongGuidance] = useState<{ note: string | null; finger: number | null; tip?: string | null; hand?: 'right' | 'left' } | null>(null);

  // Auto-center keyboard when transparent hand is guiding song notes (Diteggiatura mode or Impara mode)
  useEffect(() => {
    if (activeScaleExercise) return;
    if (!songGuidance?.note) return;
    const currentWhiteIdx = getWhiteKeyIndexForNote(songGuidance.note);
    if (currentWhiteIdx === -1) return;

    const margin = 2;
    if (currentWhiteIdx < clampedStartWhiteIdx + margin) {
      const newStart = Math.max(0, currentWhiteIdx - margin);
      setStartWhiteKeyIdx(newStart);
    } else if (currentWhiteIdx >= clampedStartWhiteIdx + windowSize - margin) {
      const newStart = Math.min(maxStartWhiteIdx, currentWhiteIdx - windowSize + margin + 1);
      setStartWhiteKeyIdx(newStart);
    }
  }, [songGuidance?.note, activeScaleExercise, clampedStartWhiteIdx, windowSize, maxStartWhiteIdx, getWhiteKeyIndexForNote]);

  // Autoplay demonstration loop: the transparent hand plays through the scale notes at set BPM
  useEffect(() => {
    if (!activeScaleExercise || !isScaleAutoplay || scaleMode !== 'demo') return;

    let timer: any = null;
    const intervalMs = Math.max(250, (60 / scaleBpm) * 1000);
    const currentNote = activeScaleExercise.notes[scaleActiveIdx];

    if (currentNote) {
      audioEngine.playNote(currentNote, '4n', instrument);
      currentlyPressedNotesRef.current.add(currentNote);
    }

    const releaseTimer = setTimeout(() => {
      if (currentNote) {
        currentlyPressedNotesRef.current.delete(currentNote);
      }
    }, intervalMs * 0.72);

    timer = setTimeout(() => {
      setScaleActiveIdx((prev) => {
        const next = prev + 1;
        if (next >= activeScaleExercise.notes.length) {
          if (isScaleLoop) {
            return 0;
          } else {
            setIsScaleAutoplay(false);
            return prev;
          }
        }
        return next;
      });
    }, intervalMs);

    return () => {
      clearTimeout(timer);
      clearTimeout(releaseTimer);
      if (currentNote) {
        currentlyPressedNotesRef.current.delete(currentNote);
      }
    };
  }, [activeScaleExercise, isScaleAutoplay, scaleActiveIdx, scaleBpm, isScaleLoop, scaleMode, instrument]);

  // Masterclass Teacher-Student Timed Phrase Interface
  interface MasterclassNoteItem {
    note: string;
    delayMs: number;
  }

  // Masterclass Teacher-Student Phrase State
  const [recordedMasterclassNotes, setRecordedMasterclassNotes] = useState<MasterclassNoteItem[]>([]);
  const [teacherAssignedPhrase, setTeacherAssignedPhrase] = useState<MasterclassNoteItem[]>([]);
  const [studentMatchedIndex, setStudentMatchedIndex] = useState<number>(0);
  const [isSimulatingStudentMode, setIsSimulatingStudentMode] = useState<boolean>(false);
  const lastMasterclassNoteTimeRef = useRef<number>(0);

  const [studentProgress, setStudentProgress] = useState<{
    studentName: string;
    currentIndex: number;
    totalNotes: number;
    completed: boolean;
  } | null>(null);

  const teacherAssignedPhraseRef = useRef<MasterclassNoteItem[]>(teacherAssignedPhrase);
  teacherAssignedPhraseRef.current = teacherAssignedPhrase;

  const studentMatchedIndexRef = useRef<number>(studentMatchedIndex);
  studentMatchedIndexRef.current = studentMatchedIndex;

  const createMasterclassWaterfallSong = useCallback((phraseItems: MasterclassNoteItem[], title = 'Teacher Phrase'): InteractiveSong => {
    let currentTime = 0.5;
    const songNotes = phraseItems.map((item, idx) => {
      if (idx > 0) {
        currentTime += Math.max(0.25, (item.delayMs || 350) / 1000);
      }
      return {
        note: item.note,
        time: currentTime,
        duration: 0.5,
      };
    });

    return {
      id: `masterclass_${Date.now()}`,
      title,
      author: 'Teacher',
      bpm: 120,
      difficulty: 'medium',
      notes: songNotes,
    };
  }, []);

  const [masterclassPlayMode, setMasterclassPlayMode] = useState<'arcade' | 'learn'>('arcade');
  
  const [defaultViewMode, setDefaultViewMode] = useState<'waterfall' | 'sheet'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('maestro_default_view_mode');
      if (saved === 'sheet' || saved === 'waterfall') return saved;
    }
    return 'waterfall';
  });

  const [masterclassViewMode, setMasterclassViewMode] = useState<'waterfall' | 'sheet'>(defaultViewMode);

  // Sync view mode when active song starts
  useEffect(() => {
    if (activeSong) {
      setMasterclassViewMode(defaultViewMode);
    }
  }, [activeSong, defaultViewMode]);

  const handleDefaultViewModeChange = (mode: 'waterfall' | 'sheet') => {
    setDefaultViewMode(mode);
    setMasterclassViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('maestro_default_view_mode', mode);
    }
  };

  const [sheetScrollMode, setSheetScrollMode] = useState<'sweeping' | 'continuous'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('maestro_sheet_scroll_mode');
      if (saved === 'continuous' || saved === 'sweeping') return saved;
    }
    return 'sweeping';
  });

  const handleSheetScrollModeChange = (mode: 'sweeping' | 'continuous') => {
    setSheetScrollMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('maestro_sheet_scroll_mode', mode);
    }
  };

  // Voice Audio Communication State (Maestro ↔ Allievo Live Voice Audio)
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [peerVoiceActive, setPeerVoiceActive] = useState<boolean>(false);
  const [peerMicMuted, setPeerMicMuted] = useState<boolean>(false);
  const [connectedPeersCount, setConnectedPeersCount] = useState<number>(1);
  const [roomMembers, setRoomMembers] = useState<{ id: string; username: string; role: string }[]>([]);
  const hadOtherUserRef = useRef<boolean>(false);
  const [peerDisconnectedState, setPeerDisconnectedState] = useState<boolean>(false);
  const [copiedLinkState, setCopiedLinkState] = useState<boolean>(false);

  useEffect(() => {
    if (!socialSession || !socialSession.roomId) return;
    const clientSessionId = getOrCreateClientId();
    const otherMembers = roomMembers.filter((m) => m.id !== clientSessionId && m.username !== username);

    if (otherMembers.length > 0) {
      hadOtherUserRef.current = true;
    } else if (hadOtherUserRef.current && otherMembers.length === 0 && !peerDisconnectedState) {
      setPeerDisconnectedState(true);
      showToast('⚠️ The other user disconnected from the room!');
    }
  }, [roomMembers, socialSession, username, peerDisconnectedState, showToast]);

  const localVoiceStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioCtxRef = useRef<AudioContext | null>(null);
  const voiceCaptureCtxRef = useRef<AudioContext | null>(null);
  const voiceProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextVoicePlayTimeRef = useRef<number>(0);
  const lastRemoteVoiceReceivedTimeRef = useRef<number>(0);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const isMicMutedRef = useRef<boolean>(false);
  const lastEventTimestampRef = useRef<number>(Date.now() - 3000);

  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  // Quick share helpers for Maestro inside PianoView
  const handleQuickCopyStudentLink = async () => {
    if (!socialSession?.roomId) return;
    const base = getPublicShareBaseUrl().replace(/\/+$/, '');
    const cleanRoom = normalizeRoomCode(socialSession.roomId, 'masterclass');
    const query = `room=${encodeURIComponent(cleanRoom)}&mode=masterclass&role=allievo`;
    const fullUrl = `${base}/?${query}#social?${query}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = fullUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedLinkState(true);
      showToast("📋 Student link copied to clipboard!");
      setTimeout(() => setCopiedLinkState(false), 2500);
    } catch (e) {}
  };

  const handleQuickShareWhatsApp = () => {
    if (!socialSession?.roomId) return;
    const base = getPublicShareBaseUrl().replace(/\/+$/, '');
    const cleanRoom = normalizeRoomCode(socialSession.roomId, 'masterclass');
    const short = cleanRoom.replace('MASTERCLASS-', '');
    const query = `room=${encodeURIComponent(cleanRoom)}&mode=masterclass&role=allievo`;
    const fullUrl = `${base}/?${query}#social?${query}`;

    const text = `👨‍🏫 PIANO MASTERCLASS INVITE\nHi! Join my piano room right away.\n📍 Room Code: *${short}* (or ${cleanRoom})\n\n🔗 *Click here to enter directly:*\n${fullUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Reusable Handlers for Incoming Masterclass Events (from WebSocket or HTTP Fallback)
  const applyIncomingTeacherPhrase = useCallback((msg: any) => {
    const isTeacherRole = !isSimulatingStudentMode && (socialSession?.userRole === 'maestro' || (socialSession?.userRole as string) === 'teacher');
    if (isTeacherRole) {
      return; // Do NOT assign phrase to Maestro
    }

    let receivedPhrase: MasterclassNoteItem[] = [];
    if (Array.isArray(msg.phraseData) && msg.phraseData.length > 0) {
      receivedPhrase = msg.phraseData;
    } else if (Array.isArray(msg.notes) && msg.notes.length > 0) {
      receivedPhrase = msg.notes.map((n: string, i: number) => ({
        note: n,
        delayMs: i === 0 ? 0 : 350,
      }));
    }

    if (receivedPhrase.length > 0) {
      setTeacherAssignedPhrase(receivedPhrase);
      teacherAssignedPhraseRef.current = receivedPhrase;
      setStudentMatchedIndex(0);
      studentMatchedIndexRef.current = 0;

      if (msg.openWaterfall) {
        const mode = msg.displayMode === 'learn' ? 'learn' : 'arcade';
        setMasterclassPlayMode(mode);
        const vMode = msg.displayMode === 'sheet' ? 'sheet' : 'waterfall';
        setMasterclassViewMode(vMode);
        const song = createMasterclassWaterfallSong(receivedPhrase, `Teacher Phrase (${receivedPhrase.length} notes)`);
        setActiveSong(song);
        setShowWaterfall(true);
        showToast(`🎼 The Teacher sent you a phrase in ${vMode === 'sheet' ? 'Sheet Music (Staff)' : 'Waterfall'} (${mode})!`);
      } else {
        showToast(`🎼 Teacher ${msg.sender || ''} sent you a phrase of ${receivedPhrase.length} notes!`);
      }
    }
  }, [createMasterclassWaterfallSong, isSimulatingStudentMode, socialSession?.userRole, username, showToast]);

  const applyIncomingPhraseProgress = useCallback((msg: any) => {
    setStudentProgress({
      studentName: msg.sender || 'Student',
      currentIndex: msg.currentIndex,
      totalNotes: msg.totalNotes,
      completed: msg.completed,
    });
    if (msg.completed) {
      showToast(`🎉 Student ${msg.sender || ''} successfully completed the phrase!`);
    }
  }, [showToast]);

  // Sound chime when student connects to teacher or vice versa
  const hadPeersCountRef = useRef(1);
  useEffect(() => {
    if (socialSession?.mode === 'masterclass') {
      if (connectedPeersCount >= 2 && hadPeersCountRef.current < 2) {
        hadPeersCountRef.current = connectedPeersCount;
        const isTeacherRole = !isSimulatingStudentMode && (socialSession?.userRole === 'maestro' || (socialSession?.userRole as string) === 'teacher');
        showToast(isTeacherRole ? "🎉 Student connected to the room! You can now play together!" : "👨‍🏫 Teacher connected to the room! Ready for your lesson!");
        try {
          audioEngine.playNote('C5', '8n', instrument);
          setTimeout(() => audioEngine.playNote('G5', '4n', instrument), 160);
        } catch (e) {}
      } else if (connectedPeersCount <= 1) {
        hadPeersCountRef.current = 1;
      }
    }
  }, [connectedPeersCount, socialSession, isSimulatingStudentMode, instrument, showToast]);

  // Helper to send room events via WebSocket if connected, or HTTP POST fallback
  const sendRoomEvent = useCallback((type: string, payload: any) => {
    if (!socialSession?.roomId) return;
    const cleanRoomId = normalizeRoomCode(socialSession.roomId, socialSession.mode);
    const clientSessionId = getOrCreateClientId();
    const eventMsg = {
      type,
      roomId: cleanRoomId,
      sender: username,
      senderId: clientSessionId,
      ...payload,
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(eventMsg));
    } else {
      fetch(getAppApiUrl(`/api/room/${encodeURIComponent(cleanRoomId)}/event`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventMsg),
      }).catch(() => {});
    }
  }, [socialSession?.roomId, socialSession?.mode, username]);

  // Helper to get the active negotiated audio transceiver (preferring mid !== null per WebRTC Unified Plan)
  const getActiveAudioTransceiver = useCallback((pc: RTCPeerConnection): RTCRtpTransceiver | undefined => {
    const audioTransceivers = pc
      .getTransceivers()
      .filter((t) => t.receiver?.track?.kind === 'audio' || t.sender?.track?.kind === 'audio');
    return audioTransceivers.find((t) => t.mid !== null) || audioTransceivers[0];
  }, []);

  // Helper to play incoming remote WebRTC audio stream and sync all remote audio receiver tracks
  const playRemoteStream = useCallback((stream: MediaStream) => {
    let audioEl = remoteAudioRef.current;
    if (!audioEl) {
      audioEl = document.getElementById('remote-voice-audio-element') as HTMLAudioElement;
    }
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.id = 'remote-voice-audio-element';
      audioEl.autoplay = true;
      (audioEl as any).playsInline = true;
      (audioEl as any).webkitPlaysInline = true;
      audioEl.style.display = 'none';
      document.body.appendChild(audioEl);
      remoteAudioRef.current = audioEl;
    }
    if (audioEl.srcObject !== stream) {
      audioEl.srcObject = stream;
    }
    audioEl.muted = false;
    audioEl.volume = 1.0;
    const playPromise = audioEl.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('[Voice Audio Play Error]', err);
      });
    }
  }, []);

  const syncRemoteAudioTracks = useCallback((pc?: RTCPeerConnection | null) => {
    const activePc = pc || peerConnectionRef.current;
    if (!activePc || activePc.signalingState === 'closed') return;

    const audioReceivers = activePc.getReceivers().filter((r) => r.track && r.track.kind === 'audio');
    if (audioReceivers.length === 0) return;

    let audioEl = remoteAudioRef.current;
    if (!audioEl) {
      audioEl = document.getElementById('remote-voice-audio-element') as HTMLAudioElement;
    }
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.id = 'remote-voice-audio-element';
      audioEl.autoplay = true;
      (audioEl as any).playsInline = true;
      (audioEl as any).webkitPlaysInline = true;
      audioEl.style.display = 'none';
      document.body.appendChild(audioEl);
      remoteAudioRef.current = audioEl;
    }

    let currentStream = audioEl.srcObject as MediaStream | null;
    if (!currentStream || !(currentStream instanceof MediaStream)) {
      currentStream = new MediaStream();
      audioEl.srcObject = currentStream;
    }

    let tracksChanged = false;
    for (const receiver of audioReceivers) {
      const track = receiver.track;
      if (track && !currentStream.getTracks().some((t) => t.id === track.id)) {
        currentStream.addTrack(track);
        tracksChanged = true;
      }
      if (track) {
        track.onunmute = () => {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.muted = false;
            remoteAudioRef.current.volume = 1.0;
            remoteAudioRef.current.play().catch(() => {});
          }
        };
      }
    }

    if (tracksChanged) {
      audioEl.srcObject = currentStream;
    }
    audioEl.muted = false;
    audioEl.volume = 1.0;
    if (audioEl.paused) {
      audioEl.play().catch(() => {});
    }
  }, []);

  // Universal handler for incoming room messages (from WebRTC DataChannel, WebSocket, or HTTP poll)
  const handleIncomingMessage = useCallback((msg: any) => {
    const clientSessionId = getOrCreateClientId();
    const isSelf = msg.senderId === clientSessionId || (username && msg.sender === username);
    if (isSelf) return;

    // LIVE AUDIO & VISUAL PRESS FROM REMOTE PEER
    if (msg.type === 'piano:key_event' && msg.note) {
      audioEngine.playNote(msg.note, '8n', instrument);
      const isTeacherRole = !isSimulatingStudentMode && (socialSession?.userRole === 'maestro' || (socialSession?.userRole as string) === 'teacher');
      const isStudentNote = isTeacherRole && (msg.role === 'student' || msg.role === 'allievo' || !msg.role || msg.sender !== username);
      if (isStudentNote) {
        studentPressedNotesRef.current.add(msg.note);
        setTimeout(() => {
          studentPressedNotesRef.current.delete(msg.note);
        }, 220);
      }
      setKeyVisual(msg.note, true, isStudentNote);
      setTimeout(() => setKeyVisual(msg.note, false, isStudentNote), 220);
    }
    // TEACHER PHRASE ASSIGNED TO STUDENT
    else if (msg.type === 'piano:teacher_phrase') {
      applyIncomingTeacherPhrase(msg);
    }
    // STUDENT PROGRESS UPDATED
    else if (msg.type === 'piano:phrase_progress') {
      applyIncomingPhraseProgress(msg);
    }
    // LIVE VOICE STATUS UPDATE
    else if (msg.type === 'piano:voice_status') {
      setPeerVoiceActive(Boolean(msg.isActive));
      setPeerMicMuted(Boolean(msg.isMuted));
      if (msg.isActive) {
        syncRemoteAudioTracks();
        showToast(`🎙️ ${msg.sender || 'Interlocutore'} ha attivato il vivavoce audio!`);
      }
    }
  }, [username, instrument, isSimulatingStudentMode, socialSession?.userRole, applyIncomingTeacherPhrase, applyIncomingPhraseProgress, syncRemoteAudioTracks, showToast]);

  // P2P WebRTC PeerConnection + DataChannel Setup (Full-Duplex sendrecv audio + Instant SCTP notes)
  const getOrCreatePeerConnection = useCallback((isInitiator: boolean) => {
    let pc = peerConnectionRef.current;
    if (pc && pc.signalingState !== 'closed') {
      return pc;
    }

    pc = new RTCPeerConnection(WEBRTC_ICE_SERVERS);
    peerConnectionRef.current = pc;

    // 1. Remote audio stream handler
    pc.ontrack = (event) => {
      console.log('[WebRTC ontrack] Track received:', event.track.kind, event.track.id, event.streams);
      if (event.track.kind === 'audio') {
        syncRemoteAudioTracks(pc);
        event.track.onunmute = () => {
          console.log('[WebRTC Track Unmuted] Remote voice track is unmuted!');
          syncRemoteAudioTracks(pc);
        };
      }
    };

    // 2. ICE Candidates handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendRoomEvent('webrtc:candidate', { candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC State]', pc?.connectionState);
      if (pc?.connectionState === 'connected') {
        syncRemoteAudioTracks(pc);
      } else if (pc?.connectionState === 'failed') {
        try { pc.restartIce(); } catch (e) {}
      }
    };

    // 3. Only pre-create the audio transceiver on the Initiator!
    // On the Responder (isInitiator === false), setRemoteDescription(offer) will automatically
    // create the transceiver with mid !== null matching the Offer's m=audio section.
    if (isInitiator) {
      let audioTransceiver = getActiveAudioTransceiver(pc);
      if (!audioTransceiver) {
        audioTransceiver = pc.addTransceiver('audio', { direction: 'sendrecv' });
      } else {
        audioTransceiver.direction = 'sendrecv';
      }

      if (localVoiceStreamRef.current) {
        const audioTrack = localVoiceStreamRef.current.getAudioTracks()[0];
        if (audioTrack && audioTransceiver.sender) {
          audioTransceiver.sender.replaceTrack(audioTrack).catch(() => {});
        }
      }
    }

    // 4. Setup ultra-fast P2P DataChannel for notes
    const setupChannel = (channel: RTCDataChannel) => {
      dataChannelRef.current = channel;
      channel.onopen = () => {
        console.log('[WebRTC DataChannel] P2P channel connected and ready for zero-latency piano events');
      };
      channel.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          handleIncomingMessage(data);
        } catch (e) {}
      };
      channel.onclose = () => {
        if (dataChannelRef.current === channel) {
          dataChannelRef.current = null;
        }
      };
      channel.onerror = (err) => {
        console.warn('[WebRTC DataChannel] Error:', err);
      };
    };

    if (isInitiator) {
      try {
        const dc = pc.createDataChannel('piano_events', { ordered: true });
        setupChannel(dc);
      } catch (e) {}
    } else {
      pc.ondatachannel = (e) => {
        setupChannel(e.channel);
      };
    }

    return pc;
  }, [getActiveAudioTransceiver, syncRemoteAudioTracks, sendRoomEvent, handleIncomingMessage]);

  const initiateWebRTC = useCallback(async () => {
    try {
      let pc = peerConnectionRef.current;
      if (pc && (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected')) {
        try { pc.close(); } catch (e) {}
        peerConnectionRef.current = null;
      }
      pc = getOrCreatePeerConnection(true);
      if (pc.signalingState === 'have-local-offer' && pc.localDescription) {
        sendRoomEvent('webrtc:offer', { sdp: pc.localDescription });
        return;
      }
      if (pc.signalingState !== 'stable') return;
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      sendRoomEvent('webrtc:offer', { sdp: pc.localDescription });
    } catch (err) {
      console.warn('[WebRTC Initiate] Error:', err);
    }
  }, [getOrCreatePeerConnection, sendRoomEvent]);

  const handleRemoteOffer = useCallback(async (sdp: any) => {
    try {
      const pc = getOrCreatePeerConnection(false);

      // Handle offer collision (Perfect Negotiation rollback)
      if (pc.signalingState !== 'stable') {
        try {
          await pc.setLocalDescription({ type: 'rollback' } as any);
        } catch (e) {}
      }

      // 1. Set Remote Description FIRST so WebRTC associates the Offer's m=audio transceiver (mid !== null)
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // 2. Configure the associated audio transceiver as bidirectional sendrecv and attach local mic if active
      const audioTransceiver = getActiveAudioTransceiver(pc);
      if (audioTransceiver) {
        audioTransceiver.direction = 'sendrecv';
        if (localVoiceStreamRef.current) {
          const myTrack = localVoiceStreamRef.current.getAudioTracks()[0];
          if (myTrack && audioTransceiver.sender) {
            await audioTransceiver.sender.replaceTrack(myTrack).catch(() => {});
          }
        }
      }

      // 3. Flush queued ICE candidates
      if (pendingIceCandidatesRef.current.length > 0) {
        for (const c of pendingIceCandidatesRef.current) {
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
        }
        pendingIceCandidatesRef.current = [];
      }

      // 4. Create and send Answer with a=sendrecv
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendRoomEvent('webrtc:answer', { sdp: pc.localDescription });

      // 5. Ensure remote audio track is bound and playing
      syncRemoteAudioTracks(pc);
    } catch (err) {
      console.warn('[WebRTC handleRemoteOffer] Error:', err);
    }
  }, [getOrCreatePeerConnection, getActiveAudioTransceiver, sendRoomEvent, syncRemoteAudioTracks]);

  const handleRemoteAnswer = useCallback(async (sdp: any) => {
    try {
      const pc = peerConnectionRef.current;
      if (pc && pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        if (pendingIceCandidatesRef.current.length > 0) {
          for (const c of pendingIceCandidatesRef.current) {
            try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
          }
          pendingIceCandidatesRef.current = [];
        }
        syncRemoteAudioTracks(pc);
      }
    } catch (err) {
      console.warn('[WebRTC handleRemoteAnswer] Error:', err);
    }
  }, [syncRemoteAudioTracks]);

  const handleRemoteCandidate = useCallback(async (candidate: any) => {
    const pc = peerConnectionRef.current;
    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {}
    } else {
      pendingIceCandidatesRef.current.push(candidate);
    }
  }, []);

  // Real-time Dual-Channel Connection (WebSocket + HTTP Polling Fallback)
  useEffect(() => {
    if (!socialSession || !socialSession.roomId) return;

    let isMounted = true;
    const cleanRoomId = normalizeRoomCode(socialSession.roomId, socialSession.mode);
    const clientSessionId = getOrCreateClientId();

    const shouldInitiateWebRTCNow = () => {
      const pc = peerConnectionRef.current;
      if (!pc) return true;
      return (
        pc.signalingState === 'closed' ||
        pc.connectionState === 'failed' ||
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'closed' ||
        pc.signalingState === 'have-local-offer'
      );
    };

    // 1. Initial HTTP Registration
    fetch(getAppApiUrl('/api/room/join'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: cleanRoomId,
        username,
        role: socialSession.userRole,
        mode: socialSession.mode,
        clientId: clientSessionId,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (isMounted && Array.isArray(data.members)) {
          setConnectedPeersCount(data.members.length);
          setRoomMembers(data.members);
          if (data.members.length >= 2 && shouldInitiateWebRTCNow()) {
            const isTeacherRole = !isSimulatingStudentMode && (socialSession.userRole === 'maestro' || (socialSession.userRole as string) === 'teacher');
            if (isTeacherRole) {
              initiateWebRTC();
            }
          }
        }
        if (isMounted && data.lastTeacherPhrase && (!teacherAssignedPhraseRef.current || teacherAssignedPhraseRef.current.length === 0)) {
          applyIncomingTeacherPhrase(data.lastTeacherPhrase);
        }
      })
      .catch(() => {});

    // 2. HTTP Polling Fallback for Events & Presence (Every 1.5 seconds)
    const pollInterval = setInterval(async () => {
      if (!isMounted) return;
      try {
        const cParam = `&clientId=${encodeURIComponent(clientSessionId)}`;
        const res = await fetch(getAppApiUrl(`/api/room/${encodeURIComponent(cleanRoomId)}/events?since=${lastEventTimestampRef.current}${cParam}`));
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.events)) {
            for (const evt of data.events) {
              lastEventTimestampRef.current = Math.max(lastEventTimestampRef.current, evt.timestamp);
              const isSelf = evt.senderId === clientSessionId || evt.data?.senderId === clientSessionId || (username && (evt.sender === username || evt.data?.sender === username));
              if (isSelf) continue;

              if (evt.type === 'webrtc:offer' && (evt.data?.sdp || evt.sdp)) {
                handleRemoteOffer(evt.data?.sdp || evt.sdp);
              } else if (evt.type === 'webrtc:answer' && (evt.data?.sdp || evt.sdp)) {
                handleRemoteAnswer(evt.data?.sdp || evt.sdp);
              } else if (evt.type === 'webrtc:candidate' && (evt.data?.candidate || evt.candidate)) {
                handleRemoteCandidate(evt.data?.candidate || evt.candidate);
              } else if (evt.type === 'piano:key_event') {
                if ((!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
                  handleIncomingMessage(evt.data || evt);
                }
              } else {
                handleIncomingMessage(evt.data || evt);
              }
            }
          }
        }

        const stateRes = await fetch(getAppApiUrl(`/api/room/${encodeURIComponent(cleanRoomId)}/state?clientId=${encodeURIComponent(clientSessionId)}`));
        if (stateRes.ok) {
          const stateData = await stateRes.json();
          if (isMounted && Array.isArray(stateData.members)) {
            setConnectedPeersCount(stateData.members.length);
            setRoomMembers(stateData.members);
            if (stateData.members.length >= 2 && shouldInitiateWebRTCNow()) {
              const isTeacherRole = !isSimulatingStudentMode && (socialSession.userRole === 'maestro' || (socialSession.userRole as string) === 'teacher');
              if (isTeacherRole) {
                initiateWebRTC();
              }
            }
          }
        }
      } catch (e) {}
    }, 1500);

    // 3. WebSocket Real-Time Connection with Auto-Reconnect
    const wsUrl = getAppWebSocketUrl();
    let reconnectTimer: any = null;

    const connectWebSocket = () => {
      if (!isMounted) return;
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: 'room:join',
              roomId: cleanRoomId,
              username,
              role: socialSession.userRole,
              mode: socialSession.mode,
              clientId: clientSessionId,
            })
          );
        };

        ws.onmessage = async (event) => {
          try {
            const msg = JSON.parse(event.data);
            const isSelf = msg.senderId === clientSessionId || (username && msg.sender === username);
            if (isSelf) return;

            // Live room members update
            if (msg.type === 'room:state' && Array.isArray(msg.members)) {
              setConnectedPeersCount(msg.members.length);
              setRoomMembers(msg.members);
              if (msg.members.length >= 2 && shouldInitiateWebRTCNow()) {
                const isTeacherRole = !isSimulatingStudentMode && (socialSession.userRole === 'maestro' || (socialSession.userRole as string) === 'teacher');
                if (isTeacherRole) {
                  initiateWebRTC();
                }
              }
            }
            // Live voice WebRTC signaling
            else if (msg.type === 'webrtc:offer' && msg.sdp) {
              handleRemoteOffer(msg.sdp);
            }
            else if (msg.type === 'webrtc:answer' && msg.sdp) {
              handleRemoteAnswer(msg.sdp);
            }
            else if (msg.type === 'webrtc:candidate' && msg.candidate) {
              handleRemoteCandidate(msg.candidate);
            }
            // All other room events (piano keys, teacher phrase, progress, voice status)
            else {
              handleIncomingMessage(msg);
            }
          } catch (e) {}
        };

        ws.onclose = () => {
          if (isMounted) {
            reconnectTimer = setTimeout(connectWebSocket, 2000);
          }
        };

        ws.onerror = () => {
          try { ws.close(); } catch (e) {}
        };
      } catch (e) {
        if (isMounted) {
          reconnectTimer = setTimeout(connectWebSocket, 3000);
        }
      }
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(pollInterval);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (localVoiceStreamRef.current) {
        localVoiceStreamRef.current.getTracks().forEach((t) => t.stop());
        localVoiceStreamRef.current = null;
      }
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
        dataChannelRef.current = null;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (mediaRecorderRef.current) {
        try { mediaRecorderRef.current.stop(); } catch (e) {}
        mediaRecorderRef.current = null;
      }
    };
  }, [socialSession, username, initiateWebRTC, handleRemoteOffer, handleRemoteAnswer, handleRemoteCandidate, handleIncomingMessage, applyIncomingTeacherPhrase, isSimulatingStudentMode]);

  // Voice Call Helpers (Full-Duplex WebRTC with sendrecv Transceiver)
  const stopVoiceCall = useCallback(() => {
    if (localVoiceStreamRef.current) {
      localVoiceStreamRef.current.getTracks().forEach((t) => t.stop());
      localVoiceStreamRef.current = null;
    }
    const pc = peerConnectionRef.current;
    if (pc && pc.signalingState !== 'closed') {
      const audioTransceiver = getActiveAudioTransceiver(pc);
      if (audioTransceiver && audioTransceiver.sender) {
        audioTransceiver.sender.replaceTrack(null).catch(() => {});
      } else {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'audio');
        if (sender) sender.replaceTrack(null).catch(() => {});
      }
    }
    // KEEP peerConnectionRef and dataChannelRef ALIVE! Do NOT close them so piano notes flow seamlessly.
    setIsVoiceActive(false);
    setIsMicMuted(false);

    sendRoomEvent('piano:voice_status', { isActive: false, isMuted: true });
    showToast('🎙️ Microfono disattivato');
  }, [getActiveAudioTransceiver, sendRoomEvent, showToast]);

  const startVoiceCall = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('⚠️ Microfono non supportato in questo browser');
        return;
      }

      // Unlock and un-mute remote audio element immediately during user gesture click!
      if (!remoteAudioRef.current) {
        let audioEl = document.getElementById('remote-voice-audio-element') as HTMLAudioElement;
        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.id = 'remote-voice-audio-element';
          audioEl.autoplay = true;
          (audioEl as any).playsInline = true;
          (audioEl as any).webkitPlaysInline = true;
          audioEl.style.display = 'none';
          document.body.appendChild(audioEl);
        }
        remoteAudioRef.current = audioEl;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.play().catch(() => {});
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      localVoiceStreamRef.current = stream;
      setIsVoiceActive(true);
      setIsMicMuted(false);

      const micTrack = stream.getAudioTracks()[0];
      let pc = peerConnectionRef.current;

      if (!pc || pc.signalingState === 'closed' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        pc = getOrCreatePeerConnection(true);
      }

      let audioTransceiver = getActiveAudioTransceiver(pc);
      if (!audioTransceiver) {
        audioTransceiver = pc.addTransceiver(micTrack, { direction: 'sendrecv', streams: [stream] });
      } else {
        audioTransceiver.direction = 'sendrecv';
        if (audioTransceiver.sender) {
          await audioTransceiver.sender.replaceTrack(micTrack);
        } else {
          pc.addTrack(micTrack, stream);
        }
      }

      if (pc.signalingState === 'have-local-offer') {
        try {
          await pc.setLocalDescription({ type: 'rollback' } as any);
        } catch (e) {}
      }

      if (pc.signalingState === 'stable') {
        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        sendRoomEvent('webrtc:offer', { sdp: pc.localDescription });
      }

      syncRemoteAudioTracks(pc);
      sendRoomEvent('piano:voice_status', { isActive: true, isMuted: false });
      showToast('🎙️ Speakerphone Active! Both of you can speak and listen live');
    } catch (err: any) {
      console.warn('getUserMedia error:', err);
      showToast('⚠️ Microphone permission denied or unavailable');
    }
  }, [getOrCreatePeerConnection, getActiveAudioTransceiver, syncRemoteAudioTracks, sendRoomEvent, showToast]);

  const toggleMicMute = useCallback(() => {
    if (localVoiceStreamRef.current) {
      const audioTrack = localVoiceStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMuted = !audioTrack.enabled;
        setIsMicMuted(newMuted);
        sendRoomEvent('piano:voice_status', {
          isActive: isVoiceActive,
          isMuted: newMuted,
        });
        showToast(newMuted ? '🔇 Microphone muted' : '🎙️ Microphone active');
      }
    }
  }, [isVoiceActive, sendRoomEvent, showToast]);

  const handleSendTeacherPhrase = (openWaterfall: boolean = false, displayMode: 'arcade' | 'learn' | 'sheet' = 'arcade') => {
    if (recordedMasterclassNotes.length === 0) return;

    const simpleNotes = recordedMasterclassNotes.map((item) => item.note);
    const cleanRoomId = normalizeRoomCode(socialSession?.roomId || '', socialSession?.mode || 'masterclass');

    const phrasePayload = {
      type: 'piano:teacher_phrase',
      roomId: cleanRoomId,
      notes: simpleNotes,
      phraseData: recordedMasterclassNotes,
      openWaterfall,
      displayMode,
      sender: username,
    };
    const phraseJson = JSON.stringify(phrasePayload);

    // 1. Send via DataChannel if connected (P2P instant delivery)
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      try { dataChannelRef.current.send(phraseJson); } catch (e) {}
    }

    // 2. Send via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(phraseJson);
    }

    // 3. Send via HTTP event fallback
    fetch(getAppApiUrl(`/api/room/${encodeURIComponent(cleanRoomId)}/event`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: phraseJson,
    }).catch(() => {});

    if (openWaterfall) {
      const modeLabel = displayMode === 'sheet' ? 'Sheet Music (Staff)' : displayMode === 'learn' ? 'Learn' : 'Arcade';
      showToast(`🎼 Phrase sent to student in ${modeLabel} mode!`);
    } else {
      showToast(`${recordedMasterclassNotes.length}-note phrase sent to student!`);
    }
  };

  const handleOpenLocalPhraseWaterfall = (phraseItems: MasterclassNoteItem[], displayMode: 'arcade' | 'learn' = 'arcade') => {
    if (!phraseItems || phraseItems.length === 0) return;
    const song = createMasterclassWaterfallSong(phraseItems, `Teacher's Phrase (${phraseItems.length} notes)`);
    setMasterclassPlayMode(displayMode);
    setActiveSong(song);
    setShowWaterfall(true);
    showToast(`🎮 Opened ${displayMode === 'learn' ? 'Learn' : 'Arcade'} Waterfall mode!`);
  };

  const handlePlayMasterclassPhrase = (phraseItems: MasterclassNoteItem[]) => {
    if (!phraseItems || phraseItems.length === 0) return;
    showToast('🎵 Playing musical phrase with tempo...');

    let cumulativeTime = 0;
    phraseItems.forEach((item, idx) => {
      cumulativeTime += idx === 0 ? 0 : Math.max(120, item.delayMs || 350);
      setTimeout(() => {
        audioEngine.playNote(item.note, '8n', instrument);
        setKeyVisual(item.note, true);
        setTimeout(() => setKeyVisual(item.note, false), 220);
      }, cumulativeTime);
    });
  };

  const handleSimulateVirtualStudentReplay = () => {
    if (recordedMasterclassNotes.length === 0) return;
    showToast('🤖 Virtual Student listening... replicating phrase!');

    let cumulativeTime = 0;
    recordedMasterclassNotes.forEach((item, idx) => {
      cumulativeTime += idx === 0 ? 0 : Math.max(120, item.delayMs || 350);
      setTimeout(() => {
        audioEngine.playNote(item.note, '8n', instrument);
        setKeyVisual(item.note, true);
        setTimeout(() => setKeyVisual(item.note, false), 220);

        const current = idx + 1;
        const isDone = current === recordedMasterclassNotes.length;
        setStudentProgress({
          studentName: 'Virtual Student (Bot)',
          currentIndex: current,
          totalNotes: recordedMasterclassNotes.length,
          completed: isDone,
        });

        if (isDone) {
          setTimeout(() => {
            showToast("🎉 Virtual Student completed all notes successfully!");
          }, 300);
        }
      }, cumulativeTime);
    });
  };

  const handleRemoveMasterclassNoteAt = (index: number) => {
    setRecordedMasterclassNotes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveLastMasterclassNote = () => {
    setRecordedMasterclassNotes((prev) => prev.slice(0, -1));
  };

  const triggerNoteHit = useCallback((baseNote: string) => {
    const note = getTransposedNote(baseNote);
    audioEngine.playNote(note, '8n', instrument);
    window.dispatchEvent(new CustomEvent('piano:noteplayed', { detail: { note } }));

    if (centerAnimationRef.current !== 'none') {
      const midiPitch = noteNameToMidiNumber(note);
      freeStageAnimatorRef.current.triggerNote(midiPitch);
      videoFallbackAnimatorRef.current.triggerNote(midiPitch);
    }

    if (remoteAudioRef.current && remoteAudioRef.current.paused && remoteAudioRef.current.srcObject) {
      remoteAudioRef.current.play().catch(() => {});
    }

    notesCountRef.current = (notesCountRef.current || 0) + 1;

    const cleanRoomId = normalizeRoomCode(socialSession?.roomId || '', socialSession?.mode || 'masterclass');

    const isTeacherRole = !isSimulatingStudentMode && (socialSession?.userRole === 'maestro' || (socialSession?.userRole as string) === 'teacher');
    const effectiveRole = isTeacherRole ? 'maestro' : 'student';
    const isMasterclass = socialSession?.mode === 'masterclass';

    // In Masterclass mode: ONLY the student broadcasts live notes to the teacher.
    // The Maestro plays locally to compose phrases and passes them via "Invia Frase" or "Waterfall".
    const shouldBroadcastNote = !isMasterclass || effectiveRole === 'student';

    if (shouldBroadcastNote && cleanRoomId) {
      const clientSessionId = getOrCreateClientId();
      const eventMsg = {
        type: 'piano:key_event',
        roomId: cleanRoomId,
        sender: username,
        senderId: clientSessionId,
        note,
        eventType: 'down',
        channel: 'melody',
        timestamp: Date.now(),
      };
      const json = JSON.stringify(eventMsg);
      let sentP2P = false;

      // 1. Instant P2P WebRTC DataChannel (<10ms, handles rapid glissando without dropping or queuing)
      if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
        try {
          dataChannelRef.current.send(json);
          sentP2P = true;
        } catch (e) {
          sentP2P = false;
        }
      }

      // 2. Real-time WebSocket fallback
      if (!sentP2P && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(json);
      } else if (!sentP2P) {
        // 3. HTTP POST fallback only when both DataChannel and WebSocket are down
        fetch(getAppApiUrl(`/api/room/${encodeURIComponent(cleanRoomId)}/event`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: json,
        }).catch(() => {});
      }
    }

    // Masterclass: If user is Maestro (and not simulating student), record note into current phrase (up to 100 notes!)
    if (socialSession?.mode === 'masterclass' && effectiveRole === 'maestro') {
      const now = Date.now();
      setRecordedMasterclassNotes((prev) => {
        if (prev.length >= 100) return prev; // Extended limit to 100 notes!
        const delayMs = prev.length === 0 ? 0 : Math.min(4000, Math.max(80, now - lastMasterclassNoteTimeRef.current));
        lastMasterclassNoteTimeRef.current = now;
        return [...prev, { note, delayMs }];
      });
    }

    // Masterclass: If user is Allievo (or Maestro simulating student), check match against teacherAssignedPhrase
    if (socialSession?.mode === 'masterclass' && (effectiveRole === 'student' || teacherAssignedPhraseRef.current.length > 0)) {
      const targetPhrase = teacherAssignedPhraseRef.current;
      if (targetPhrase.length > 0) {
        const expectedItem = targetPhrase[studentMatchedIndexRef.current];
        const expectedNote = typeof expectedItem === 'string' ? expectedItem : expectedItem?.note;

        if (note === expectedNote) {
          const nextIdx = studentMatchedIndexRef.current + 1;
          setStudentMatchedIndex(nextIdx);
          studentMatchedIndexRef.current = nextIdx;

          const isDone = nextIdx >= targetPhrase.length;
          if (isDone) {
            showToast('🎉 Perfect! You replayed all notes accurately!');
          }

          const progressPayload = {
            type: 'piano:phrase_progress',
            roomId: cleanRoomId,
            currentIndex: nextIdx,
            totalNotes: targetPhrase.length,
            completed: isDone,
            sender: username,
          };
          const progressJson = JSON.stringify(progressPayload);

          // 1. DataChannel P2P progress
          if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
            try { dataChannelRef.current.send(progressJson); } catch (e) {}
          }

          // 2. WebSocket progress
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(progressJson);
          } else {
            // 3. HTTP fallback progress
            fetch(getAppApiUrl(`/api/room/${encodeURIComponent(cleanRoomId)}/event`), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: progressJson,
            }).catch(() => {});
          }
        }
      }
    }

    // Scales Gym: Interactive step-by-step practice matching
    if (activeScaleExercise && scaleMode === 'practice') {
      const expectedNote = activeScaleExercise.notes[scaleActiveIdx];
      if (note === expectedNote) {
        const next = scaleActiveIdx + 1;
        if (next >= activeScaleExercise.notes.length) {
          showToast(`🎉 Great job! You completed ${activeScaleExercise.name}!`);
          if (isScaleLoop) {
            setScaleActiveIdx(0);
          } else {
            setScaleActiveIdx(activeScaleExercise.notes.length - 1);
          }
        } else {
          setScaleActiveIdx(next);
        }
      }
    }

    // Ear Training Mini-Game interactive check
    if (isEarTrainingOpenRef.current && earTargetNotesRef.current.length > 0) {
      const targets = earTargetNotesRef.current;
      const curIdx = earMatchedIdxRef.current;
      const expected = targets[curIdx];
      if (expected) {
        if (note === expected) {
          const nextIdx = curIdx + 1;
          if (nextIdx >= targets.length) {
            const pts = earLevelRef.current === 'maestro' ? 250 : earLevelRef.current === 'expert' ? 150 : 100;
            setEarScore((s) => s + pts);
            setEarStreak((st) => {
              const nextSt = st + 1;
              setEarBestStreak((best) => {
                const updated = Math.max(best, nextSt);
                try {
                  localStorage.setItem('maestro_ear_best_streak', String(updated));
                } catch {}
                return updated;
              });
              return nextSt;
            });
            setEarFeedback({
              text: `✅ EXACT! It was ${targets.join(' → ')}! (+${pts} pts) — Next note incoming...`,
              type: 'correct',
            });
            earTargetNotesRef.current = [];
            setTimeout(() => {
              if (isEarTrainingOpenRef.current) {
                startNewEarRound();
              }
            }, 1100);
          } else {
            setEarMatchedIdx(nextIdx);
            earMatchedIdxRef.current = nextIdx;
            setEarFeedback({
              text: `✨ Note ${nextIdx}/${targets.length} matched (${expected})! Now guess note #${nextIdx + 1}...`,
              type: 'correct',
            });
          }
        } else {
          const playedKeyIdx = ALL_PIANO_KEYS.findIndex((k) => k.note === note);
          const expectedKeyIdx = ALL_PIANO_KEYS.findIndex((k) => k.note === expected);
          setEarStreak(0);
          if (playedKeyIdx !== -1 && expectedKeyIdx !== -1) {
            if (playedKeyIdx < expectedKeyIdx) {
              setEarFeedback({
                text: `⬆️ You played ${note}: the mystery note is HIGHER (go right 👉)`,
                type: 'higher',
              });
            } else {
              setEarFeedback({
                text: `⬇️ You played ${note}: the mystery note is LOWER (go left 👈)`,
                type: 'lower',
              });
            }
          }
        }
      }
    }

    if (isRecording) {
      const now = (Date.now() - recordStartTime) / 1000;
      recordedNotesRef.current.push({ note, time: now, duration: 0.5 });
    }
  }, [instrument, isRecording, recordStartTime, getTransposedNote, socialSession, isSimulatingStudentMode, showToast, activeScaleExercise, scaleMode, scaleActiveIdx, isScaleLoop, startNewEarRound]);

  const handleCanvasNoteDown = useCallback((baseNote: string) => {
    triggerNoteHit(baseNote);
  }, [triggerNoteHit]);

  const handleCanvasNoteUp = useCallback((baseNote: string) => {
    const note = getTransposedNote(baseNote);
    audioEngine.releaseNote(note);
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
      const blackHeight = rect.height * (showWaterfall ? 0.54 : 0.50);

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

  // Free Play Center Stage Animation loop (runs when waterfall is hidden and center animation is active)
  useEffect(() => {
    const shouldRun = !earTrainingStandalone && !(showWaterfall && activeSong) && centerAnimation !== 'none';
    if (!shouldRun) return;

    let rafId = 0;
    const renderFreeStage = (now: number) => {
      const canvas = freeStageCanvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const cssW = Math.max(120, Math.floor(rect.width));
        const cssH = Math.max(60, Math.floor(rect.height));
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const targetW = Math.floor(cssW * dpr);
        const targetH = Math.floor(cssH * dpr);
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);
          const bg = ctx.createLinearGradient(0, 0, 0, cssH);
          bg.addColorStop(0, '#040814');
          bg.addColorStop(1, '#091124');
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, cssW, cssH);

          freeStageAnimatorRef.current.draw(ctx, cssW, cssH, now, centerAnimationRef.current, {
            isCompact: cssH < 125,
            hitLineY: cssH - 2,
            isPlaying: true,
            opacity: 1,
          });
          ctx.restore();
        }
      }
      rafId = requestAnimationFrame(renderFreeStage);
    };

    rafId = requestAnimationFrame(renderFreeStage);
    return () => cancelAnimationFrame(rafId);
  }, [earTrainingStandalone, showWaterfall, activeSong, centerAnimation]);

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
        setKeyVisual(note, false);
        audioEngine.releaseNote(getTransposedNote(note));
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
  }, [findNoteAtPoint, clearAllPressedVisuals, triggerNoteHit, getTransposedNote]);

  const processTouchCoordinatesRef = useRef(processTouchCoordinates);
  processTouchCoordinatesRef.current = processTouchCoordinates;

  const clearAllPressedVisualsRef = useRef(clearAllPressedVisuals);
  clearAllPressedVisualsRef.current = clearAllPressedVisuals;

  const refreshKeyboardGeometryRef = useRef(refreshKeyboardGeometry);
  refreshKeyboardGeometryRef.current = refreshKeyboardGeometry;

  // Native non-passive touch event listeners for true 0ms mobile response
  useEffect(() => {
    const container = keyboardContainerRef.current;
    if (!container) return;

    const onNativeTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (!keyboardGeometryRef.current) {
        refreshKeyboardGeometryRef.current();
      }
      processTouchCoordinatesRef.current(e.touches);
    };

    const onNativeTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      processTouchCoordinatesRef.current(e.touches);
    };

    const onNativeTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 0) {
        clearAllPressedVisualsRef.current();
      } else {
        processTouchCoordinatesRef.current(e.touches);
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
  }, []);

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

      if (oldNote) {
        setKeyVisual(oldNote, false);
        audioEngine.releaseNote(getTransposedNote(oldNote));
        currentlyPressedNotesRef.current.delete(oldNote);
      }

      setKeyVisual(baseNote, true);
      currentlyPressedNotesRef.current.add(baseNote);
      triggerNoteHit(baseNote);
    }
  };

  const handleMouseLeaveKey = (baseNote: string) => {
    if (isMouseDownRef.current && currentMouseNoteRef.current === baseNote) {
      setKeyVisual(baseNote, false);
      audioEngine.releaseNote(getTransposedNote(baseNote));
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
        if (oldNote) {
          setKeyVisual(oldNote, false);
          audioEngine.releaseNote(getTransposedNote(oldNote));
          currentlyPressedNotesRef.current.delete(oldNote);
        }
        setKeyVisual(note, true);
        currentlyPressedNotesRef.current.add(note);
        triggerNoteHit(note);
      } else if (!note && currentMouseNoteRef.current) {
        setKeyVisual(currentMouseNoteRef.current, false);
        audioEngine.releaseNote(getTransposedNote(currentMouseNoteRef.current));
        currentlyPressedNotesRef.current.delete(currentMouseNoteRef.current);
        currentMouseNoteRef.current = null;
      }
    };

    const onWindowMouseUp = () => {
      if (isMouseDownRef.current) {
        isMouseDownRef.current = false;
        if (currentMouseNoteRef.current) {
          setKeyVisual(currentMouseNoteRef.current, false);
          audioEngine.releaseNote(getTransposedNote(currentMouseNoteRef.current));
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
  }, [findNoteAtPoint, triggerNoteHit, getTransposedNote]);

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
        audioEngine.releaseNote(custom.detail.note);
        if (!sustainRef.current) {
          setKeyVisual(custom.detail.note, false);
        }
        currentlyPressedNotesRef.current.delete(custom.detail.note);
      }
    };

    const handleMidiSustain = (e: Event) => {
      const custom = e as CustomEvent<{ sustain: boolean }>;
      if (custom.detail?.sustain !== undefined) {
        const isSus = Boolean(custom.detail.sustain);
        setSustain(isSus);
        sustainRef.current = isSus;
        audioEngine.setSustain(isSus);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        setSustain(true);
        sustainRef.current = true;
        audioEngine.setSustain(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        setSustain(false);
        sustainRef.current = false;
        audioEngine.setSustain(false);
      }
    };

    window.addEventListener('piano:midinotedown', handleMidiDown);
    window.addEventListener('piano:midinoteup', handleMidiUp);
    window.addEventListener('piano:midisustain', handleMidiSustain);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      unsubMidi();
      window.removeEventListener('piano:gamificationupdate', handleGamification);
      window.removeEventListener('piano:midinotedown', handleMidiDown);
      window.removeEventListener('piano:midinoteup', handleMidiUp);
      window.removeEventListener('piano:midisustain', handleMidiSustain);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [triggerNoteHit]);

  // Toggle Acoustic Microphone Pitch Detection
  const toggleMicrophonePitch = async () => {
    if (isMicListening) {
      pitchDetector.stop();
      setIsMicListening(false);
      micActiveNotesRef.current.forEach((_, note) => {
        if (!sustainRef.current) {
          setKeyVisual(note, false);
          currentlyPressedNotesRef.current.delete(note);
        }
      });
      micActiveNotesRef.current.clear();
    } else {
      try {
        const ok = await pitchDetector.start((detectedNote) => {
          const note = getTransposedNote(detectedNote);
          const now = performance.now();
          micActiveNotesRef.current.set(note, now);
          if (!currentlyPressedNotesRef.current.has(note)) {
            setKeyVisual(note, true);
            currentlyPressedNotesRef.current.add(note);
            window.dispatchEvent(
              new CustomEvent('piano:noteplayed', { detail: { note, source: 'mic' } })
            );
          }
        });
        setIsMicListening(ok);
        if (!ok) {
          alert("Microphone permission denied or unsupported by browser. Please allow microphone access in your browser/site settings.");
        }
      } catch (err: any) {
        setIsMicListening(false);
        alert(`Microphone error: ${err?.message || "Unable to access microphone."}`);
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

  const handleStartPianoRecording = () => {
    setIsLibraryOpen(false);
    if (!isRecording) {
      recordedNotesRef.current = [];
      setRecordStartTime(Date.now());
      setIsRecording(true);
      showToast('🔴 Recording started! Play freely on the piano.');
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

  // Track exact visible browser viewport (handles mobile Chrome/Safari top URL bar without clipping bottom keys)
  const [viewportBox, setViewportBox] = useState<{ height: number; offsetTop: number }>(() => ({
    height: typeof window !== 'undefined' ? (window.visualViewport?.height || window.innerHeight) : 0,
    offsetTop: typeof window !== 'undefined' ? (window.visualViewport?.offsetTop || 0) : 0,
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateViewport = () => {
      const vv = window.visualViewport;
      const nextH = Math.round(vv ? vv.height : window.innerHeight);
      const nextTop = Math.round(vv ? vv.offsetTop : 0);
      setViewportBox((prev) =>
        prev.height === nextH && prev.offsetTop === nextTop
          ? prev
          : { height: nextH, offsetTop: nextTop }
      );
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport);
      window.visualViewport.addEventListener('scroll', updateViewport);
    }

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewport);
        window.visualViewport.removeEventListener('scroll', updateViewport);
      }
    };
  }, []);

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: viewportBox.offsetTop > 0 ? `${viewportBox.offsetTop}px` : 0,
    left: 0,
    right: 0,
    width: '100vw',
    height: viewportBox.height > 0 ? `${viewportBox.height}px` : '100dvh',
    maxHeight: '100dvh',
    zIndex: 50,
    boxSizing: 'border-box',
    overflow: 'hidden',
    touchAction: 'none',
  };

  return (
    <div
      ref={stageContainerRef}
      style={containerStyle}
      className="bg-slate-950 flex flex-col h-full w-full overflow-hidden select-none touch-none p-0 m-0"
    >
      {/* ULTRA-COMPACT SINGLE-ROW TOP BAR (Hidden in dedicated Ear Training mode) */}
      {!earTrainingStandalone && (
        <div
          style={{
            paddingTop: 'max(env(safe-area-inset-top, 0px), 2px)',
            paddingLeft: 'max(env(safe-area-inset-left, 0px), 6px)',
            paddingRight: 'max(env(safe-area-inset-right, 0px), 6px)',
          }}
          className="h-8 min-h-[32px] max-h-[34px] bg-slate-900/95 border-b border-slate-800/80 px-1 sm:px-2 flex items-center justify-between flex-nowrap overflow-x-auto scrollbar-none shrink-0 z-20 text-[10px] sm:text-[11px]"
        >
          {/* Left: Essential navigation and toggles */}
          <div className="flex items-center gap-1 shrink-0 flex-nowrap">
            {socialSession ? (
              <button
                onClick={handleExitToSocialResults}
                className="px-2 py-0.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 text-white font-black rounded-md flex items-center gap-1 shadow transition-all active:scale-95 animate-pulse cursor-pointer text-[10px]"
                title="Esci dal duello e vedi esiti"
              >
                <span>🏁 ESCI ({socialSession.roomId})</span>
              </button>
            ) : (
              <button
                onClick={onBackToHome}
                className="px-2 py-0.5 text-slate-200 hover:text-white bg-slate-800/90 hover:bg-slate-700 border border-amber-500/30 rounded-md flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                title="Back to Main Menu / Guide"
              >
                <Home className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-bold">Menu</span>
              </button>
            )}

            {/* Sheets / Library */}
            <button
              onClick={() => setIsLibraryOpen(true)}
              className="px-1.5 sm:px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-md flex items-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Open song & sheet library"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Library</span>
            </button>

            {/* Scales Gym Button */}
            {onOpenScalesModal && (
              <button
                onClick={onOpenScalesModal}
                className={`px-1.5 sm:px-2 py-0.5 rounded-md flex items-center gap-1 font-bold text-[10px] transition-all cursor-pointer ${
                  activeScaleExercise
                    ? 'bg-amber-500 text-slate-950 font-black shadow ring-1 ring-amber-300'
                    : 'bg-slate-800/80 hover:bg-slate-750 text-amber-300 border border-amber-500/30'
                }`}
                title="Scales & Fingering Gym"
              >
                <Layers className="w-3 h-3 text-amber-400" />
                <span className="hidden xs:inline">Scales</span>
              </button>
            )}

            {/* Chord Detector Button */}
            <button
              onClick={() => setIsChordDetectorOpen(true)}
              className="px-1.5 sm:px-2 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 rounded-md flex items-center gap-1 font-bold text-[10px] transition-all cursor-pointer"
              title="Real-Time Chord Detector"
            >
              <Music className="w-3 h-3 text-amber-400" />
              <span className="hidden xs:inline">Chords</span>
            </button>

            {/* Toggle Falling Notes (ON / OFF) */}
            <button
              onClick={() => {
                const next = !showWaterfall;
                setShowWaterfall(next);
                if (!next) {
                  setSongGuidance(null);
                  setKeyboardDamageLevel(0);
                  setBombBlastSeq(0);
                }
              }}
              className={`px-2 py-0.5 font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                showWaterfall
                  ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 shadow-sm'
                  : 'bg-slate-800/90 hover:bg-slate-750 text-slate-300 border border-slate-700'
              }`}
              title={showWaterfall ? 'Falling Notes ACTIVE. Click to hide (Piano only)' : 'Show Falling Notes (Waterfall)'}
            >
              <Sparkles className={`w-3 h-3 ${showWaterfall ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>Notes {showWaterfall ? 'ON' : 'OFF'}</span>
            </button>

            {keyboardDamageLevel > 0 && (
              <button
                onClick={() => {
                  setKeyboardDamageLevel(0);
                  setBombBlastSeq(0);
                  showToast('🔧 Piano keyboard repaired!');
                }}
                className="px-1.5 sm:px-2 py-0.5 bg-orange-500/25 hover:bg-orange-500/40 border border-orange-400/60 text-orange-200 font-black rounded-md flex items-center gap-1 transition-all cursor-pointer shrink-0 animate-pulse"
                title="Repair shattered piano keys"
              >
                <span>🔧</span>
                <span className="hidden sm:inline">Repair</span>
              </button>
            )}
          </div>

          {/* Center: Song info or Title */}
          <div className="flex items-center gap-1.5 min-w-0 px-2 justify-center truncate">
            {activeSong ? (
              <div className="flex items-center gap-1 font-semibold text-slate-200 text-[10px] sm:text-[11px] truncate">
                <span className="text-amber-400 truncate max-w-[120px] sm:max-w-[200px] font-bold">
                  🎵 {activeSong.title}
                </span>
                <span className="text-slate-400 hidden md:inline truncate">&bull; {activeSong.author}</span>
              </div>
            ) : (
              <span className="font-bold text-slate-400 text-[10px] sm:text-[11px] truncate tracking-wide hidden sm:inline">
                🎹 VirtuKeys Piano Studio
              </span>
            )}
          </div>

          {/* Right: Sustain, Rec & Options 3-dots */}
          <div className="flex items-center gap-1 shrink-0 flex-nowrap">
            {/* Record button */}
            <button
              onClick={toggleRecording}
              className={`px-1.5 sm:px-2 py-0.5 font-bold rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
                isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 hover:bg-slate-750 text-slate-300'
              }`}
              title={isRecording ? 'Stop recording' : 'Record performance'}
            >
              <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-white' : 'bg-red-500'}`} />
              <span className="hidden sm:inline">{isRecording ? 'Stop' : 'Rec'}</span>
            </button>

            {/* Video Recording Button with 2 Options (Vertical Reel 9:16 vs Horizontal 16:9 with Rotate Banner) */}
            <div>
              {isReelRecording ? (
                <button
                  onClick={stopReelVideoRecording}
                  className="px-1.5 sm:px-2 py-0.5 font-extrabold rounded-md border flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap bg-rose-600 border-rose-400 text-white animate-pulse shadow-lg shadow-rose-600/40"
                  title="Stop video recording and open preview"
                >
                  <span>⏹️</span>
                  <span>{`Stop ${Math.floor(reelRecordSeconds / 60)}:${String(reelRecordSeconds % 60).padStart(2, '0')}`}</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsVideoMenuOpen((prev) => !prev)}
                  className="px-1.5 sm:px-2 py-0.5 font-extrabold rounded-md border flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap bg-gradient-to-r from-fuchsia-600/90 to-amber-500/90 hover:from-fuchsia-500 hover:to-amber-400 border-amber-300/50 text-white shadow-sm"
                  title="Choose video format: Vertical 9:16 for Reels/TikTok or Horizontal 16:9 with 'Rotate Phone' intro"
                >
                  <span>🎬</span>
                  <span>Video</span>
                  <span className="text-[9px] opacity-80">▾</span>
                </button>
              )}
            </div>

            {/* Sustain pedal toggle */}
            <button
              onClick={() => {
                const next = !sustain;
                setSustain(next);
                audioEngine.setSustain(next);
              }}
              className={`px-1.5 sm:px-2 py-0.5 font-semibold rounded-md border transition-colors cursor-pointer ${
                sustain
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-white'
              }`}
              title="Sustain (Pedal)"
            >
              Sustain
            </button>

            {/* Quick 1-Tap Keyboard Style Switcher Button */}
            {onThemeChange && (
              <button
                onClick={() => {
                  const order: StudioTheme[] = [
                    'midnight',
                    'mahogany',
                    'marble',
                    'gold',
                    'carbon',
                    'neon',
                    'rainbow',
                    'animals',
                    'candy',
                    'emerald',
                    'ruby',
                    'sapphire',
                    'amethyst',
                  ];
                  const nextIdx = (order.indexOf(studioTheme) + 1) % order.length;
                  onThemeChange(order[nextIdx]);
                }}
                className="px-1.5 sm:px-2 py-0.5 font-bold rounded-md border bg-slate-800/90 hover:bg-slate-700 border-amber-500/30 text-amber-300 transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
                title="Change keyboard style and design"
              >
                <span>
                  {studioTheme === 'mahogany'
                    ? '🪵'
                    : studioTheme === 'marble'
                    ? '🏛️'
                    : studioTheme === 'gold'
                    ? '👑'
                    : studioTheme === 'emerald'
                    ? '💎'
                    : studioTheme === 'ruby'
                    ? '🔥'
                    : studioTheme === 'sapphire'
                    ? '❄️'
                    : studioTheme === 'amethyst'
                    ? '🔮'
                    : studioTheme === 'carbon'
                    ? '🏎️'
                    : studioTheme === 'neon'
                    ? '⚡'
                    : studioTheme === 'rainbow'
                    ? '🌈'
                    : studioTheme === 'animals'
                    ? '🐾'
                    : studioTheme === 'candy'
                    ? '🍭'
                    : '🎹'}
                </span>
                <span className="hidden md:inline text-[10px]">
                  {studioTheme === 'mahogany'
                    ? 'Wood'
                    : studioTheme === 'marble'
                    ? 'Marble'
                    : studioTheme === 'gold'
                    ? 'Gold'
                    : studioTheme === 'emerald'
                    ? 'Jade'
                    : studioTheme === 'ruby'
                    ? 'Ruby'
                    : studioTheme === 'sapphire'
                    ? 'Sapphire'
                    : studioTheme === 'amethyst'
                    ? 'Amethyst'
                    : studioTheme === 'carbon'
                    ? 'Carbon'
                    : studioTheme === 'neon'
                    ? 'Neon'
                    : studioTheme === 'rainbow'
                    ? 'Rainbow'
                    : studioTheme === 'animals'
                    ? 'Pet'
                    : studioTheme === 'candy'
                    ? 'Candy'
                    : 'Ivory'}
                </span>
              </button>
            )}

            {/* 3-DOTS OPTIONS MODAL BUTTON (Metronome, Volume, Keys, etc.) */}
            <button
              onClick={() => setIsOptionsModalOpen(true)}
              className="p-1 px-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/40 rounded-md transition-all flex items-center gap-1 cursor-pointer"
              title="All options and tools (Metronome, Volume, Keys, Microphone...)"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
              {isPianoMetronomeActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 border border-amber-300 animate-in fade-in slide-in-from-top-3 text-xs sm:text-sm pointer-events-none">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 👂 ORECCHIO ASSOLUTO (EAR TRAINING STANDALONE TOP BAR - STRICT SINGLE ROW) */}
      {(earTrainingStandalone || isEarTrainingOpen) && (
        <div
          style={{
            paddingTop: 'max(env(safe-area-inset-top, 0px), 2px)',
            paddingLeft: 'max(env(safe-area-inset-left, 0px), 6px)',
            paddingRight: 'max(env(safe-area-inset-right, 0px), 6px)',
          }}
          className="h-9 min-h-[36px] max-h-[38px] bg-gradient-to-r from-slate-900 via-fuchsia-950/75 to-slate-900 border-b border-fuchsia-500/50 px-2 flex items-center justify-between gap-1.5 shrink-0 z-20 text-[10px] sm:text-xs shadow-xl flex-nowrap overflow-x-auto scrollbar-none"
        >
          {/* Left: Back to Menu, Level Selector & Feedback */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-nowrap">
            <button
              onClick={onBackToHome}
              className="px-2 py-0.5 text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md flex items-center gap-1 transition-colors cursor-pointer shrink-0 font-bold whitespace-nowrap"
              title="Back to Main Menu"
            >
              <Home className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Menu</span>
            </button>

            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-md p-0.5 text-[9px] sm:text-[10px] font-bold shrink-0 flex-nowrap">
              {([
                { id: 'base', label: '🌱 Basic' },
                { id: 'expert', label: '🔥 Expert' },
                { id: 'maestro', label: '🏆 3 Notes' },
              ] as const).map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => {
                    setEarLevel(lvl.id);
                    earLevelRef.current = lvl.id;
                    startNewEarRound(lvl.id);
                  }}
                  className={`px-1.5 sm:px-2 py-0.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                    earLevel === lvl.id
                      ? 'bg-amber-500 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>

            <div
              className={`font-bold truncate px-2 py-0.5 rounded-md border text-[10px] sm:text-xs flex-1 min-w-[90px] ${
                earFeedback.type === 'correct'
                  ? 'bg-emerald-950/90 border-emerald-400/60 text-emerald-300'
                  : earFeedback.type === 'higher' || earFeedback.type === 'lower'
                  ? 'bg-amber-950/90 border-amber-400/60 text-amber-300'
                  : 'bg-slate-900/90 border-slate-700 text-slate-200'
              }`}
            >
              {earFeedback.text}
              {earHintShown && earTargetNotes[earMatchedIdx] && (
                <span className="ml-1.5 text-fuchsia-300 font-black">
                  (Hint: {earTargetNotes[earMatchedIdx].slice(0, -1)} • octave {earTargetNotes[earMatchedIdx].slice(-1)})
                </span>
              )}
            </div>
          </div>

          {/* Right: Single-Row Ear Training Controls Only */}
          <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
            <button
              onClick={() => playEarMysterySequence(earTargetNotes)}
              className="px-2.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-md text-[10px] sm:text-xs flex items-center gap-1 shadow cursor-pointer whitespace-nowrap shrink-0"
              title="Listen to the mystery note or sequence"
            >
              <Volume2 className="w-3.5 h-3.5 shrink-0" />
              <span>Listen</span>
            </button>

            <button
              onClick={() => setEarHintShown(true)}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-fuchsia-300 border border-fuchsia-500/40 rounded-md text-[10px] font-bold cursor-pointer whitespace-nowrap shrink-0"
              title="Show a hint for the mystery note"
            >
              💡 Hint
            </button>

            <button
              onClick={() => startNewEarRound()}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[10px] font-bold cursor-pointer whitespace-nowrap shrink-0"
              title="Skip to next mystery note"
            >
              Skip
            </button>

            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-mono whitespace-nowrap shrink-0">
              <span className="text-amber-400 font-black">⭐ {earScore}</span>
              <span className="text-emerald-400 font-bold">🔥 {earStreak}</span>
            </div>
          </div>
        </div>
      )}

      {/* SCALES GYM & TRANSPARENT HAND HUD BAR */}
      {activeScaleExercise && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border-b-2 border-amber-500/60 px-2 sm:px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 z-20 text-[10px] sm:text-xs shadow-xl flex-wrap sm:flex-nowrap">
          {/* Left: Exercise Name & Live Note/Finger Badge */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center shrink-0 font-black shadow-md shadow-amber-500/30">
              <Hand className="w-4 h-4 animate-bounce" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-amber-300 truncate">{activeScaleExercise.name}</span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded text-[9px] font-bold">
                  {activeScaleExercise.difficulty}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-300 mt-0.5">
                <span className="bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-amber-400">
                  🎵 Note: {activeScaleExercise.notes[scaleActiveIdx]}
                </span>
                <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded font-bold">
                  🖐️ Finger {activeScaleExercise.fingering[scaleActiveIdx % activeScaleExercise.fingering.length]} (
                  {FINGER_NAMES[activeScaleExercise.fingering[scaleActiveIdx % activeScaleExercise.fingering.length]]?.name || 'Finger'}
                  )
                </span>
                <span className="hidden md:inline text-slate-400 text-[9px]">
                  Step {scaleActiveIdx + 1} / {activeScaleExercise.notes.length}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Controls (Play/Pause, Step navigation, BPM, Mode) */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Mode switch */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[9px] sm:text-[10px] font-bold">
              <button
                onClick={() => {
                  setScaleMode('demo');
                  setIsScaleAutoplay(true);
                }}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  scaleMode === 'demo'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Transparent Hand automatically plays the scale"
              >
                🤖 Demo
              </button>
              <button
                onClick={() => {
                  setScaleMode('practice');
                  setIsScaleAutoplay(false);
                }}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  scaleMode === 'practice'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Hand guides you and waits until you play the right note"
              >
                🎯 Step-by-Step
              </button>
            </div>

            {/* Step navigation & Play/Pause (in demo mode) */}
            {scaleMode === 'demo' ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setIsScaleAutoplay(false);
                    setScaleActiveIdx((prev) => Math.max(0, prev - 1));
                  }}
                  className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                  title="Previous note"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setIsScaleAutoplay(!isScaleAutoplay)}
                  className={`px-2.5 py-1 rounded-lg font-black text-[10px] flex items-center gap-1 cursor-pointer transition-all ${
                    isScaleAutoplay
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                      : 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                  }`}
                  title={isScaleAutoplay ? 'Pause' : 'Start hand playback'}
                >
                  {isScaleAutoplay ? (
                    <>
                      <Square className="w-3 h-3 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      <span>Start Hand</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setIsScaleAutoplay(false);
                    setScaleActiveIdx((prev) => (prev + 1) % activeScaleExercise.notes.length);
                  }}
                  className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                  title="Next note"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded text-emerald-300 font-bold text-[10px] animate-pulse">
                <span>👉 Play {activeScaleExercise.notes[scaleActiveIdx]} with finger {activeScaleExercise.fingering[scaleActiveIdx % activeScaleExercise.fingering.length]}</span>
              </div>
            )}

            {/* BPM Slider */}
            <div className="hidden xs:flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-lg">
              <span className="text-[9px] text-slate-400 font-bold">BPM:</span>
              <input
                type="range"
                min="40"
                max="140"
                value={scaleBpm}
                onChange={(e) => setScaleBpm(parseInt(e.target.value))}
                className="w-16 h-1 accent-amber-500 bg-slate-700 rounded cursor-pointer"
              />
              <span className="font-mono font-bold text-amber-300 text-[10px] w-8">{scaleBpm}</span>
            </div>

            {/* Loop Toggle */}
            <button
              onClick={() => setIsScaleLoop(!isScaleLoop)}
              className={`p-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                isScaleLoop
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400'
              }`}
              title={isScaleLoop ? 'Continuous Loop Active' : 'Loop Disabled'}
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isScaleLoop ? 'text-amber-400' : 'text-slate-400'}`} />
            </button>

            {/* Center Hand / View */}
            <button
              onClick={() => centerKeyboardOnScale(activeScaleExercise)}
              className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
              title="Center keyboard on hand position and scale"
            >
              <span>🎯 Center</span>
            </button>

            {/* Change Scale */}
            {onOpenScalesModal && (
              <button
                onClick={onOpenScalesModal}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-[10px] font-bold border border-slate-700 cursor-pointer"
                title="Choose another scale"
              >
                Change
              </button>
            )}

            {/* Close Scale Gym */}
            {onCloseScaleExercise && (
              <button
                onClick={onCloseScaleExercise}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Close Scale Gym"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* MASTERCLASS CONSOLE BAR (Maestro e Allievo) */}
      {socialSession?.mode === 'masterclass' && (() => {
        const isTeacherRole = !isSimulatingStudentMode && (socialSession?.userRole === 'maestro' || (socialSession?.userRole as string) === 'teacher');
        const effectiveRole = isTeacherRole ? 'maestro' : 'student';
        return (
          <div className="bg-slate-900/95 border-b border-amber-500/30 px-2 sm:px-3 py-1.5 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 z-20 overflow-x-auto scrollbar-none text-[10px] sm:text-xs">
            {/* TEACHER (MAESTRO) VIEW */}
            {effectiveRole === 'maestro' ? (
              <div className="flex items-center justify-between w-full gap-2 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto max-w-full py-0.5">
                  <span className="font-black text-amber-400 uppercase text-[9px] sm:text-[10px] bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 whitespace-nowrap">
                    👑 Teacher Console
                  </span>
                  <span className="font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 text-[9px] sm:text-[10px] font-bold flex items-center gap-1 whitespace-nowrap">
                    <span className={`w-1.5 h-1.5 rounded-full ${connectedPeersCount >= 2 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <span>Room {socialSession.roomId}</span>
                  </span>

                  {connectedPeersCount >= 2 ? (
                    <span className="bg-emerald-950/80 border border-emerald-400/60 px-2 py-0.5 rounded text-emerald-300 font-bold text-[9px] sm:text-[10px] flex items-center gap-1 whitespace-nowrap animate-pulse">
                      <span>🟢 Student Connected</span>
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded text-amber-300 font-bold text-[9px] sm:text-[10px] flex items-center gap-1 whitespace-nowrap">
                        <span className="animate-spin text-[8px]">⏳</span>
                        <span>Waiting for Student (Code: <strong>{socialSession.roomId.replace('MASTERCLASS-', '')}</strong>)</span>
                      </span>
                      <button
                        onClick={handleQuickCopyStudentLink}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[9px] sm:text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Copy student invite link"
                      >
                        {copiedLinkState ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-amber-400" />}
                        <span>{copiedLinkState ? 'Copied!' : 'Link 📋'}</span>
                      </button>
                      <button
                        onClick={handleQuickShareWhatsApp}
                        className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[9px] sm:text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow"
                        title="Send link to student on WhatsApp"
                      >
                        <MessageCircle className="w-3 h-3 fill-white" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  )}

                  <span className="text-[10px] text-slate-400 font-bold hidden md:inline">Phrase:</span>
                  {recordedMasterclassNotes.length === 0 ? (
                    <span className="text-slate-500 italic text-[10px]">Play up to 100 notes on the piano...</span>
                  ) : (
                    <div className="flex items-center gap-1 font-mono font-bold text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 overflow-x-auto max-w-[280px] sm:max-w-[420px] scrollbar-none">
                      {recordedMasterclassNotes.map((item, idx) => (
                        <span
                          key={idx}
                          className="group relative inline-flex items-center gap-0.5 bg-amber-500/20 hover:bg-amber-500/30 px-1.5 py-0.5 rounded text-amber-200 border border-amber-500/30 text-[10px] font-mono font-bold transition-all whitespace-nowrap"
                        >
                          <span>{item.note}</span>
                          <button
                            onClick={() => handleRemoveMasterclassNoteAt(idx)}
                            title="Delete this note"
                            className="text-amber-400 hover:text-red-400 font-bold ml-0.5 px-0.5 rounded cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
                  {recordedMasterclassNotes.length > 0 && (
                    <>
                      <button
                        onClick={handleRemoveLastMasterclassNote}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded font-bold text-[10px] cursor-pointer"
                        title="Delete last inserted note"
                      >
                        ⌫ Delete Last
                      </button>

                      <button
                        onClick={() => setRecordedMasterclassNotes([])}
                        className="px-2 py-0.5 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/50 rounded font-bold text-[10px] cursor-pointer"
                        title="Clear all recorded notes"
                      >
                        🗑️ Clear
                      </button>

                      <button
                        onClick={() => handlePlayMasterclassPhrase(recordedMasterclassNotes)}
                        className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded font-bold text-[10px] cursor-pointer flex items-center gap-1"
                        title="Listen to phrase with exact timing and rhythm"
                      >
                        🔊 Listen Rhythm
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleSendTeacherPhrase(false)}
                    disabled={recordedMasterclassNotes.length === 0}
                    className="px-2 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-extrabold rounded-lg shadow flex items-center gap-1 text-[10px] cursor-pointer whitespace-nowrap"
                    title="Send phrase to student in standard note/text mode"
                  >
                    <span>📤 SEND NOTES</span>
                  </button>

                  <button
                    onClick={() => handleSendTeacherPhrase(true, 'arcade')}
                    disabled={recordedMasterclassNotes.length === 0}
                    className="px-2.5 py-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 hover:brightness-110 disabled:opacity-40 text-white font-black rounded-lg shadow-lg flex items-center gap-1 text-[10px] cursor-pointer whitespace-nowrap animate-pulse"
                    title="Send in continuous Arcade mode (free flow)"
                  >
                    <span>🎮 SEND ARCADE WATERFALL</span>
                  </button>

                  <button
                    onClick={() => handleSendTeacherPhrase(true, 'learn')}
                    disabled={recordedMasterclassNotes.length === 0}
                    className="px-2 py-1 bg-gradient-to-r from-amber-600 to-emerald-600 hover:brightness-110 disabled:opacity-40 text-white font-black rounded-lg shadow-lg flex items-center gap-1 text-[10px] cursor-pointer whitespace-nowrap"
                    title="Send in Learn mode (pauses at each note until student plays it)"
                  >
                    <span>🎯 SEND LEARN WATERFALL</span>
                  </button>

                  <button
                    onClick={() => handleSendTeacherPhrase(true, 'sheet')}
                    disabled={recordedMasterclassNotes.length === 0}
                    className="px-2.5 py-1 bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-500 hover:brightness-110 disabled:opacity-40 text-slate-950 font-black rounded-lg shadow-lg flex items-center gap-1 text-[10px] cursor-pointer whitespace-nowrap animate-pulse"
                    title="Send to student as synced scrolling staff (Sheet Music)"
                  >
                    <span>🎼 SEND SHEET</span>
                  </button>

                  {recordedMasterclassNotes.length > 0 && (
                    <button
                      onClick={() => handleOpenLocalPhraseWaterfall(recordedMasterclassNotes, 'arcade')}
                      className="px-2 py-1 bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/40 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      title="Test your played phrase in top-down falling notes view"
                    >
                      <span>🎮 Try Waterfall</span>
                    </button>
                  )}

                  <button
                    onClick={handleSimulateVirtualStudentReplay}
                    disabled={recordedMasterclassNotes.length === 0}
                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    title="Simulate student bot note replay and sound"
                  >
                    <span>🤖 Simulate Bot</span>
                  </button>

                  <button
                    onClick={() => setIsSimulatingStudentMode(true)}
                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    title="Step into student's shoes to test phrase and play notes"
                  >
                    <span>👁️ Simulate Student View</span>
                  </button>

                  {/* VIVAVOCE VOCALE AUDIO CONTROLS (MAESTRO) */}
                  <div className="flex items-center gap-1 bg-slate-950/90 border border-slate-800 rounded-lg p-0.5 shrink-0">
                    {!isVoiceActive ? (
                      <button
                        onClick={startVoiceCall}
                        className="px-2 py-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 active:scale-95 text-white font-black rounded text-[10px] flex items-center gap-1 cursor-pointer shadow transition-all whitespace-nowrap"
                        title="Enable audio speakerphone to speak live via microphone with student"
                      >
                        <span>🎙️ Enable Voice</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={toggleMicMute}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                            isMicMuted
                              ? 'bg-red-950 text-red-300 border border-red-700/60'
                              : 'bg-emerald-500 text-slate-950 font-black shadow animate-pulse'
                          }`}
                          title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
                        >
                          <span>{isMicMuted ? '🔇 Muted' : '🎙️ Voice On'}</span>
                        </button>

                        <button
                          onClick={stopVoiceCall}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-red-300 rounded text-[10px] cursor-pointer"
                          title="Disable speakerphone"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {peerVoiceActive && (
                      !isVoiceActive ? (
                        <button
                          onClick={startVoiceCall}
                          className="px-2 py-0.5 bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-black rounded text-[10px] flex items-center gap-1 shadow-lg animate-pulse cursor-pointer whitespace-nowrap"
                          title="Click to enable mic and talk with Student"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                          <span>🎙️ Student is speaking! Reply</span>
                        </button>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded text-[9px] font-bold flex items-center gap-1 whitespace-nowrap animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          <span>{peerMicMuted ? 'Student Muted' : 'Student Voice Active'}</span>
                        </span>
                      )
                    )}
                  </div>

                  {studentProgress && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-950 border border-emerald-500/40 rounded text-emerald-400 font-mono font-bold text-[10px] whitespace-nowrap">
                      <span>{studentProgress.studentName}: {studentProgress.currentIndex}/{studentProgress.totalNotes}</span>
                      {studentProgress.completed && <span>✓ OK!</span>}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* STUDENT (ALLIEVO) VIEW OR SIMULATION MODE */
              <div className="flex items-center justify-between w-full gap-2 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-black text-emerald-400 uppercase text-[9px] sm:text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 whitespace-nowrap">
                    {isSimulatingStudentMode ? '🎭 STUDENT SIMULATION' : '👨‍🎓 STUDENT CONSOLE'}
                  </span>
                  <span className="font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 text-[9px] sm:text-[10px] font-bold flex items-center gap-1 whitespace-nowrap">
                    <span className={`w-1.5 h-1.5 rounded-full ${connectedPeersCount >= 2 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <span>Room {socialSession.roomId}</span>
                  </span>

                  {connectedPeersCount >= 2 ? (
                    <span className="bg-emerald-950/80 border border-emerald-400/60 px-2 py-0.5 rounded text-emerald-300 font-bold text-[9px] sm:text-[10px] flex items-center gap-1 whitespace-nowrap animate-pulse">
                      <span>🟢 Teacher Online</span>
                    </span>
                  ) : (
                    <span className="bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded text-amber-300 font-bold text-[9px] sm:text-[10px] flex items-center gap-1 whitespace-nowrap">
                      <span className="animate-spin text-[8px]">⏳</span>
                      <span>Waiting for Teacher to enter...</span>
                    </span>
                  )}
                  {teacherAssignedPhrase.length === 0 ? (
                    <span className="text-slate-400 font-bold text-[10px]">
                      {isSimulatingStudentMode
                        ? 'First create a phrase as Teacher, or send it to student to simulate!'
                        : 'Waiting for musical phrase from Teacher...'}
                    </span>
                  ) : (
                    <span className="text-slate-300 font-bold text-[10px] hidden xs:inline">
                      Play the {teacherAssignedPhrase.length} notes with the right rhythm!
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                  {/* VIVAVOCE VOCALE AUDIO CONTROLS (STUDENT) */}
                  <div className="flex items-center gap-1 bg-slate-950/90 border border-slate-800 rounded-lg p-0.5 shrink-0">
                    {!isVoiceActive ? (
                      <button
                        onClick={startVoiceCall}
                        className="px-2 py-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 active:scale-95 text-white font-black rounded text-[10px] flex items-center gap-1 cursor-pointer shadow transition-all whitespace-nowrap"
                        title="Enable audio speakerphone to speak live with Teacher"
                      >
                        <span>🎙️ Talk to Teacher</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={toggleMicMute}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                            isMicMuted
                              ? 'bg-red-950 text-red-300 border border-red-700/60'
                              : 'bg-emerald-500 text-slate-950 font-black shadow animate-pulse'
                          }`}
                          title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
                        >
                          <span>{isMicMuted ? '🔇 Muted' : '🎙️ Voice On'}</span>
                        </button>

                        <button
                          onClick={stopVoiceCall}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-red-300 rounded text-[10px] cursor-pointer"
                          title="Disable speakerphone"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {peerVoiceActive && (
                      !isVoiceActive ? (
                        <button
                          onClick={startVoiceCall}
                          className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black rounded text-[10px] flex items-center gap-1 shadow-lg animate-pulse cursor-pointer whitespace-nowrap"
                          title="Click to enable mic and talk with Teacher"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                          <span>🎙️ Teacher is speaking! Reply</span>
                        </button>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[9px] font-bold flex items-center gap-1 whitespace-nowrap animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>{peerMicMuted ? 'Teacher Muted' : 'Teacher Voice Active'}</span>
                        </span>
                      )
                    )}
                  </div>

                  {teacherAssignedPhrase.length > 0 && (
                    <>
                      <button
                        onClick={() => handlePlayMasterclassPhrase(teacherAssignedPhrase)}
                        className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded font-bold text-[10px] cursor-pointer flex items-center gap-1"
                        title="Listen to phrase sent by Teacher"
                      >
                        🔊 Listen Phrase
                      </button>

                      <button
                        onClick={() => handleOpenLocalPhraseWaterfall(teacherAssignedPhrase)}
                        className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold text-[10px] cursor-pointer flex items-center gap-1 shadow"
                        title="Show phrase sent by Teacher in top-down falling notes view"
                      >
                        🎮 Open Arcade Waterfall
                      </button>

                      <div className="flex items-center gap-1 font-mono font-bold bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 text-[10px] sm:text-xs overflow-x-auto max-w-[280px]">
                        {teacherAssignedPhrase.map((item, idx) => {
                          const noteName = typeof item === 'string' ? item : item.note;
                          const isDone = idx < studentMatchedIndex;
                          const isCurrent = idx === studentMatchedIndex;
                          return (
                            <span
                              key={idx}
                              className={`px-1.5 py-0.5 rounded ${
                                isDone
                                  ? 'bg-emerald-500 text-slate-950 font-black'
                                  : isCurrent
                                  ? 'bg-amber-400 text-slate-950 font-black animate-pulse'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {noteName}
                            </span>
                          );
                        })}
                      </div>

                      <span className="font-black text-amber-300 font-mono text-[11px] whitespace-nowrap">
                        {studentMatchedIndex} / {teacherAssignedPhrase.length}
                      </span>
                    </>
                  )}

                  {isSimulatingStudentMode && (
                    <button
                      onClick={() => setIsSimulatingStudentMode(false)}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[10px] cursor-pointer whitespace-nowrap shadow"
                    >
                      ⬅️ Back to Teacher Console
                    </button>
                  )}
                </div>
              </div>
            )}
            {/* Hidden audio element for receiving peer voice stream */}
            <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
          </div>
        );
      })()}

      {/* SYNTHESIA FALLING NOTES WATERFALL (Hidden in dedicated Ear Training mode) */}
      {!earTrainingStandalone && (
        <>
          {showWaterfall && activeSong ? (
            <div className={`w-full flex flex-col shrink-0 transition-colors duration-300 ${masterclassViewMode === 'sheet' ? 'bg-white' : 'bg-slate-950'} overflow-hidden`}>
              <FallingNotesWaterfall
                song={activeSong}
                keys={GAMEPLAY_KEYS}
                getTransposedNote={getTransposedNote}
                initialPlayMode={masterclassPlayMode}
                initialViewMode={masterclassViewMode}
                onViewModeChange={setMasterclassViewMode}
                sheetScrollMode={sheetScrollMode}
                restartTrigger={waterfallRestartTrigger}
                centerAnimation={centerAnimation}
                fxMode={waterfallFxMode}
                onFxModeChange={handleWaterfallFxChange}
                onOverloadDetonate={handleOverloadDetonate}
                isMasterclassMode={socialSession?.mode === 'masterclass' && activeSong.id.startsWith('masterclass_')}
                onActiveGuidanceChange={setSongGuidance}
                onMasterclassFinished={() => {
                  showToast('🎉 Phrase completed! Turn goes back to Teacher 👑');
                  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(
                      JSON.stringify({
                        type: 'piano:phrase_progress',
                        roomId: socialSession?.roomId,
                        currentIndex: activeSong.notes.length,
                        totalNotes: activeSong.notes.length,
                        completed: true,
                      })
                    );
                  }
                }}
                onClose={() => {
                  setShowWaterfall(false);
                  setSongGuidance(null);
                  setKeyboardDamageLevel(0);
                  setBombBlastSeq(0);
                }}
              />
            </div>
          ) : (
            <div className="shrink-0 w-full flex flex-col">
              {/* Free Play Center Stage 8-Bit Animation Canvas (when selected) */}
              {centerAnimation !== 'none' && (
                <div className="relative w-full h-24 sm:h-32 bg-slate-950 border-b border-slate-800/80 overflow-hidden shrink-0">
                  <canvas ref={freeStageCanvasRef} className="w-full h-full block" />
                  <div className="absolute top-1.5 right-2 flex items-center gap-1 z-10">
                    <button
                      onClick={() => setIsCenterAnimModalOpen(true)}
                      className="px-2 py-0.5 rounded-lg bg-slate-900/85 hover:bg-slate-800 border border-cyan-500/40 text-cyan-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer backdrop-blur-sm shadow"
                      title="Change Center Stage Animation"
                    >
                      <span>{getCenterAnimationMeta(centerAnimation).icon}</span>
                      <span className="hidden xs:inline">{getCenterAnimationMeta(centerAnimation).name}</span>
                      <span className="text-amber-300">Change</span>
                    </button>
                    <button
                      onClick={() => handleSelectCenterAnimation('none')}
                      className="w-5 h-5 rounded-lg bg-slate-900/85 hover:bg-rose-600/80 border border-slate-700 text-slate-300 hover:text-white text-[10px] font-bold flex items-center justify-center cursor-pointer backdrop-blur-sm"
                      title="Hide Center Stage Animation"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Slim quick chords strip above keys */}
              <div className="shrink-0 w-full h-7 sm:h-8 flex items-center justify-center bg-slate-950/80 border-b border-slate-900/80 px-2 overflow-x-auto scrollbar-none gap-1.5 z-10">
                <span className="text-[9px] text-slate-500 uppercase font-bold shrink-0">Chords:</span>
                <div className="flex items-center gap-1 flex-nowrap">
                  {CHORD_PRESETS.map((chord) => (
                    <button
                      key={chord.name}
                      onClick={() => {
                        const transposed = chord.notes.map((n) => getTransposedNote(n));
                        audioEngine.playChord(transposed, '2n', instrument);
                        if (centerAnimationRef.current !== 'none') {
                          transposed.forEach((cn) => {
                            const mv = noteNameToMidiNumber(cn);
                            freeStageAnimatorRef.current.triggerNote(mv);
                            videoFallbackAnimatorRef.current.triggerNote(mv);
                          });
                        }
                      }}
                      className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800/80 rounded text-slate-300 hover:text-amber-400 text-[10px] font-semibold shrink-0 cursor-pointer transition-colors"
                    >
                      {chord.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* FIXED 88-KEY MINI-MAP KEYBOARD */}
          <div className="w-full bg-slate-900/95 border-t border-b border-slate-800/80 px-1 sm:px-2 py-0.5 flex items-center justify-between gap-1 sm:gap-2 shrink-0 z-20">
            {/* Quick Shift -1 Octave */}
            <button
              onClick={() => setStartWhiteKeyIdx((prev) => Math.max(0, prev - 7))}
              disabled={clampedStartWhiteIdx === 0}
              className="p-0.5 h-6 sm:h-7 w-6 sm:w-7 flex items-center justify-center bg-slate-800 hover:bg-slate-750 text-slate-300 disabled:opacity-25 rounded shrink-0 transition-colors cursor-pointer"
              title="Shift down 1 Octave"
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
              studentPressedNotesRef={studentPressedNotesRef}
            />

            {/* Quick Shift +1 Octave */}
            <button
              onClick={() => setStartWhiteKeyIdx((prev) => Math.min(maxStartWhiteIdx, prev + 7))}
              disabled={clampedStartWhiteIdx >= maxStartWhiteIdx}
              className="p-0.5 h-6 sm:h-7 w-6 sm:w-7 flex items-center justify-center bg-slate-800 hover:bg-slate-750 text-slate-300 disabled:opacity-25 rounded shrink-0 transition-colors cursor-pointer"
              title="Shift up 1 Octave"
            >
              <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        </>
      )}

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
        noteNotation={noteNotation}
        studioTheme={studioTheme}
        activeGuidanceNote={activeScaleExercise ? activeScaleExercise.notes[scaleActiveIdx] : (songGuidance?.note || null)}
        activeGuidanceFinger={activeScaleExercise ? activeScaleExercise.fingering[scaleActiveIdx % activeScaleExercise.fingering.length] : (songGuidance?.finger || null)}
        activeGuidanceTip={activeScaleExercise?.tips ? activeScaleExercise.tips[scaleActiveIdx % activeScaleExercise.tips.length] : (songGuidance?.tip || null)}
        guidanceHand={activeScaleExercise?.hand || songGuidance?.hand || 'right'}
        studentPressedNotesRef={studentPressedNotesRef}
        damageLevel={keyboardDamageLevel}
        blastSeq={bombBlastSeq}
        className="w-full flex-1 min-h-0 select-none touch-none relative"
      />

      {/* COMPACT OPTIONS & CUSTOMIZATION HUB MODAL */}
      {isOptionsModalOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-2 sm:p-4"
          onClick={() => setIsOptionsModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-slate-950/90 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Sliders className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-sm truncate">Options &amp; Customization</h3>
                  <p className="text-[10px] text-slate-400 truncate">Tap any category to open its full scrollable panel</p>
                </div>
              </div>
              <button
                onClick={() => setIsOptionsModalOpen(false)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 sm:p-4 space-y-2 overflow-y-auto touch-pan-y overscroll-contain text-xs">
              {/* 1. Studio Keyboard Style */}
              {onThemeChange && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOptionsModalOpen(false);
                    setActiveOptionsSubModal('themes');
                  }}
                  className="w-full text-left bg-gradient-to-r from-amber-500/15 via-slate-800/85 to-slate-800/85 hover:brightness-110 active:scale-[0.99] p-2.5 sm:p-3 rounded-xl border border-amber-500/35 flex items-center justify-between gap-2.5 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-900/90 border border-amber-400/40 flex items-center justify-center text-base shrink-0">
                      🎨
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-xs flex items-center gap-1.5 flex-wrap">
                        <span>Studio Keyboard Style</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                          {STUDIO_THEME_OPTIONS.find((t) => t.id === studioTheme)?.name || studioTheme}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">
                        13 acoustic, crystal, cyber &amp; pop keyboard finishes
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
                </button>
              )}

              {/* 2. Note & Kinetic Visual FX (Includes Neon Elastics & All 24 FX) */}
              <button
                type="button"
                onClick={() => {
                  setIsOptionsModalOpen(false);
                  setActiveOptionsSubModal('fx');
                }}
                className="w-full text-left bg-gradient-to-r from-fuchsia-500/15 via-slate-800/85 to-cyan-500/15 hover:brightness-110 active:scale-[0.99] p-2.5 sm:p-3 rounded-xl border border-fuchsia-500/35 flex items-center justify-between gap-2.5 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-900/90 border border-fuchsia-400/40 flex items-center justify-center text-base shrink-0">
                    {getWaterfallFxMeta(waterfallFxMode).icon}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white text-xs flex items-center gap-1.5 flex-wrap">
                      <span>Note &amp; Kinetic Visual FX</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 font-mono">
                        {getWaterfallFxMeta(waterfallFxMode).shortLabel}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">
                      Neon Elastics, Combo Reactor, Pinball, Overload &amp; {WATERFALL_FX_ITEMS.length} FX
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-fuchsia-300 shrink-0" />
              </button>

              {/* 3. Center Stage 8-Bit Animation */}
              <button
                type="button"
                onClick={() => {
                  setIsOptionsModalOpen(false);
                  setIsCenterAnimModalOpen(true);
                }}
                className="w-full text-left bg-gradient-to-r from-cyan-500/15 via-slate-800/85 to-amber-500/15 hover:brightness-110 active:scale-[0.99] p-2.5 sm:p-3 rounded-xl border border-cyan-500/35 flex items-center justify-between gap-2.5 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-900/90 border border-cyan-400/40 flex items-center justify-center text-base shrink-0">
                    {getCenterAnimationMeta(centerAnimation).icon}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white text-xs flex items-center gap-1.5 flex-wrap">
                      <span>Center Stage Animation</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                        {getCenterAnimationMeta(centerAnimation).name}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">
                      8-bit reactive backdrop in Waterfall, Free Play &amp; Video
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-cyan-300 shrink-0" />
              </button>

              {/* 4. View & Sheet Scroll Style */}
              <button
                type="button"
                onClick={() => {
                  setIsOptionsModalOpen(false);
                  setActiveOptionsSubModal('view');
                }}
                className="w-full text-left bg-slate-800/80 hover:bg-slate-800 active:scale-[0.99] p-2.5 sm:p-3 rounded-xl border border-slate-700/80 flex items-center justify-between gap-2.5 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-900/90 border border-slate-600 flex items-center justify-center text-base shrink-0">
                    🎼
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white text-xs flex items-center gap-1.5 flex-wrap">
                      <span>View &amp; Sheet Scroll Style</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-amber-300 font-mono">
                        {defaultViewMode === 'waterfall' ? 'Waterfall' : 'Sheet'} • {sheetScrollMode === 'sweeping' ? 'Sweeping' : 'Continuous'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">
                      Default song start view &amp; sheet music playhead movement
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {/* 5. Keys Size, Octave & Labels */}
              <button
                type="button"
                onClick={() => {
                  setIsOptionsModalOpen(false);
                  setActiveOptionsSubModal('keys');
                }}
                className="w-full text-left bg-slate-800/80 hover:bg-slate-800 active:scale-[0.99] p-2.5 sm:p-3 rounded-xl border border-slate-700/80 flex items-center justify-between gap-2.5 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-900/90 border border-slate-600 flex items-center justify-center text-base shrink-0">
                    ⌨️
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white text-xs flex items-center gap-1.5 flex-wrap">
                      <span>Keys Size, Octave &amp; Labels</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-amber-300 font-mono">
                        {keyboardLayout === 'compact' ? '14 Keys' : keyboardLayout === 'balanced' ? '21 Keys' : '28 Keys'} • Oct {octaveShift > 0 ? `+${octaveShift}` : octaveShift} • {noteNotation.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">
                      White key count, octave shift &amp; solfege/letter labels
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {/* 6. Sound, Instrument, Reverb & Volume */}
              <button
                type="button"
                onClick={() => {
                  setIsOptionsModalOpen(false);
                  setActiveOptionsSubModal('sound');
                }}
                className="w-full text-left bg-slate-800/80 hover:bg-slate-800 active:scale-[0.99] p-2.5 sm:p-3 rounded-xl border border-slate-700/80 flex items-center justify-between gap-2.5 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-900/90 border border-slate-600 flex items-center justify-center text-base shrink-0">
                    🔊
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white text-xs flex items-center gap-1.5 flex-wrap">
                      <span>Sound, Instrument &amp; Reverb</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-emerald-300 font-mono uppercase">
                        {instrument} • {soundProfile} • {volume}%
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">
                      Master volume, instrument timbre &amp; spatial hall acoustics
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {/* 7. Metronome, Microphone & Audio Test */}
              <button
                type="button"
                onClick={() => {
                  setIsOptionsModalOpen(false);
                  setActiveOptionsSubModal('tools');
                }}
                className="w-full text-left bg-slate-800/80 hover:bg-slate-800 active:scale-[0.99] p-2.5 sm:p-3 rounded-xl border border-slate-700/80 flex items-center justify-between gap-2.5 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-900/90 border border-slate-600 flex items-center justify-center text-base shrink-0">
                    ⏱️
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white text-xs flex items-center gap-1.5 flex-wrap">
                      <span>Metronome, Mic &amp; Latency Test</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-amber-300 font-mono">
                        {pianoBpm} BPM{isPianoMetronomeActive ? ' ON' : ''}{isMicListening ? ' • MIC ON' : ''}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">
                      BPM tempo click, acoustic pitch detection &amp; 36-note glissando test
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {/* 8. Display, Rate & Share VirtuKeys */}
              <button
                type="button"
                onClick={() => {
                  setIsOptionsModalOpen(false);
                  setActiveOptionsSubModal('share');
                }}
                className="w-full text-left bg-slate-800/80 hover:bg-slate-800 active:scale-[0.99] p-2.5 sm:p-3 rounded-xl border border-slate-700/80 flex items-center justify-between gap-2.5 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-900/90 border border-slate-600 flex items-center justify-center text-base shrink-0">
                    ⭐
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white text-xs flex items-center gap-1.5 flex-wrap">
                      <span>Display, Rate &amp; Share App</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                        HORIZONTAL ACTIVE
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">
                      Orientation flip 180°, Google Play review &amp; WhatsApp invite
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-[10px] text-slate-400">All settings auto-saved</span>
              <button
                onClick={() => setIsOptionsModalOpen(false)}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED SCROLLABLE SUB-MODALS FOR EACH OPTIONS CATEGORY */}
      {activeOptionsSubModal && (
        <div
          className="fixed inset-0 z-[130] bg-slate-950/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4"
          onClick={() => setActiveOptionsSubModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[88dvh] bg-slate-900 border-2 border-amber-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Sub-Modal Header with Back to Options + Close */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-950/90 border-b border-slate-800 shrink-0 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => {
                    setActiveOptionsSubModal(null);
                    setIsOptionsModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  title="Back to Options"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wide truncate">
                    {activeOptionsSubModal === 'themes' && '🎨 Studio Keyboard Style'}
                    {activeOptionsSubModal === 'fx' && '✨ Note & Kinetic Visual FX'}
                    {activeOptionsSubModal === 'view' && '🎼 View & Sheet Scroll Style'}
                    {activeOptionsSubModal === 'keys' && '⌨️ Keys Size, Octave & Labels'}
                    {activeOptionsSubModal === 'sound' && '🔊 Sound, Instrument & Reverb'}
                    {activeOptionsSubModal === 'tools' && '⏱️ Metronome, Mic & Latency Test'}
                    {activeOptionsSubModal === 'share' && '⭐ Display, Rate & Share App'}
                  </h3>
                  <p className="text-[10px] text-slate-400 truncate">Scroll inside to view all choices</p>
                </div>
              </div>
              <button
                onClick={() => setActiveOptionsSubModal(null)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center cursor-pointer shrink-0"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Sub-Modal Scrollable Body */}
            <div className="p-3 sm:p-4 overflow-y-auto touch-pan-y overscroll-contain space-y-4 text-xs">
              {/* SUB-MODAL 1: STUDIO KEYBOARD STYLE */}
              {activeOptionsSubModal === 'themes' && onThemeChange && (
                <div>
                  <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-2 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-amber-400" />
                    <span>Zero-Latency Keyboard Finishes ({STUDIO_THEME_OPTIONS.length} Styles)</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {STUDIO_THEME_OPTIONS.map((th) => (
                      <button
                        key={th.id}
                        onClick={() => onThemeChange(th.id)}
                        className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
                          studioTheme === th.id
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow'
                            : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-[11px]">{th.name}</span>
                          {studioTheme === th.id && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </div>
                        <span className="text-[9px] text-slate-400 mt-0.5">{th.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-MODAL 2: NOTE & KINETIC VISUAL FX */}
              {activeOptionsSubModal === 'fx' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">
                        ⚡ Kinetic Physics Visualizers (Best for Viral Shorts &amp; Reels!)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {WATERFALL_FX_ITEMS.filter((fx) => fx.category === 'kinetic').map((fx) => {
                        const isActive = waterfallFxMode === fx.id;
                        return (
                          <button
                            key={fx.id}
                            onClick={() => handleWaterfallFxChange(fx.id)}
                            className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                              isActive
                                ? 'bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border-cyan-400 text-white shadow-lg'
                                : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                            }`}
                          >
                            <span className="text-2xl shrink-0">{fx.icon}</span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="font-black text-xs text-white truncate">{fx.label}</span>
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shrink-0">
                                  KINETIC
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-300 mt-1 leading-snug">{fx.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-amber-300 mb-2">
                      🎆 Full Stage &amp; Particle FX
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {WATERFALL_FX_ITEMS.filter((fx) => fx.category !== 'kinetic').map((fx) => {
                        const isActive = waterfallFxMode === fx.id;
                        return (
                          <button
                            key={fx.id}
                            onClick={() => handleWaterfallFxChange(fx.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2 ${
                              isActive
                                ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow'
                                : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <span className="text-lg shrink-0">{fx.icon}</span>
                            <div className="min-w-0">
                              <div className="font-bold text-[11px] text-white truncate">{fx.label}</div>
                              <div className="text-[9px] text-slate-400 mt-0.5 leading-snug">{fx.desc}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-MODAL 3: VIEW & SHEET SCROLL STYLE */}
              {activeOptionsSubModal === 'view' && (
                <div className="space-y-4">
                  <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/80 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-amber-400" />
                      <div>
                        <span className="font-bold text-white text-xs">Default View on Song Start</span>
                        <span className="text-[10px] text-slate-400 block">
                          Choose which display mode launches automatically (Waterfall or Sheet)
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleDefaultViewModeChange('waterfall')}
                        className={`p-2.5 rounded-xl text-center border transition-all cursor-pointer ${
                          defaultViewMode === 'waterfall'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="block text-sm mb-0.5">🎹</span>
                        <span className="font-bold text-[11px] block">Waterfall</span>
                        <span className="text-[9px] text-slate-400 block">Synthesia arcade falling notes</span>
                      </button>

                      <button
                        onClick={() => handleDefaultViewModeChange('sheet')}
                        className={`p-2.5 rounded-xl text-center border transition-all cursor-pointer ${
                          defaultViewMode === 'sheet'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="block text-sm mb-0.5">🎼</span>
                        <span className="font-bold text-[11px] block">Traditional Sheet Music</span>
                        <span className="text-[9px] text-slate-400 block">Scrolling grand staff notation</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/80 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      <div>
                        <span className="font-bold text-white text-xs">Sheet Music Scroll Style</span>
                        <span className="text-[10px] text-slate-400 block">
                          Choose how the playhead line and music staff move
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleSheetScrollModeChange('sweeping')}
                        className={`p-2.5 rounded-xl text-center border transition-all cursor-pointer ${
                          sheetScrollMode === 'sweeping'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="block text-sm mb-0.5">🚩</span>
                        <span className="font-bold text-[11px] block">Moving Line &amp; Page Turn (Default)</span>
                        <span className="text-[9px] text-slate-400 block">Line sweeps across and turns page</span>
                      </button>

                      <button
                        onClick={() => handleSheetScrollModeChange('continuous')}
                        className={`p-2.5 rounded-xl text-center border transition-all cursor-pointer ${
                          sheetScrollMode === 'continuous'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="block text-sm mb-0.5">📜</span>
                        <span className="font-bold text-[11px] block">Fixed Line &amp; Continuous Scroll</span>
                        <span className="text-[9px] text-slate-400 block">Playhead stays fixed while score glides</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-MODAL 4: KEYS SIZE, OCTAVE & LABELS */}
              {activeOptionsSubModal === 'keys' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-2">
                      Key Layout &amp; Size
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'compact', label: 'Compact', keys: '14 White Keys', desc: 'Wide and spacious keys' },
                        { id: 'balanced', label: 'Balanced', keys: '21 White Keys', desc: 'Standard 2-handed play' },
                        { id: 'extended', label: 'Extended', keys: '28 White Keys', desc: 'Wide pitch range' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setKeyboardLayout(item.id as KeyboardLayoutType)}
                          className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
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

                  <div>
                    <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-2">
                      Octave Transposition
                    </label>
                    <div className="flex items-center justify-between bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-300">Shift Octave Range:</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setOctaveShift((prev) => Math.max(-2, prev - 1))}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold cursor-pointer"
                        >
                          -1
                        </button>
                        <span className="font-mono font-bold text-amber-400 px-2">
                          {octaveShift > 0 ? `+${octaveShift}` : octaveShift}
                        </span>
                        <button
                          onClick={() => setOctaveShift((prev) => Math.min(2, prev + 1))}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold cursor-pointer"
                        >
                          +1
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-2">
                      Note Notation (Key Labels)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'latin', label: 'Latin / Solfege', example: 'DO, RE, MI, FA, SOL...', desc: 'Classical solfege' },
                        { id: 'letter', label: 'English Letters', example: 'C, D, E, F, G, A, B', desc: 'International standard' },
                        { id: 'german', label: 'German System', example: 'C, D, E, F, G, A, H', desc: 'B -> H, A# -> B' },
                        { id: 'numeric', label: 'Numeric / Degrees', example: '1, 2, 3, 4, 5, 6, 7', desc: 'Scale degrees' },
                        { id: 'none', label: 'None (Blank Keys)', example: '—', desc: 'For advanced players' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleNotationChange(item.id as NoteNotationFormat)}
                          className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                            noteNotation === item.id
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-md'
                              : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold">{item.label}</span>
                            {noteNotation === item.id && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          </div>
                          <div className="text-[10px] font-mono font-bold text-amber-400/90 mt-1">{item.example}</div>
                          <div className="text-[9px] text-slate-400 mt-0.5">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-MODAL 5: SOUND, INSTRUMENT, REVERB & VOLUME */}
              {activeOptionsSubModal === 'sound' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-2">
                      Master Volume ({volume}%)
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

                  <div>
                    <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-2">
                      Instrument Timbre
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'piano', label: 'Grand Piano' },
                        { id: 'guitar', label: 'Acoustic Guitar' },
                        { id: 'strings', label: 'Orchestral Strings' },
                        { id: 'bass', label: 'Electric Bass' },
                      ].map((inst) => (
                        <button
                          key={inst.id}
                          onClick={() => setInstrument(inst.id as InstrumentType)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
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

                  <div>
                    <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-2">
                      Acoustic Profile &amp; Hi-Fi Reverb
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'concert', label: 'Grand Concert', desc: 'Royal hall (Steinway D), deep and majestic' },
                        { id: 'studio', label: 'Intimate Studio', desc: 'Close mic, warm, dry and defined' },
                        { id: 'bright', label: 'Live Stage', desc: 'Bright and sharp, strong presence' },
                        { id: 'warm', label: 'Warm Felt', desc: 'Soft vintage felt piano acoustics' },
                        { id: 'cathedral', label: 'Cathedral', desc: 'Ethereal 4.5s spatial cathedral hall' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleSoundProfileChange(p.id as SoundProfile)}
                          className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                            soundProfile === p.id
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-md'
                              : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span>{p.label}</span>
                            {soundProfile === p.id && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          </div>
                          <div className="text-[9px] text-slate-400 mt-1 leading-snug">{p.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-MODAL 6: METRONOME, MICROPHONE & LATENCY TEST */}
              {activeOptionsSubModal === 'tools' && (
                <div className="space-y-4">
                  {/* Sequential Audio Latency Test */}
                  <div className="bg-gradient-to-r from-amber-500/15 via-slate-800/80 to-slate-800/80 p-3.5 rounded-xl border border-amber-500/30 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Music className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <span className="font-bold text-white text-xs">Sequential Audio Latency Test</span>
                          <span className="text-[10px] text-slate-400 block">
                            Plays 36 rapid waterfall notes (35ms) to verify zero crackling or dropouts
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={handleRunGlissandoTest}
                        disabled={isTestingGlissando}
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 active:scale-95 disabled:opacity-50 text-slate-950 font-black text-xs rounded-lg shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-all"
                      >
                        <span>{isTestingGlissando ? '⏳ Listening...' : '▶️ Test 36 Notes'}</span>
                      </button>
                    </div>
                    {glissandoTestReport && (
                      <div className="p-2 bg-slate-900/90 rounded-lg border border-slate-700/80 text-[11px] font-mono text-emerald-400">
                        {glissandoTestReport}
                      </div>
                    )}
                  </div>

                  {/* Piano Metronome */}
                  <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-amber-400" />
                        <div>
                          <span className="font-bold text-white text-xs">Piano Metronome</span>
                          <span className="text-[10px] text-slate-400 block">Acoustic click at steady tempo</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsPianoMetronomeActive(!isPianoMetronomeActive)}
                        className={`px-3 py-1 rounded-lg font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                          isPianoMetronomeActive
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 animate-pulse'
                            : 'bg-slate-700/80 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${isPianoMetronomeActive ? 'bg-slate-950' : 'bg-slate-400'}`} />
                        <span>{isPianoMetronomeActive ? 'ACTIVE' : 'OFF'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setPianoBpm((prev) => Math.max(40, prev - 5))}
                        className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 font-bold text-xs cursor-pointer"
                      >
                        -5
                      </button>
                      <button
                        onClick={() => setPianoBpm((prev) => Math.max(40, prev - 1))}
                        className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 font-bold text-xs cursor-pointer"
                      >
                        -1
                      </button>
                      <div className="flex-1 flex flex-col items-center">
                        <span className="font-mono font-black text-amber-400 text-base leading-none">
                          {pianoBpm} <span className="text-[10px] font-sans text-slate-400 font-bold">BPM</span>
                        </span>
                        <input
                          type="range"
                          min="40"
                          max="240"
                          value={pianoBpm}
                          onChange={(e) => setPianoBpm(parseInt(e.target.value))}
                          className="w-full accent-amber-500 bg-slate-700 h-1.5 rounded cursor-pointer mt-1"
                        />
                      </div>
                      <button
                        onClick={() => setPianoBpm((prev) => Math.min(240, prev + 1))}
                        className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 font-bold text-xs cursor-pointer"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => setPianoBpm((prev) => Math.min(240, prev + 5))}
                        className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 font-bold text-xs cursor-pointer"
                      >
                        +5
                      </button>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      <span className="text-[9px] text-slate-500 font-bold mr-1">Preset:</span>
                      {[
                        { label: '60 Largo', bpm: 60 },
                        { label: '80 Andante', bpm: 80 },
                        { label: '108 Moderato', bpm: 108 },
                        { label: '120 Allegro', bpm: 120 },
                        { label: '144 Vivace', bpm: 144 },
                        { label: '168 Presto', bpm: 168 },
                      ].map((p) => (
                        <button
                          key={p.bpm}
                          onClick={() => setPianoBpm(p.bpm)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                            pianoBpm === p.bpm
                              ? 'bg-amber-400 text-slate-950 font-bold'
                              : 'bg-slate-750 hover:bg-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    <div className="pt-1.5 border-t border-slate-700/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Advanced rhythm tools</span>
                      <button
                        onClick={() => {
                          setActiveOptionsSubModal(null);
                          setIsMetronomeModalOpen(true);
                        }}
                        className="px-2 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 rounded text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Open Full Rhythm Console →
                      </button>
                    </div>
                  </div>

                  {/* Real Piano Microphone */}
                  <div className="space-y-2">
                    <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mic className={`w-4 h-4 ${isMicListening ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <div>
                          <span className="font-bold text-white text-xs">Real Piano Microphone</span>
                          <span className="text-[10px] text-slate-400 block">
                            Play on your acoustic piano and the app detects notes
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={toggleMicrophonePitch}
                        className={`px-3 py-1 rounded-lg font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                          isMicListening
                            ? 'bg-emerald-400 text-slate-950 shadow-md ring-1 ring-emerald-300 animate-pulse'
                            : 'bg-slate-750 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${isMicListening ? 'bg-slate-950' : 'bg-slate-400'}`} />
                        <span>{isMicListening ? 'ACTIVE' : 'OFF'}</span>
                      </button>
                    </div>

                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
                      <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-1.5">
                        Keyboard Detection Mode
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['economy', 'balanced', 'pro'] as const).map((mode) => {
                          const labels = {
                            economy: 'Economy / Entry-Level',
                            balanced: 'Balanced',
                            pro: 'Professional',
                          };
                          const isActive = micSensitivity === mode;
                          return (
                            <button
                              key={mode}
                              onClick={() => {
                                setMicSensitivity(mode);
                                pitchDetector.setSensitivityMode(mode);
                              }}
                              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center ${
                                isActive
                                  ? 'bg-amber-500 text-slate-950 shadow ring-1 ring-amber-400 font-black'
                                  : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300'
                              }`}
                            >
                              {labels[mode]}
                            </button>
                          );
                        })}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1.5 block leading-relaxed">
                        Use &quot;Economy&quot; for entry-level or non-perfect keyboards (no strict filter). Use &quot;Professional&quot; for high-end digital or acoustic pianos.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-MODAL 7: DISPLAY, RATE & SHARE APP */}
              {activeOptionsSubModal === 'share' && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/80 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>Horizontal View Always Active</span>
                        <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                          ACTIVE
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        The keyboard is always displayed full-screen horizontally for two-handed play.
                      </div>
                    </div>
                    {isPortrait && (
                      <button
                        onClick={() => setRotationAngle((prev) => (prev === 90 ? 270 : 90))}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-amber-400 border border-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <RotateCw className="w-3 h-3" />
                        <span>Flip 180°</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <a
                      href="https://play.google.com/store/apps/details?id=it.freeserv.virtukeys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-slate-900 border border-amber-500/40 hover:border-amber-400 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-amber-300 group-hover:text-amber-200">
                            ⭐ Rate Your App
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Google Play
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                          Enjoying VirtuKeys? Leave a 5-star review on the Google Play Store to support new features!
                        </p>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-amber-500/20 text-[10px] font-bold text-amber-400 flex items-center justify-between">
                        <span>Rate on Play Store</span>
                        <span>★★★★★</span>
                      </div>
                    </a>

                    <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/15 via-slate-900 to-slate-900 border border-cyan-500/35 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-cyan-300 flex items-center gap-1">
                            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Share App</span>
                          </span>
                          <span className="text-[9px] font-mono text-cyan-300/80">freeserv.it/Song</span>
                        </div>
                        <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                          Invite friends &amp; fellow musicians to play together on VirtuKeys Studio:
                        </p>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <button
                          onClick={async () => {
                            const shareMsg =
                              '🎹 Play piano with me on VirtuKeys Studio! 88-key grand piano, falling notes with 18 visual FX, live jam band & multiplayer masterclass: https://freeserv.it/Song — App: https://play.google.com/store/apps/details?id=it.freeserv.virtukeys';
                            if (navigator.share) {
                              try {
                                await navigator.share({
                                  title: 'VirtuKeys Studio',
                                  text: shareMsg,
                                  url: 'https://freeserv.it/Song',
                                });
                                return;
                              } catch {
                                // fallback
                              }
                            }
                            try {
                              await navigator.clipboard.writeText(shareMsg);
                              setIsAppShareCopied(true);
                              setTimeout(() => setIsAppShareCopied(false), 2500);
                            } catch {
                              // ignore
                            }
                          }}
                          className="flex-1 py-1.5 px-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-lg text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          {isAppShareCopied ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                          <span>{isAppShareCopied ? 'Copied!' : 'Share Now'}</span>
                        </button>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            '🎹 Play piano with me on VirtuKeys Studio! https://freeserv.it/Song — Google Play: https://play.google.com/store/apps/details?id=it.freeserv.virtukeys'
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] flex items-center justify-center gap-1 transition-all"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sub-Modal Footer */}
            <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
              <button
                onClick={() => {
                  setActiveOptionsSubModal(null);
                  setIsOptionsModalOpen(true);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-lg cursor-pointer text-xs flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>All Options</span>
              </button>
              <button
                onClick={() => setActiveOptionsSubModal(null)}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg cursor-pointer text-xs"
              >
                Done
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
                <h3 className="font-bold text-white text-sm">Teacher Profile &amp; Goals</h3>
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
                  <div className="text-[10px] text-amber-400 uppercase font-black tracking-wider">Current Level</div>
                  <div className="text-base font-extrabold text-white mt-0.5">{gamification.levelTitle}</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {gamification.xp} / {gamification.nextLevelXp} XP for next level
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex flex-col items-center justify-center text-amber-300 font-black">
                  <span className="text-[10px]">LVL.</span>
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
                  <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Daily Streak</div>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 text-center">
                  <div className="text-emerald-400 font-extrabold text-lg">
                    {gamification.songsCompleted}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Completed Songs</div>
                </div>
              </div>

              {/* Badges / Medals */}
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Unlocked Badges</div>
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
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING RECORDING BAR (Facile da terminare) */}
      {isRecording && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 w-auto max-w-md px-3 animate-pulse">
          <div className="bg-red-600 text-white rounded-2xl p-2.5 sm:p-3 shadow-2xl flex items-center justify-between gap-3 sm:gap-4 border-2 border-white/40">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white animate-ping shrink-0" />
              <div className="text-xs font-black uppercase tracking-wider">
                Piano Recording ({recordedNotesRef.current.length} notes)
              </div>
            </div>
            <button
              type="button"
              onClick={toggleRecording}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-red-600 font-black text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95 shrink-0"
            >
              ⏹️ Stop &amp; Save
            </button>
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
                <div className="text-[10px] font-black uppercase tracking-wider opacity-80">Challenge Received!</div>
                <div className="font-black text-xs truncate">
                  {challengeInvitation.challengerName} challenges you on &quot;{challengeInvitation.songTitle}&quot;
                </div>
                <div className="text-[10px] font-bold">Score to beat: {challengeInvitation.targetScore} pt</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={acceptChallenge}
                className="px-2.5 py-1 bg-slate-950 hover:bg-slate-900 text-amber-400 font-black text-xs rounded-lg shadow-sm"
              >
                Accept
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
        onOpenComposer={() => {
          setIsLibraryOpen(false);
          if (onNavigateToView) {
            onNavigateToView('sheet');
          }
        }}
        onStartRecord={handleStartPianoRecording}
      />

      {/* REMOTE VOICE WEBRTC AUDIO ELEMENT */}
      <audio
        ref={remoteAudioRef}
        id="remote-voice-audio-element"
        autoPlay
        playsInline
        className="hidden"
      />

      {/* REAL-TIME CHORD DETECTOR MODAL */}
      <ChordDetectorModal
        isOpen={isChordDetectorOpen}
        onClose={() => setIsChordDetectorOpen(false)}
        activeNotes={activeChordNotes}
        chordHistory={chordHistory}
      />

      {/* METRONOME & STUDIO TOOLS MODAL */}
      <MetronomeModal
        isOpen={isMetronomeModalOpen}
        onClose={() => setIsMetronomeModalOpen(false)}
        onBpmChange={(newBpm) => setPianoBpm(newBpm)}
      />

      {/* PEER DISCONNECTION NOTIFICATION MODAL */}
      {peerDisconnectedState && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/60 p-6 rounded-3xl max-w-md w-full space-y-4 text-center shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="text-4xl animate-pulse">⚠️</div>
            <h3 className="text-lg font-black text-white uppercase tracking-wider">
              Participant Disconnected
            </h3>
            <p className="text-xs text-slate-300">
              The other user left room <span className="font-mono font-bold text-amber-400">{socialSession?.roomId}</span> or the connection dropped.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleExitToSocialResults}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer"
              >
                🏠 Back to Social Tab
              </button>
              <button
                onClick={() => {
                  setPeerDisconnectedState(false);
                  hadOtherUserRef.current = false;
                }}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                Wait
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2-OPTION VIDEO FORMAT SELECTOR MODAL (Root-level z-[120] so it ALWAYS renders ABOVE the mini-keyboard & waterfall) */}
      {isVideoMenuOpen && !isReelRecording && (
        <div className="fixed inset-0 z-[120] flex items-start justify-end p-2 sm:p-4 bg-slate-950/65 backdrop-blur-xs">
          <div
            className="fixed inset-0"
            onClick={() => setIsVideoMenuOpen(false)}
          />
          <div className="relative mt-8 sm:mt-10 mr-1 sm:mr-2 w-72 sm:w-80 bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl p-3 z-10 animate-in fade-in zoom-in-95 duration-150 space-y-2 text-left">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <div className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span>🎬</span>
                <span>Choose Video Format</span>
              </div>
              <button
                onClick={() => setIsVideoMenuOpen(false)}
                className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Option 1: Vertical 9:16 (Central Zoom) */}
            <button
              onClick={() => startVideoRecording('vertical_reel')}
              className="w-full p-2.5 rounded-xl bg-slate-800/90 hover:bg-gradient-to-r hover:from-fuchsia-900/70 hover:to-amber-900/70 border border-slate-700/80 hover:border-amber-400/80 transition-all text-left flex items-start gap-2.5 cursor-pointer group shadow-sm"
            >
              <div className="w-9 h-9 rounded-xl bg-fuchsia-600/25 border border-fuchsia-500/50 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                📱
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-black text-white flex items-center justify-between">
                  <span>Vertical 9:16</span>
                  <span className="text-[9px] bg-fuchsia-500/25 text-fuchsia-300 px-1.5 py-0.2 rounded font-mono font-bold">TikTok / Reels</span>
                </div>
                <p className="text-[10px] text-slate-300 mt-0.5 leading-snug">
                  Auto-zoom on center keys. Song restarts from the beginning with your active settings.
                </p>
              </div>
            </button>

            {/* Option 2: Horizontal 16:9 (Full Piano + "Rotate Your Phone" Glowing Intro) */}
            <button
              onClick={() => startVideoRecording('horizontal_full')}
              className="w-full p-2.5 rounded-xl bg-slate-800/90 hover:bg-gradient-to-r hover:from-amber-900/70 hover:to-yellow-900/70 border border-slate-700/80 hover:border-yellow-400/80 transition-all text-left flex items-start gap-2.5 cursor-pointer group shadow-sm"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-600/25 border border-amber-500/50 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                🔄
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-black text-white flex items-center justify-between">
                  <span>Horizontal 16:9</span>
                  <span className="text-[9px] bg-amber-500/25 text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold">Full / YouTube</span>
                </div>
                <p className="text-[10px] text-slate-300 mt-0.5 leading-snug">
                  Full keyboard with glowing <strong className="text-amber-300">&quot;ROTATE YOUR PHONE&quot;</strong> intro. Restarts song from 0:00.
                </p>
              </div>
            </button>

            {/* Saved / Recent Videos Recovery Section */}
            {savedVideosArchive.length > 0 && (
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                  <span>📂 Recent Recorded Videos ({savedVideosArchive.length})</span>
                  <span className="text-[9px] text-slate-400 font-normal">Auto-saved</span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5">
                  {savedVideosArchive.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-1.5 p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/70 text-[10px]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white truncate" title={item.filename}>
                          {item.mode === 'vertical_reel' ? '📱 ' : '🖥️ '}
                          {item.filename}
                        </div>
                        <div className="text-[9px] text-slate-400">
                          {item.sizeBytes > 0 ? `${(item.sizeBytes / (1024 * 1024)).toFixed(1)} MB • ` : ''}
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setIsVideoMenuOpen(false);
                          setActiveVideoMode(item.mode);
                          setRecordedVideoExt(item.ext);
                          setRecordedVideoFilename(item.filename);
                          if (item.serverUrl) {
                            const cleanStream = item.serverUrl.split('?')[0];
                            setRecordedServerStreamUrl(cleanStream);
                            setRecordedServerDownloadUrl(`${cleanStream}?dl=1`);
                          } else {
                            setRecordedServerStreamUrl(null);
                            setRecordedServerDownloadUrl(null);
                          }
                          if (item.blob) {
                            const objUrl = URL.createObjectURL(item.blob);
                            setRecordedVideoBlob(item.blob);
                            setRecordedVideoUrl(objUrl);
                            if (!item.serverUrl) {
                              const upPromise = uploadVideoInChunks(item.blob, item.filename);
                              videoUploadPromiseRef.current = upPromise;
                            }
                          } else if (item.serverUrl) {
                            setRecordedVideoBlob(null);
                            setRecordedVideoUrl(item.serverUrl.split('?')[0]);
                          }
                        }}
                        className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-black shrink-0 cursor-pointer"
                      >
                        Open / Save
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIRAL 9:16 VIDEO PREVIEW, DOWNLOAD & SHARE MODAL */}
      {recordedVideoUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl max-w-lg w-full p-4 sm:p-5 shadow-2xl flex flex-col items-center gap-3 max-h-[94vh] overflow-y-auto">
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎬</span>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wide">
                    VirtuKeys Video Ready!
                  </h3>
                  <p className="text-[11px] text-amber-300 font-semibold">
                    {activeVideoMode === 'vertical_reel'
                      ? 'Vertical 9:16 HD • Central Keys Zoom'
                      : 'Horizontal 16:9 • With "Rotate Phone" Intro'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  URL.revokeObjectURL(recordedVideoUrl);
                  setRecordedVideoUrl(null);
                  setRecordedVideoBlob(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="w-full flex justify-center bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
              <video
                key={recordedServerStreamUrl || recordedVideoUrl || 'preview'}
                src={recordedServerStreamUrl || recordedVideoUrl}
                controls
                playsInline
                autoPlay
                loop
                className="max-h-[52vh] w-auto max-w-full object-contain"
              />
            </div>

            {isUploadingVideoChunks && (
              <div className="w-full text-center text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl py-1 px-3">
                ⏳ Preparing direct download link ({videoUploadPercent}%)...
              </div>
            )}

            <div className="w-full flex flex-col sm:flex-row gap-2 pt-1">
              <a
                href={recordedServerDownloadUrl || recordedVideoUrl || '#'}
                download={recordedVideoFilename}
                onClick={async (e) => {
                  const finalExt = recordedVideoExt === 'mp4' ? 'mp4' : 'webm';
                  const filename =
                    recordedVideoFilename && recordedVideoFilename.endsWith(`.${finalExt}`)
                      ? recordedVideoFilename
                      : `VirtuKeys_${activeVideoMode === 'vertical_reel' ? 'Reel' : 'Video'}_${Date.now()}.${finalExt}`;

                  // If the real HTTPS attachment URL (?dl=1) is already ready, force direct navigation to the attachment URL
                  if (recordedServerDownloadUrl) {
                    e.preventDefault();
                    showToast(`⬇️ Download started: ${filename}`);
                    window.location.assign(recordedServerDownloadUrl);
                    return;
                  }

                  // If chunked upload is still finishing, wait for it (< 0.5s) and then trigger direct HTTPS attachment download
                  e.preventDefault();
                  if (videoUploadPromiseRef.current) {
                    showToast(`⏳ Preparing file ${filename}...`);
                    const uploaded = await videoUploadPromiseRef.current;
                    if (uploaded?.downloadUrl) {
                      showToast(`⬇️ Download started: ${filename}`);
                      window.location.assign(uploaded.downloadUrl);
                      return;
                    }
                  }

                  if (recordedVideoBlob) {
                    showToast(`⏳ Preparing file ${filename}...`);
                    const uploaded = await uploadVideoInChunks(recordedVideoBlob, filename);
                    if (uploaded?.downloadUrl) {
                      showToast(`⬇️ Download started: ${filename}`);
                      window.location.assign(uploaded.downloadUrl);
                      return;
                    }
                  }

                  // Final offline fallback if server is unreachable
                  if (recordedVideoUrl) {
                    const link = document.createElement('a');
                    link.href = recordedVideoUrl;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    showToast(`✅ Downloaded: ${filename}`);
                  }
                }}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg text-center flex items-center justify-center gap-1.5 cursor-pointer no-underline"
              >
                <span>⬇️</span>
                <span>
                  {isUploadingVideoChunks
                    ? `Preparing (${videoUploadPercent}%)...`
                    : `Download Video (.${recordedVideoExt.toUpperCase()})`}
                </span>
              </a>

              {typeof navigator !== 'undefined' && 'share' in navigator && recordedVideoBlob && (
                <button
                  onClick={async () => {
                    try {
                      const finalExt = recordedVideoExt === 'mp4' ? 'mp4' : 'webm';
                      const filename = recordedVideoFilename.endsWith(`.${finalExt}`)
                        ? recordedVideoFilename
                        : `VirtuKeys-${activeVideoMode === 'vertical_reel' ? 'Reel' : 'Full'}.${finalExt}`;

                      const mimeType = recordedVideoBlob.type || (finalExt === 'mp4' ? 'video/mp4' : 'video/webm');
                      const file = new File([recordedVideoBlob], filename, { type: mimeType });

                      if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                          title: '🎹 VirtuKeys Piano',
                          text: 'Check out this performance on VirtuKeys! 🎹🔥',
                          files: [file],
                        });
                      } else {
                        showToast('Use the Download Video button to save it on your device.');
                      }
                    } catch (e) {}
                  }}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>📲</span>
                  <span>Share (TikTok / Reels)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SCROLLABLE CENTER STAGE ANIMATION GALLERY MODAL */}
      {isCenterAnimModalOpen && (
        <div
          className="fixed inset-0 z-[130] bg-slate-950/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4"
          onClick={() => setIsCenterAnimModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[88dvh] bg-slate-900 border-2 border-cyan-500/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-950/90 border-b border-slate-800 shrink-0 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => {
                    setIsCenterAnimModalOpen(false);
                    setIsOptionsModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  title="Back to Options"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <span className="text-xl shrink-0">🕹️</span>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wide truncate">
                    Center Stage Animations (Scroll to view all)
                  </h3>
                  <p className="text-[10px] text-cyan-300/85 truncate">
                    100% Copyright-Safe Retro 8-Bit Stage • Active in Waterfall, Free Play &amp; Video
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCenterAnimModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center cursor-pointer shrink-0"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Options List */}
            <div className="p-3 sm:p-4 overflow-y-auto touch-pan-y overscroll-contain space-y-2.5">
              {CENTER_STAGE_ANIMATIONS.map((anim) => {
                const isSelected = centerAnimation === anim.id;
                return (
                  <button
                    key={anim.id}
                    onClick={() => {
                      handleSelectCenterAnimation(anim.id);
                      setIsCenterAnimModalOpen(false);
                    }}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-start gap-3 bg-gradient-to-r ${anim.accentGradient} ${
                      isSelected
                        ? `${anim.borderActive} shadow-lg shadow-cyan-500/15`
                        : 'border-slate-700/80 hover:border-slate-500'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-slate-950/80 border border-slate-700 flex items-center justify-center text-2xl shrink-0">
                      {anim.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-white">{anim.name}</span>
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-950/80 text-amber-300 border border-amber-500/30">
                            {anim.badge}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500 text-slate-950 flex items-center gap-1 shrink-0">
                            <Check className="w-3 h-3" />
                            <span>ACTIVE</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-semibold text-cyan-200 mt-0.5">{anim.tagline}</div>
                      <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">{anim.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0 text-[10px] text-slate-400">
              <span>Reacts live to every note, chord &amp; MIDI hit</span>
              <button
                onClick={() => setIsCenterAnimModalOpen(false)}
                className="px-3.5 py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg cursor-pointer text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
