import React, { useState } from 'react';
import { ViewMode } from '../types';
import {
  Piano,
  BookOpen,
  Radio,
  ArrowRight,
  Music,
  Disc3,
  Volume2,
  Sparkles,
  Flame,
  Award,
  Users,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { audioEngine } from '../utils/audioEngine';
import { loadGamificationState } from '../utils/gamification';
import { APP_VERSION } from '../utils/versionInfo';
import { TutorialModal } from './TutorialModal';
import { isNativePlatform } from '../utils/networkHelper';

interface HomeViewProps {
  onSelectView: (view: ViewMode) => void;
  onInitAudio: () => void;
  onOpenScalesModal?: () => void;
  onOpenVersionModal?: () => void;
  onOpenPlayAssetsModal?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectView,
  onInitAudio,
  onOpenScalesModal,
  onOpenVersionModal,
  onOpenPlayAssetsModal,
}) => {
  const [isPlayingWelcome, setIsPlayingWelcome] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [gamification] = useState(() => loadGamificationState());
  const [, setActiveTabPreview] = useState<string | null>(null);

  // Play a lush, inspiring acoustic grand piano arpeggio on title tap
  const playWelcomeChord = async () => {
    onInitAudio();
    if (isPlayingWelcome) return;
    setIsPlayingWelcome(true);

    const notes = ['C3', 'G3', 'C4', 'E4', 'G4', 'B4', 'D5'];
    for (let i = 0; i < notes.length; i++) {
      audioEngine.playNote(notes[i], '2n', 'piano');
      await new Promise((r) => setTimeout(r, 85));
    }

    setTimeout(() => {
      setIsPlayingWelcome(false);
    }, 1600);
  };

  const handleOpenMode = (view: ViewMode) => {
    onInitAudio();
    onSelectView(view);
  };

  // Shared card dimension and structure classes for pixel-perfect uniformity across all 7 cards
  const cardBaseClass =
    'group relative w-[calc(50%-0.45rem)] md:w-[calc(25%-0.65rem)] p-3 sm:p-3.5 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden min-h-[165px] sm:min-h-[178px] shrink-0';

  return (
    <div className="relative max-w-6xl mx-auto px-3 sm:px-5 pt-2 pb-2.5 sm:pt-2.5 sm:pb-3 flex flex-col justify-between min-h-[calc(100vh-4rem)] select-none">
      {/* Background Decorative Ambient Lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute top-10 right-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      {/* COMPACT ARTISTIC TITLE LOGO - Positioned with equal distance to top bar and to boxes */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 mt-0.5 mb-2 sm:mt-1 sm:mb-2.5 shrink-0">
        <div className="h-[1px] flex-1 max-w-[80px] sm:max-w-[140px] bg-gradient-to-r from-transparent via-amber-500/30 to-amber-400/60 hidden sm:block" />

        <div
          onClick={playWelcomeChord}
          className="group relative flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800/95 border border-amber-500/40 hover:border-amber-400 shadow-md shadow-amber-500/10 cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
          title="VirtuKeys Studio - Click to play test chord"
        >
          {/* Artistic Luxury Clef Crest */}
          <div className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-300 p-[1.5px] shadow-sm shadow-amber-500/40 shrink-0">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
              <span className="text-amber-400 text-xs sm:text-sm font-serif leading-none select-none">
                𝄞
              </span>
            </div>
          </div>

          {/* Stylized Designed Brand Name */}
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-base sm:text-lg md:text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.35)]">
              VIRTUKEYS
            </span>
            <span className="h-3 w-px bg-amber-500/40" />
            <span className="text-[10px] sm:text-xs font-semibold tracking-[0.2em] text-slate-300 uppercase font-sans">
              STUDIO
            </span>
          </div>

          {/* Interactive Audio Chime Icon Indicator */}
          <span className="text-[10px] text-amber-400/80 group-hover:text-amber-300 flex items-center gap-1 pl-1 border-l border-slate-700/60 ml-0.5">
            <Music className={`w-3 h-3 ${isPlayingWelcome ? 'animate-bounce text-amber-300' : 'text-amber-400/70'}`} />
            <span className="hidden md:inline text-[9px] font-mono font-medium text-amber-300/80">
              {isPlayingWelcome ? 'Playing...' : 'Test Chord'}
            </span>
          </span>
        </div>

        <div className="h-[1px] flex-1 max-w-[80px] sm:max-w-[140px] bg-gradient-to-l from-transparent via-amber-500/30 to-amber-400/60 hidden sm:block" />
      </div>

      {/* 2-ROW UNIFORM CARDS: All 7 cards have the EXACT same width, height, and proportions */}
      <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3 max-w-5xl mx-auto w-full my-auto flex-1 items-center">
        {/* CARD 1: PIANO */}
        <div
          onClick={() => handleOpenMode('piano')}
          onMouseEnter={() => {
            setActiveTabPreview('piano');
            audioEngine.playNote('C4', '8n', 'piano');
          }}
          className={`${cardBaseClass} bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-amber-500/30 hover:border-amber-400 hover:shadow-amber-500/20`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
              88 KEYS
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 group-hover:animate-ping" />
          </div>

          <div className="my-2 space-y-1.5 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/30 group-hover:scale-105 transition-transform shrink-0">
                <Piano className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-white group-hover:text-amber-300 transition-colors leading-tight truncate">
                  Piano
                </h3>
                <span className="text-[10px] text-amber-400/90 font-medium truncate block">88 Keys & Waterfall</span>
              </div>
            </div>

            <p className="text-slate-400 text-[11px] leading-snug line-clamp-2 h-[2.5rem]">
              88-key piano keyboard, falling notes waterfall, and built-in recorder.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-amber-400 font-bold text-[11px] group-hover:text-amber-300">
            <span>Play Now</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* CARD 2: SHEET MUSIC COMPOSER */}
        <div
          onClick={() => handleOpenMode('sheet')}
          onMouseEnter={() => {
            setActiveTabPreview('sheet');
            audioEngine.playNote('E4', '8n', 'piano');
          }}
          className={`${cardBaseClass} bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-indigo-500/30 hover:border-indigo-400 hover:shadow-indigo-500/20`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded-full">
              SHEET MUSIC
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 group-hover:animate-ping" />
          </div>

          <div className="my-2 space-y-1.5 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/30 group-hover:scale-105 transition-transform shrink-0">
                <BookOpen className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-white group-hover:text-indigo-300 transition-colors leading-tight truncate">
                  Composer
                </h3>
                <span className="text-[10px] text-indigo-400/90 font-medium truncate block">Score & Notation</span>
              </div>
            </div>

            <p className="text-slate-400 text-[11px] leading-snug line-clamp-2 h-[2.5rem]">
              Compose sheet music note-by-note and export directly to MIDI.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-indigo-400 font-bold text-[11px] group-hover:text-indigo-300">
            <span>Compose</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* CARD 3: JAM BAND STUDIO */}
        <div
          onClick={() => handleOpenMode('jam')}
          onMouseEnter={() => {
            setActiveTabPreview('jam');
            audioEngine.playNote('G3', '8n', 'piano');
          }}
          className={`${cardBaseClass} bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-emerald-500/30 hover:border-emerald-400 hover:shadow-emerald-500/20`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              LIVE BAND
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 group-hover:animate-ping" />
          </div>

          <div className="my-2 space-y-1.5 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/30 group-hover:scale-105 transition-transform shrink-0">
                <Radio className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-white group-hover:text-emerald-300 transition-colors leading-tight truncate">
                  Jam Band
                </h3>
                <span className="text-[10px] text-emerald-400/90 font-medium truncate block">Live Drums & Bass</span>
              </div>
            </div>

            <p className="text-slate-400 text-[11px] leading-snug line-clamp-2 h-[2.5rem]">
              Jam with auto-accompaniment on live drum rhythms and bass lines.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-emerald-400 font-bold text-[11px] group-hover:text-emerald-300">
            <span>Start Jam</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* CARD 4: SCALE GYM */}
        <div
          onClick={() => {
            onInitAudio();
            if (onOpenScalesModal) onOpenScalesModal();
          }}
          onMouseEnter={() => {
            audioEngine.playNote('C4', '8n', 'piano');
          }}
          className={`${cardBaseClass} bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-cyan-500/30 hover:border-cyan-400 hover:shadow-cyan-500/20`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full">
              TECHNIQUE
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover:animate-ping" />
          </div>

          <div className="my-2 space-y-1.5 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/30 group-hover:scale-105 transition-transform shrink-0">
                <Layers className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-white group-hover:text-cyan-300 transition-colors leading-tight truncate">
                  Scale Gym
                </h3>
                <span className="text-[10px] text-cyan-300/90 font-medium truncate block">Hanon & Scales</span>
              </div>
            </div>

            <p className="text-slate-400 text-[11px] leading-snug line-clamp-2 h-[2.5rem]">
              Practice 12 major & minor scales, Hanon exercises, and fingering.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-cyan-300 font-bold text-[11px] group-hover:text-cyan-200">
            <span>Open Gym</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* CARD 5: SOCIAL & MASTERCLASS */}
        <div
          onClick={() => handleOpenMode('social')}
          onMouseEnter={() => {
            setActiveTabPreview('social');
            audioEngine.playNote('B4', '8n', 'piano');
          }}
          className={`${cardBaseClass} bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-purple-500/30 hover:border-purple-400 hover:shadow-purple-500/20`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-full">
              MASTERCLASS
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 group-hover:animate-ping" />
          </div>

          <div className="my-2 space-y-1.5 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-400 flex items-center justify-center text-white shadow-md shadow-purple-500/30 group-hover:scale-105 transition-transform shrink-0">
                <Users className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-white group-hover:text-purple-300 transition-colors leading-tight truncate">
                  Masterclass
                </h3>
                <span className="text-[10px] text-purple-400/90 font-medium truncate block">Live 1v1 Room</span>
              </div>
            </div>

            <p className="text-slate-400 text-[11px] leading-snug line-clamp-2 h-[2.5rem]">
              Live lessons with voice audio, 1v1 duels, and shared musical phrases.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-purple-400 font-bold text-[11px] group-hover:text-purple-300">
            <span>Enter Classroom</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* CARD 6: RECORDINGS & ARCHIVE */}
        <div
          onClick={() => handleOpenMode('recordings')}
          onMouseEnter={() => {
            setActiveTabPreview('recordings');
            audioEngine.playNote('A4', '8n', 'piano');
          }}
          className={`${cardBaseClass} bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-slate-700/60 hover:border-slate-500 hover:shadow-slate-500/10`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-800/60 border border-slate-700 px-2 py-0.5 rounded-full">
              ARCHIVE
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:animate-ping" />
          </div>

          <div className="my-2 space-y-1.5 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform shrink-0">
                <Disc3 className="w-4 h-4 stroke-[2.2] animate-spin [animation-duration:10s]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-white group-hover:text-slate-200 transition-colors leading-tight truncate">
                  Recordings
                </h3>
                <span className="text-[10px] text-slate-400 font-medium truncate block">Saved Tracks</span>
              </div>
            </div>

            <p className="text-slate-400 text-[11px] leading-snug line-clamp-2 h-[2.5rem]">
              Listen to and export your live piano performances.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-slate-300 font-bold text-[11px] group-hover:text-white">
            <span>Archive</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* CARD 7: ORECCHIO ASSOLUTO (EAR TRAINING) */}
        <div
          onClick={() => handleOpenMode('ear')}
          onMouseEnter={() => {
            setActiveTabPreview('ear');
            audioEngine.playNote('F4', '8n', 'piano');
          }}
          className={`${cardBaseClass} bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-fuchsia-500/35 hover:border-fuchsia-400 hover:shadow-fuchsia-500/20`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-fuchsia-300 bg-fuchsia-500/15 border border-fuchsia-500/35 px-2 py-0.5 rounded-full">
              EAR TRAINING
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 group-hover:animate-ping" />
          </div>

          <div className="my-2 space-y-1.5 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-amber-400 flex items-center justify-center text-slate-950 shadow-md shadow-fuchsia-500/30 group-hover:scale-105 transition-transform shrink-0 text-base">
                👂
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-white group-hover:text-fuchsia-300 transition-colors leading-tight truncate">
                  Orecchio
                </h3>
                <span className="text-[10px] text-fuchsia-300/90 font-medium truncate block">Indovina la Nota</span>
              </div>
            </div>

            <p className="text-slate-400 text-[11px] leading-snug line-clamp-2 h-[2.5rem]">
              Allena l&apos;orecchio assoluto con la tastiera gigante dedicata: ascolta e indovina!
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-fuchsia-300 font-bold text-[11px] group-hover:text-fuchsia-200">
            <span>Allena Orecchio</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* CARD 8: TUTORIAL & GUIDE */}
        <div
          onClick={() => {
            onInitAudio();
            setIsTutorialOpen(true);
          }}
          onMouseEnter={() => {
            audioEngine.playNote('D4', '8n', 'piano');
          }}
          className={`${cardBaseClass} bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-yellow-500/40 hover:border-yellow-300 hover:shadow-yellow-500/25 ring-1 ring-yellow-500/20`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-yellow-300 bg-yellow-500/20 border border-yellow-500/40 px-2 py-0.5 rounded-full">
              GUIDE
            </span>
            <Sparkles className="w-3 h-3 text-yellow-400 group-hover:animate-spin" />
          </div>

          <div className="my-2 space-y-1.5 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-300 flex items-center justify-center text-slate-950 shadow-md shadow-yellow-500/30 group-hover:scale-105 transition-transform shrink-0">
                <BookOpen className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-white group-hover:text-yellow-300 transition-colors leading-tight truncate">
                  Tutorial
                </h3>
                <span className="text-[10px] text-yellow-300 font-bold truncate block">All Options</span>
              </div>
            </div>

            <p className="text-slate-300 text-[11px] leading-snug line-clamp-2 h-[2.5rem]">
              Detailed guide to Masterclass, MIDI setup, sheet music, and options.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-yellow-300 font-bold text-[11px] group-hover:text-yellow-200">
            <span>Open Guide</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* FOOTER SOUNDBOARD BAR: Low profile stats and version trigger */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-1.5 sm:py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 shadow-md backdrop-blur-md shrink-0 mt-2">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
            <Disc3 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>VirtuKeys Audio: 44.1 kHz Hi-Fi</span>
          </div>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <div className="hidden sm:flex items-center gap-1 text-slate-300 text-[10px]">
            <Volume2 className="w-3 h-3 text-slate-400" />
            <span>Zero-latency Engine</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {gamification.currentStreak > 0 && (
            <div className="flex items-center gap-1 text-orange-400 font-black bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-lg text-[10px]">
              <Flame className="w-3 h-3 fill-orange-400" />
              <span>{gamification.currentStreak}d</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg text-[10px]">
            <Award className="w-3 h-3" />
            <span>Lv.{gamification.level}</span>
          </div>

          {onOpenVersionModal && (
            <button
              onClick={onOpenVersionModal}
              className="flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-amber-300 bg-slate-950/70 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 px-2 py-0.5 rounded-lg transition-all cursor-pointer shadow-sm active:scale-95"
              title="Studio version & VPS alignment"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>v{APP_VERSION}</span>
            </button>
          )}

          <a
            href={typeof window !== 'undefined' && window.location.pathname.toLowerCase().startsWith('/song') ? '/Song/privacy.html' : '/privacy.html'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-lg transition-all cursor-pointer shadow-sm ml-1"
            title="Norme sulla Privacy (Privacy Policy)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Privacy</span>
          </a>
        </div>
      </div>

      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onOpenMode={handleOpenMode}
      />
    </div>
  );
};
