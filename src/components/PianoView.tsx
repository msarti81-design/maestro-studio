import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { audioEngine } from '../utils/audioEngine';
import { InstrumentType, RecordedNote, InteractiveSong, NoteNotationFormat, SoundProfile, StudioTheme } from '../types';
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
import { midiEngine } from '../utils/midiEngine';
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
}

import { ALL_PIANO_KEYS, ALL_WHITE_KEYS } from '../data/pianoKeys';

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

  // Sequential Glissando Audio Test
  const [isTestingGlissando, setIsTestingGlissando] = useState<boolean>(false);
  const [glissandoTestReport, setGlissandoTestReport] = useState<string | null>(null);

  const handleRunGlissandoTest = async () => {
    setIsTestingGlissando(true);
    setGlissandoTestReport('Riproduzione 36 note in sequenza (35ms)...');
    try {
      const res = await audioEngine.testSequentialGlissando(35, 36);
      if (res.ok) {
        setGlissandoTestReport(`✅ Test Superato: ${res.notesPlayed}/36 note perfette, audio nitido senza gracchiare! (Stato: ${res.finalState})`);
      } else {
        setGlissandoTestReport(`⚠️ Note: ${res.notesPlayed}, Errori: ${res.errors}, Stato: ${res.finalState}`);
      }
    } catch (err: any) {
      setGlissandoTestReport(`Errore test: ${err?.message || 'sconosciuto'}`);
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
      audioEngine.releaseNote(getTransposedNote(note));
    });
    currentlyPressedNotesRef.current.clear();
    keyNodesMapRef.current.forEach((el) => el.classList.remove('key-pressed-active'));
  }, [getTransposedNote]);

  // Masterclass & Multi-user Real-time WebSocket state
  const wsRef = useRef<WebSocket | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  }, []);

  // --- REAL-TIME CHORD DETECTOR STATE ---
  const [isChordDetectorOpen, setIsChordDetectorOpen] = useState<boolean>(false);
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

  // Voice Audio Communication State (Maestro ↔ Allievo Live Voice Audio)
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [peerVoiceActive, setPeerVoiceActive] = useState<boolean>(false);
  const [peerMicMuted, setPeerMicMuted] = useState<boolean>(false);
  const [connectedPeersCount, setConnectedPeersCount] = useState<number>(1);
  const [roomMembers, setRoomMembers] = useState<{ id: string; username: string; role: string }[]>([]);
  const [copiedLinkState, setCopiedLinkState] = useState<boolean>(false);

  const localVoiceStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioCtxRef = useRef<AudioContext | null>(null);
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
        const song = createMasterclassWaterfallSong(receivedPhrase, `Teacher Phrase (${receivedPhrase.length} notes)`);
        setActiveSong(song);
        setShowWaterfall(true);
        showToast(`🎮 The Teacher sent you a phrase of ${receivedPhrase.length} notes (Waterfall ${mode === 'learn' ? 'Learn' : 'Arcade'})!`);
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

  // Real-time Dual-Channel Connection (WebSocket + HTTP Polling Fallback)
  useEffect(() => {
    if (!socialSession || !socialSession.roomId) return;

    let isMounted = true;
    const cleanRoomId = normalizeRoomCode(socialSession.roomId, socialSession.mode);
    const clientSessionId = getOrCreateClientId();

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
        }
        if (isMounted && data.lastTeacherPhrase && (!teacherAssignedPhraseRef.current || teacherAssignedPhraseRef.current.length === 0)) {
          applyIncomingTeacherPhrase(data.lastTeacherPhrase);
        }
      })
      .catch(() => {});

    // Helper to send room events via WebSocket if connected, or HTTP POST fallback
    const sendRoomEvent = (type: string, payload: any) => {
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
    };

    // Helper to play incoming remote WebRTC audio stream with zero-latency Web Audio
    const playRemoteStream = (stream: MediaStream) => {
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          if (!voiceAudioCtxRef.current) {
            voiceAudioCtxRef.current = new AudioCtxClass();
          }
          const ctx = voiceAudioCtxRef.current;
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
          const source = ctx.createMediaStreamSource(stream);
          source.connect(ctx.destination);
        }
      } catch (err) {}

      let audioEl = remoteAudioRef.current;
      if (!audioEl) {
        audioEl = document.getElementById('remote-voice-audio-element') as HTMLAudioElement;
      }
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = 'remote-voice-audio-element';
        audioEl.autoplay = true;
        (audioEl as any).playsInline = true;
        audioEl.style.display = 'none';
        document.body.appendChild(audioEl);
        remoteAudioRef.current = audioEl;
      }
      audioEl.srcObject = stream;
      audioEl.volume = 1.0;
      audioEl.play().catch(() => {});
    };

    // Helper to play discrete audio chunks with zero-gap Web Audio
    const playAudioChunk = (b64Data: string) => {
      if (!b64Data) return;
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          if (!voiceAudioCtxRef.current) {
            voiceAudioCtxRef.current = new AudioCtxClass();
          }
          const ctx = voiceAudioCtxRef.current;
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
          const base64Content = b64Data.includes(',') ? b64Data.split(',')[1] : b64Data;
          const binaryString = window.atob(base64Content);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          ctx.decodeAudioData(
            bytes.buffer.slice(0),
            (buffer) => {
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(0);
            },
            () => {
              const audio = new Audio(b64Data);
              audio.volume = 1.0;
              audio.play().catch(() => {});
            }
          );
          return;
        }
      } catch (e) {}

      try {
        const audio = new Audio(b64Data);
        audio.volume = 1.0;
        audio.play().catch(() => {});
      } catch (err) {}
    };

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
              if (evt.senderId === clientSessionId) continue; // Don't echo self

              if (evt.type === 'piano:teacher_phrase') {
                applyIncomingTeacherPhrase(evt.data || evt);
              } else if (evt.type === 'piano:phrase_progress') {
                applyIncomingPhraseProgress(evt.data || evt);
              } else if (evt.type === 'piano:key_event' && evt.data?.note) {
                if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                  const isMasterclass = socialSession?.mode === 'masterclass';
                  if (!isMasterclass) {
                    audioEngine.playNote(evt.data.note, '8n', instrument);
                  }
                  setKeyVisual(evt.data.note, true);
                  setTimeout(() => setKeyVisual(evt.data.note, false), 220);
                }
              } else if (evt.type === 'piano:audio_chunk' && (evt.data?.audio || evt.audio)) {
                playAudioChunk(evt.data?.audio || evt.audio);
              } else if (evt.type === 'piano:voice_status') {
                const isAct = evt.data?.isActive ?? evt.isActive;
                const isMut = evt.data?.isMuted ?? evt.isMuted;
                setPeerVoiceActive(Boolean(isAct));
                setPeerMicMuted(Boolean(isMut));
              } else if (evt.type === 'webrtc:offer' && (evt.data?.sdp || evt.sdp)) {
                const sdp = evt.data?.sdp || evt.sdp;
                let pc = peerConnectionRef.current;
                if (!pc) {
                  pc = new RTCPeerConnection({
                    iceServers: [
                      { urls: 'stun:stun.l.google.com:19302' },
                      { urls: 'stun:stun1.l.google.com:19302' },
                      { urls: 'stun:stun2.l.google.com:19302' },
                    ],
                  });
                  peerConnectionRef.current = pc;
                  if (localVoiceStreamRef.current) {
                    localVoiceStreamRef.current.getTracks().forEach((t) => pc!.addTrack(t, localVoiceStreamRef.current!));
                  }
                  pc.ontrack = (e) => {
                    if (e.streams && e.streams[0]) {
                      playRemoteStream(e.streams[0]);
                    }
                  };
                  pc.onicecandidate = (e) => {
                    if (e.candidate) {
                      sendRoomEvent('webrtc:candidate', { candidate: e.candidate });
                    }
                  };
                }
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                sendRoomEvent('webrtc:answer', { sdp: pc.localDescription });
              } else if (evt.type === 'webrtc:answer' && (evt.data?.sdp || evt.sdp)) {
                const sdp = evt.data?.sdp || evt.sdp;
                if (peerConnectionRef.current) {
                  await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
                }
              } else if (evt.type === 'webrtc:candidate' && (evt.data?.candidate || evt.candidate)) {
                const cand = evt.data?.candidate || evt.candidate;
                if (peerConnectionRef.current) {
                  try {
                    await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(cand));
                  } catch (e) {}
                }
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
          }
        }
      } catch (e) {}
    }, 1500);

    // 3. WebSocket Real-Time Connection
    const wsUrl = getAppWebSocketUrl();

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
          if (msg.senderId === clientSessionId) return;

          // LIVE ROOM MEMBERS UPDATE
          if (msg.type === 'room:state' && Array.isArray(msg.members)) {
            setConnectedPeersCount(msg.members.length);
            setRoomMembers(msg.members);
          }

          // LIVE AUDIO & VISUAL PRESS FROM REMOTE PEER
          else if (msg.type === 'piano:key_event' && msg.note) {
            const isMasterclass = socialSession?.mode === 'masterclass';
            if (!isMasterclass) {
              audioEngine.playNote(msg.note, '8n', instrument);
            }
            setKeyVisual(msg.note, true);
            setTimeout(() => setKeyVisual(msg.note, false), 220);
          }

          // TEACHER PHRASE ASSIGNED TO STUDENT
          else if (msg.type === 'piano:teacher_phrase') {
            applyIncomingTeacherPhrase(msg);
          }

          // STUDENT PROGRESS UPDATED
          else if (msg.type === 'piano:phrase_progress') {
            applyIncomingPhraseProgress(msg);
          }

          // LIVE VOICE WEBRTC SIGNALING
          else if (msg.type === 'webrtc:offer' && msg.sdp) {
            let pc = peerConnectionRef.current;
            if (!pc) {
              pc = new RTCPeerConnection({
                iceServers: [
                  { urls: 'stun:stun.l.google.com:19302' },
                  { urls: 'stun:stun1.l.google.com:19302' },
                  { urls: 'stun:stun2.l.google.com:19302' },
                ],
              });
              peerConnectionRef.current = pc;
              if (localVoiceStreamRef.current) {
                localVoiceStreamRef.current.getTracks().forEach((t) => pc!.addTrack(t, localVoiceStreamRef.current!));
              }
              pc.ontrack = (evt) => {
                if (evt.streams && evt.streams[0]) {
                  playRemoteStream(evt.streams[0]);
                }
              };
              pc.onicecandidate = (evt) => {
                if (evt.candidate) {
                  sendRoomEvent('webrtc:candidate', { candidate: evt.candidate });
                }
              };
            }
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            if (pendingIceCandidatesRef.current.length > 0) {
              for (const c of pendingIceCandidatesRef.current) {
                try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
              }
              pendingIceCandidatesRef.current = [];
            }
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendRoomEvent('webrtc:answer', { sdp: pc.localDescription });
          }
          else if (msg.type === 'webrtc:answer' && msg.sdp) {
            if (peerConnectionRef.current) {
              await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(msg.sdp));
              if (pendingIceCandidatesRef.current.length > 0) {
                for (const c of pendingIceCandidatesRef.current) {
                  try { await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
                }
                pendingIceCandidatesRef.current = [];
              }
            }
          }
          else if (msg.type === 'webrtc:candidate' && msg.candidate) {
            const pc = peerConnectionRef.current;
            if (pc && pc.remoteDescription && pc.remoteDescription.type) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
              } catch (iceErr) {}
            } else {
              pendingIceCandidatesRef.current.push(msg.candidate);
            }
          }

          // LIVE VOICE STATUS UPDATE
          else if (msg.type === 'piano:voice_status') {
            setPeerVoiceActive(Boolean(msg.isActive));
            setPeerMicMuted(Boolean(msg.isMuted));
            if (msg.isActive) {
              showToast(`🎙️ ${msg.sender || 'Interlocutore'} ha attivato il vivavoce audio!`);
            }
          }

          // FALLBACK LIVE AUDIO CHUNK PLAYBACK
          else if (msg.type === 'piano:audio_chunk' && msg.audio) {
            playAudioChunk(msg.audio);
          }
        } catch (e) {}
      };

      return () => {
        isMounted = false;
        clearInterval(pollInterval);
        ws.close();
        wsRef.current = null;
        if (localVoiceStreamRef.current) {
          localVoiceStreamRef.current.getTracks().forEach((t) => t.stop());
          localVoiceStreamRef.current = null;
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
    } catch (e) {}
  }, [socialSession, username, instrument, showToast, createMasterclassWaterfallSong, applyIncomingTeacherPhrase, applyIncomingPhraseProgress]);

  // Voice Call Helpers
  const stopVoiceCall = useCallback(() => {
    if (localVoiceStreamRef.current) {
      localVoiceStreamRef.current.getTracks().forEach((t) => t.stop());
      localVoiceStreamRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
      mediaRecorderRef.current = null;
    }
    if (peerConnectionRef.current) {
      try { peerConnectionRef.current.close(); } catch (e) {}
      peerConnectionRef.current = null;
    }
    setIsVoiceActive(false);
    setIsMicMuted(false);

    const cleanRoom = normalizeRoomCode(socialSession?.roomId || '', socialSession?.mode || 'masterclass');
    const clientSessionId = getOrCreateClientId();
    const statusPayload = {
      type: 'piano:voice_status',
      roomId: cleanRoom,
      sender: username,
      senderId: clientSessionId,
      isActive: false,
      isMuted: true,
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(statusPayload));
    } else {
      fetch(getAppApiUrl(`/api/room/${encodeURIComponent(cleanRoom)}/event`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statusPayload),
      }).catch(() => {});
    }

    showToast('🎙️ Vivavoce disattivato');
  }, [socialSession, username, showToast]);

  const startVoiceCall = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('⚠️ Microfono non supportato in questo browser');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });

      localVoiceStreamRef.current = stream;
      setIsVoiceActive(true);
      setIsMicMuted(false);

      const cleanRoom = normalizeRoomCode(socialSession?.roomId || '', socialSession?.mode || 'masterclass');
      const clientSessionId = getOrCreateClientId();

      const sendEvt = (type: string, payload: any) => {
        const eventMsg = {
          type,
          roomId: cleanRoom,
          sender: username,
          senderId: clientSessionId,
          ...payload,
        };
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify(eventMsg));
        } else {
          fetch(getAppApiUrl(`/api/room/${encodeURIComponent(cleanRoom)}/event`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventMsg),
          }).catch(() => {});
        }
      };

      // WebRTC PeerConnection setup
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      });
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          try { pc.restartIce(); } catch (e) {}
        }
      };
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          try { pc.restartIce(); } catch (e) {}
        }
      };
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          let audioEl = remoteAudioRef.current;
          if (!audioEl) {
            audioEl = document.getElementById('remote-voice-audio-element') as HTMLAudioElement;
          }
          if (!audioEl) {
            audioEl = document.createElement('audio');
            audioEl.id = 'remote-voice-audio-element';
            audioEl.autoplay = true;
            (audioEl as any).playsInline = true;
            audioEl.style.display = 'none';
            document.body.appendChild(audioEl);
            remoteAudioRef.current = audioEl;
          }
          audioEl.srcObject = event.streams[0];
          audioEl.volume = 1.0;
          audioEl.play().catch(() => {});
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendEvt('webrtc:candidate', { candidate: event.candidate });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendEvt('webrtc:offer', { sdp: pc.localDescription });
      sendEvt('piano:voice_status', { isActive: true, isMuted: false });

      // 2. Continuous WebSocket Audio Chunk Streaming (GUARANTEED FALLBACK ACROSS 4G & FIREWALLS)
      try {
        let preferredMime = '';
        if (typeof MediaRecorder !== 'undefined') {
          const mimeCandidates = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4',
            'audio/aac',
          ];
          for (const m of mimeCandidates) {
            if (MediaRecorder.isTypeSupported(m)) {
              preferredMime = m;
              break;
            }
          }
          const mr = preferredMime ? new MediaRecorder(stream, { mimeType: preferredMime }) : new MediaRecorder(stream);
          mediaRecorderRef.current = mr;
          mr.ondataavailable = (recEvt) => {
            if (recEvt.data && recEvt.data.size > 0 && !isMicMutedRef.current) {
              const reader = new FileReader();
              reader.onloadend = () => {
                const b64 = reader.result as string;
                if (b64) {
                  sendEvt('piano:audio_chunk', { audio: b64 });
                }
              };
              reader.readAsDataURL(recEvt.data);
            }
          };
          mr.start(400);
          // Periodic flush for Android WebView
          const flushInterval = setInterval(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              try {
                mediaRecorderRef.current.requestData();
              } catch (e) {}
            } else {
              clearInterval(flushInterval);
            }
          }, 400);
        }
      } catch (recErr) {
        console.warn('MediaRecorder continuous streamer error:', recErr);
      }

      showToast('🎙️ Vivavoce Attivo! Parla liberamente con il microfono');
    } catch (err: any) {
      showToast(`⚠️ Permesso microfono negato o non disponibile`);
    }
  }, [socialSession, username, showToast]);

  const toggleMicMute = useCallback(() => {
    if (localVoiceStreamRef.current) {
      const audioTrack = localVoiceStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMuted = !audioTrack.enabled;
        setIsMicMuted(newMuted);

        const cleanRoom = normalizeRoomCode(socialSession?.roomId || '', socialSession?.mode || 'masterclass');
        const clientSessionId = getOrCreateClientId();
        const statusPayload = {
          type: 'piano:voice_status',
          roomId: cleanRoom,
          sender: username,
          senderId: clientSessionId,
          isActive: isVoiceActive,
          isMuted: newMuted,
        };

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify(statusPayload));
        } else {
          fetch(getAppApiUrl(`/api/room/${encodeURIComponent(cleanRoom)}/event`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(statusPayload),
          }).catch(() => {});
        }

        showToast(newMuted ? '🔇 Microfono disattivato (Muto)' : '🎙️ Microfono attivo');
      }
    }
  }, [isVoiceActive, socialSession, username, showToast]);

  const handleSendTeacherPhrase = (openWaterfall: boolean = false, displayMode: 'arcade' | 'learn' = 'arcade') => {
    if (recordedMasterclassNotes.length === 0) return;

    const simpleNotes = recordedMasterclassNotes.map((item) => item.note);
    const cleanRoomId = normalizeRoomCode(socialSession?.roomId || '', socialSession?.mode || 'masterclass');

    // 1. Send via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'piano:teacher_phrase',
          roomId: cleanRoomId,
          notes: simpleNotes,
          phraseData: recordedMasterclassNotes,
          openWaterfall,
          displayMode,
          sender: username,
        })
      );
    }

    // 2. Send via HTTP event fallback
    fetch(getAppApiUrl(`/api/room/${encodeURIComponent(cleanRoomId)}/event`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'piano:teacher_phrase',
        sender: username,
        notes: simpleNotes,
        phraseData: recordedMasterclassNotes,
        openWaterfall,
        displayMode,
      }),
    }).catch(() => {});

    if (openWaterfall) {
      showToast(`🎮 Frase inviata all'allievo in versione Caduta ${displayMode === 'learn' ? 'Impara' : 'Arcade'}!`);
    } else {
      showToast(`Frase di ${recordedMasterclassNotes.length} note inviata all'allievo!`);
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

    notesCountRef.current = (notesCountRef.current || 0) + 1;

    const cleanRoomId = normalizeRoomCode(socialSession?.roomId || '', socialSession?.mode || 'masterclass');

    // Send note event over WebSocket if connected in a room
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && cleanRoomId) {
      wsRef.current.send(
        JSON.stringify({
          type: 'piano:key_event',
          roomId: cleanRoomId,
          note,
          eventType: 'down',
          channel: 'melody',
        })
      );
    }

    const isTeacherRole = !isSimulatingStudentMode && (socialSession?.userRole === 'maestro' || (socialSession?.userRole as string) === 'teacher');
    const effectiveRole = isTeacherRole ? 'maestro' : 'student';

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
            showToast('🎉 Perfetto! Hai replicato tutte le note con successo!');
          }

          // WebSocket progress
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'piano:phrase_progress',
                roomId: cleanRoomId,
                currentIndex: nextIdx,
                totalNotes: targetPhrase.length,
                completed: isDone,
                sender: username,
              })
            );
          }

          // HTTP fallback progress
          fetch(getAppApiUrl(`/api/room/${encodeURIComponent(cleanRoomId)}/event`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'piano:phrase_progress',
              sender: username,
              currentIndex: nextIdx,
              totalNotes: targetPhrase.length,
              completed: isDone,
            }),
          }).catch(() => {});
        }
      }
    }

    // Palestra Scale: Interactive step-by-step practice matching
    if (activeScaleExercise && scaleMode === 'practice') {
      const expectedNote = activeScaleExercise.notes[scaleActiveIdx];
      if (note === expectedNote) {
        const next = scaleActiveIdx + 1;
        if (next >= activeScaleExercise.notes.length) {
          showToast(`🎉 Bravissimo! Hai completato ${activeScaleExercise.name}!`);
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

    if (isRecording) {
      const now = (Date.now() - recordStartTime) / 1000;
      recordedNotesRef.current.push({ note, time: now, duration: 0.5 });
    }
  }, [instrument, isRecording, recordStartTime, getTransposedNote, socialSession, isSimulatingStudentMode, showToast, activeScaleExercise, scaleMode, scaleActiveIdx, isScaleLoop]);

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
      {/* ULTRA-COMPACT SINGLE-ROW TOP BAR */}
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
              className="px-1.5 py-0.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
              title="Torna al Menu Principale"
            >
              <Home className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline font-bold">Menu</span>
            </button>
          )}

          {/* Spartiti / Library */}
          <button
            onClick={() => setIsLibraryOpen(true)}
            className="px-1.5 sm:px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-md flex items-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer"
            title="Apri libreria spartiti"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Spartiti</span>
          </button>

          {/* Palestra Scale Button */}
          {onOpenScalesModal && (
            <button
              onClick={onOpenScalesModal}
              className={`px-1.5 sm:px-2 py-0.5 rounded-md flex items-center gap-1 font-bold text-[10px] transition-all cursor-pointer ${
                activeScaleExercise
                  ? 'bg-amber-500 text-slate-950 font-black shadow ring-1 ring-amber-300'
                  : 'bg-slate-800/80 hover:bg-slate-750 text-amber-300 border border-amber-500/30'
              }`}
              title="Palestra di Scale & Diteggiatura"
            >
              <Layers className="w-3 h-3 text-amber-400" />
              <span className="hidden xs:inline">Scale</span>
            </button>
          )}

          {/* Chord Detector Button */}
          <button
            onClick={() => setIsChordDetectorOpen(true)}
            className="px-1.5 sm:px-2 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 rounded-md flex items-center gap-1 font-bold text-[10px] transition-all cursor-pointer"
            title="Analizzatore di Accordi in Tempo Reale"
          >
            <Music className="w-3 h-3 text-amber-400" />
            <span className="hidden xs:inline">Accordi</span>
          </button>

          {/* Toggle Falling Notes (ON / OFF) */}
          <button
            onClick={() => {
              const next = !showWaterfall;
              setShowWaterfall(next);
              if (!next) {
                setSongGuidance(null);
              }
            }}
            className={`px-2 py-0.5 font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
              showWaterfall
                ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 shadow-sm'
                : 'bg-slate-800/90 hover:bg-slate-750 text-slate-300 border border-slate-700'
            }`}
            title={showWaterfall ? 'Note a cascata ATTIVE. Clicca per disattivare (solo pianoforte)' : 'Attiva note a cascata (Waterfall)'}
          >
            <Sparkles className={`w-3 h-3 ${showWaterfall ? 'text-cyan-400' : 'text-slate-400'}`} />
            <span>Note {showWaterfall ? 'ON' : 'OFF'}</span>
          </button>
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

        {/* Right: Pedale, Rec & Options 3-dots */}
        <div className="flex items-center gap-1 shrink-0 flex-nowrap">
          {/* Record button */}
          <button
            onClick={toggleRecording}
            className={`px-1.5 sm:px-2 py-0.5 font-bold rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
              isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 hover:bg-slate-750 text-slate-300'
            }`}
            title={isRecording ? 'Termina registrazione' : 'Registra'}
          >
            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-white' : 'bg-red-500'}`} />
            <span className="hidden sm:inline">{isRecording ? 'Stop' : 'Rec'}</span>
          </button>

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

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 border border-amber-300 animate-in fade-in slide-in-from-top-3 text-xs sm:text-sm pointer-events-none">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* PALESTRA DELLE SCALE & MANO TRASPARENTE HUD BAR */}
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
                  🎵 Nota: {activeScaleExercise.notes[scaleActiveIdx]}
                </span>
                <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded font-bold">
                  🖐️ Dito {activeScaleExercise.fingering[scaleActiveIdx % activeScaleExercise.fingering.length]} (
                  {FINGER_NAMES[activeScaleExercise.fingering[scaleActiveIdx % activeScaleExercise.fingering.length]]?.name || 'Dito'}
                  )
                </span>
                <span className="hidden md:inline text-slate-400 text-[9px]">
                  Passo {scaleActiveIdx + 1} / {activeScaleExercise.notes.length}
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
                title="Mano Trasparente suona automaticamente la scala"
              >
                🤖 Dimostrazione
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
                title="La mano ti guida e aspetta che tu suoni la nota corretta"
              >
                🎯 Pratica Passo-Passo
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
                  title="Nota precedente"
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
                          title="Clicca per attivare il microfono e parlare con l'Allievo"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                          <span>🎙️ Allievo sta parlando! Rispondi</span>
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
                          title="Clicca per attivare il microfono e parlare con il Maestro"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                          <span>🎙️ Maestro sta parlando! Rispondi</span>
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

      {/* SYNTHESIA FALLING NOTES WATERFALL */}
      {showWaterfall && activeSong ? (
        <div className="flex-1 w-full flex flex-col min-h-0 bg-slate-950 overflow-hidden">
          <FallingNotesWaterfall
            song={activeSong}
            keys={GAMEPLAY_KEYS}
            getTransposedNote={getTransposedNote}
            initialPlayMode={masterclassPlayMode}
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
            }}
          />
        </div>
      ) : (
        /* When waterfall is hidden, slim quick chords strip above keys */
        <div className="shrink-0 w-full h-7 sm:h-8 flex items-center justify-center bg-slate-950/80 border-b border-slate-900/80 px-2 overflow-x-auto scrollbar-none gap-1.5 z-10">
          <span className="text-[9px] text-slate-500 uppercase font-bold shrink-0">Accordi:</span>
          <div className="flex items-center gap-1 flex-nowrap">
            {CHORD_PRESETS.map((chord) => (
              <button
                key={chord.name}
                onClick={() => audioEngine.playChord(chord.notes.map((n) => getTransposedNote(n)), '2n', instrument)}
                className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800/80 rounded text-slate-300 hover:text-amber-400 text-[10px] font-semibold shrink-0 cursor-pointer transition-colors"
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
          className="p-0.5 h-6 sm:h-7 w-6 sm:w-7 flex items-center justify-center bg-slate-800 hover:bg-slate-750 text-slate-300 disabled:opacity-25 rounded shrink-0 transition-colors cursor-pointer"
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
          className="p-0.5 h-6 sm:h-7 w-6 sm:w-7 flex items-center justify-center bg-slate-800 hover:bg-slate-750 text-slate-300 disabled:opacity-25 rounded shrink-0 transition-colors cursor-pointer"
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
        noteNotation={noteNotation}
        studioTheme={studioTheme}
        activeGuidanceNote={activeScaleExercise ? activeScaleExercise.notes[scaleActiveIdx] : (songGuidance?.note || null)}
        activeGuidanceFinger={activeScaleExercise ? activeScaleExercise.fingering[scaleActiveIdx % activeScaleExercise.fingering.length] : (songGuidance?.finger || null)}
        activeGuidanceTip={activeScaleExercise?.tips ? activeScaleExercise.tips[scaleActiveIdx % activeScaleExercise.tips.length] : (songGuidance?.tip || null)}
        guidanceHand={activeScaleExercise?.hand || songGuidance?.hand || 'right'}
      />

      {/* OPTIONS MODAL */}
      {isOptionsModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-850 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Options & Customization</h3>
              </div>
              <button
                onClick={() => setIsOptionsModalOpen(false)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-5 overflow-y-auto max-h-[75vh] touch-pan-y text-xs">
              {/* Studio Theme Selector */}
              {onThemeChange && (
                <div>
                  <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-2 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-amber-400" />
                    Visual Theme (Keys & Studio)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'midnight', name: '🌙 Midnight Slate', desc: 'Dark & Gold' },
                      { id: 'mahogany', name: '🪵 Classic Wood', desc: 'Vintage Mahogany' },
                      { id: 'neon', name: '⚡ Cyber Neon', desc: 'Neon Arcade' },
                    ].map((th) => (
                      <button
                        key={th.id}
                        onClick={() => onThemeChange(th.id as StudioTheme)}
                        className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
                          studioTheme === th.id
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow'
                            : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="font-bold text-[11px]">{th.name}</span>
                        <span className="text-[9px] text-slate-400">{th.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* TEST AUDIO NOTE IN SEQUENZA (GLISSANDO CRACKLE-FREE TEST) */}
              <div className="bg-gradient-to-r from-amber-500/15 via-slate-800/80 to-slate-800/80 p-3.5 rounded-xl border border-amber-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="font-bold text-white text-xs">Test Audio Note in Sequenza</span>
                      <span className="text-[10px] text-slate-400 block">Riproduce 36 note a cascata (35ms) per verificare l'assenza di gracidio o blocchi</span>
                    </div>
                  </div>
                  <button
                    onClick={handleRunGlissandoTest}
                    disabled={isTestingGlissando}
                    className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 active:scale-95 disabled:opacity-50 text-slate-950 font-black text-xs rounded-lg shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-all"
                  >
                    <span>{isTestingGlissando ? '⏳ In ascolto...' : '▶️ Prova 36 Note'}</span>
                  </button>
                </div>
                {glissandoTestReport && (
                  <div className="p-2 bg-slate-900/90 rounded-lg border border-slate-700/80 text-[11px] font-mono text-emerald-400">
                    {glissandoTestReport}
                  </div>
                )}
              </div>

              {/* 1. METRONOME & TEMPO */}
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

                {/* BPM Slider & Stepper */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setPianoBpm((prev) => Math.max(40, prev - 5))}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 font-bold text-xs cursor-pointer"
                    title="-5 BPM"
                  >
                    -5
                  </button>
                  <button
                    onClick={() => setPianoBpm((prev) => Math.max(40, prev - 1))}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 font-bold text-xs cursor-pointer"
                    title="-1 BPM"
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
                    title="+1 BPM"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => setPianoBpm((prev) => Math.min(240, prev + 5))}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 font-bold text-xs cursor-pointer"
                    title="+5 BPM"
                  >
                    +5
                  </button>
                </div>

                {/* Quick BPM Presets */}
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
                      setIsOptionsModalOpen(false);
                      setIsMetronomeModalOpen(true);
                    }}
                    className="px-2 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 rounded text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    Open Full Rhythm Console →
                  </button>
                </div>
              </div>

              {/* 2. REAL PIANO MICROPHONE (PITCH DETECTION) */}
              <div className="space-y-2">
                <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic className={`w-4 h-4 ${isMicListening ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <div>
                      <span className="font-bold text-white text-xs">Real Piano Microphone</span>
                      <span className="text-[10px] text-slate-400 block">Play on your acoustic piano and the app detects notes</span>
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

                {/* Keyboard Detection Mode */}
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
                    Use "Economy" for entry-level or non-perfect keyboards (no strict filter). Use "Professional" for high-end digital or acoustic pianos.
                  </span>
                </div>
              </div>

              {/* 3. Master Volume */}
              <div>
                <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-2">
                  3. Master Volume ({volume}%)
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

              {/* Key Layout & Size */}
              <div>
                <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-2">
                  4. Key Layout &amp; Size
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

              {/* Instrument Timbre */}
              <div>
                <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-2">
                  5. Instrument Timbre
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

              {/* Acoustic Profile & Hi-Fi Reverb */}
              <div>
                <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-2">
                  6. Acoustic Profile &amp; Hi-Fi Reverb
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
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

              {/* Octave Transposition */}
              <div>
                <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-2">
                  7. Octave Transposition
                </label>
                <div className="flex items-center gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-300">Shift Octave:</span>
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

              {/* Note Notation Format */}
              <div>
                <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-2">
                  8. Note Notation (Key Labels)
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
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
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

              {/* Horizontal View Always Active */}
              <div className="pt-2 border-t border-slate-800">
                <div className="p-3 bg-slate-800/50 rounded-xl flex items-center justify-between">
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
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-amber-400 border border-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>Flip 180°</span>
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
                Close
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
    </div>
  );
};
