import React, { useState, useEffect } from 'react';
import { ViewMode } from '../types';
import {
  Piano,
  BookOpen,
  Radio,
  ArrowRight,
  Music,
  Disc3,
  Sliders,
  Volume2,
  Sparkles,
  Flame,
  Award,
  Play,
  Activity,
  Headphones,
  Users,
  Layers,
} from 'lucide-react';
import { audioEngine } from '../utils/audioEngine';
import { loadGamificationState } from '../utils/gamification';
import { APP_VERSION } from '../utils/versionInfo';
import { TutorialModal } from './TutorialModal';

interface HomeViewProps {
  onSelectView: (view: ViewMode) => void;
  onInitAudio: () => void;
  onOpenScalesModal?: () => void;
  onOpenVersionModal?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectView,
  onInitAudio,
  onOpenScalesModal,
  onOpenVersionModal,
}) => {
  const [isPlayingWelcome, setIsPlayingWelcome] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [gamification] = useState(() => loadGamificationState());
  const [activeTabPreview, setActiveTabPreview] = useState<string | null>(null);

  // Play a lush, inspiring acoustic grand piano arpeggio
  const playWelcomeChord = async () => {
    onInitAudio();
    if (isPlayingWelcome) return;
    setIsPlayingWelcome(true);

    const notes = ['C3', 'G3', 'C4', 'E4', 'G4', 'B4', 'D5'];
    for (let i = 0; i < notes.length; i++) {
      audioEngine.playNote(notes[i], '2n', 'piano');
      await new Promise((r) => setTimeout(r, 90));
    }

    setTimeout(() => {
      setIsPlayingWelcome(false);
    }, 1800);
  };

  const handleOpenMode = (view: ViewMode) => {
    onInitAudio();
    onSelectView(view);
  };

  return (
    <div className="relative max-w-6xl mx-auto px-4 py-4 sm:py-6 flex flex-col justify-between min-h-[calc(100vh-5rem)] select-none">
      {/* Background Decorative Musical Staves & Subtle Neon Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        {/* Subtle ambient lighting */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute top-10 right-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />

        {/* Floating Musical Clefs & Stave lines */}
        <div className="absolute top-12 left-6 text-amber-500/10 text-8xl font-serif select-none hidden lg:block">
          𝄞
        </div>
        <div className="absolute bottom-16 right-8 text-indigo-500/10 text-8xl font-serif select-none hidden lg:block">
          𝄢
        </div>
        <div className="absolute top-1/2 right-1/4 text-emerald-500/10 text-6xl font-serif select-none hidden sm:block">
          ♫
        </div>
        <div className="absolute bottom-1/3 left-1/4 text-amber-500/10 text-5xl font-serif select-none hidden sm:block">
          ♩
        </div>
      </div>

      {/* HEADER SECTION: Grand Studio Console Banner */}
      <div className="text-center space-y-3">
        {/* Top Tag & Audio Status */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-amber-500/30 text-amber-400 text-xs shadow-lg backdrop-blur-md">
          <Music className="w-3.5 h-3.5 animate-pulse text-amber-400" />
          <span className="font-extrabold uppercase tracking-widest text-[10px]">
            Acoustic Grand Piano & Multi-Track Studio
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        </div>

        {/* Revolutionary Title with Luxury Music Studio Typography */}
        <div className="relative inline-block">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white flex items-center justify-center gap-3">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 drop-shadow-[0_0_25px_rgba(245,158,11,0.35)]">
              VIRTUKEYS
            </span>
            <span className="text-white tracking-widest font-light text-2xl sm:text-3xl md:text-4xl opacity-90 border-l border-slate-700 pl-3">
              STUDIO
            </span>
          </h1>

          {/* Golden Subtitle Line */}
          <div className="flex items-center justify-center gap-2 text-slate-400 text-xs sm:text-sm mt-1">
            <span className="w-8 h-px bg-gradient-to-r from-transparent to-amber-500/60" />
            <span className="font-medium text-slate-300">
              Concert grand piano, interactive sheet music, and rhythm section jam band
            </span>
            <span className="w-8 h-px bg-gradient-to-l from-transparent to-amber-500/60" />
          </div>
        </div>

        {/* Live Audio Spectrum Visualizer (Dancing Bars) */}
        <div className="flex items-center justify-center gap-1 sm:gap-1.5 h-6 my-1">
          {[14, 28, 45, 70, 95, 60, 40, 80, 100, 75, 50, 85, 65, 90, 45, 30, 60, 80, 50, 25, 40, 70, 90, 60].map(
            (val, i) => (
              <span
                key={i}
                className="w-1 sm:w-1.5 rounded-full bg-gradient-to-t from-amber-500 to-yellow-300 transition-all duration-300"
                style={{
                  height: isPlayingWelcome
                    ? `${Math.max(20, Math.sin((i + Date.now() / 200)) * 50 + 50)}%`
                    : `${Math.max(15, val * 0.4)}%`,
                  opacity: 0.6 + (i % 3) * 0.15,
                }}
              />
            )
          )}
        </div>

        {/* Welcome Chime Preview Button */}
        <div>
          <button
            onClick={playWelcomeChord}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/40 rounded-full text-xs font-bold transition-all shadow-md active:scale-95 group"
          >
            <Play className={`w-3.5 h-3.5 fill-amber-400 ${isPlayingWelcome ? 'animate-spin' : ''}`} />
            <span>{isPlayingWelcome ? 'Playing Preview Chord...' : 'Tap to play test chord'}</span>
          </button>
        </div>
      </div>

      {/* STREAMLINED COMPACT STUDIO MODULE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3 my-3">
        {/* CARD 1: PIANO */}
        <div
          onClick={() => handleOpenMode('piano')}
          onMouseEnter={() => {
            setActiveTabPreview('piano');
            audioEngine.playNote('C4', '8n', 'piano');
          }}
          className="group relative bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-amber-500/30 hover:border-amber-400 p-3.5 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/20 hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
              88 KEYS
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 group-hover:animate-ping" />
          </div>

          <div className="my-2.5 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/30 group-hover:scale-105 transition-transform shrink-0">
                <Piano className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors leading-tight">
                  Piano
                </h3>
                <span className="text-[10px] text-amber-400/90 font-medium">88 Keys & Waterfall</span>
              </div>
            </div>

            <p className="text-slate-400 text-[11px] leading-snug line-clamp-2">
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
          className="group relative bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-indigo-500/30 hover:border-indigo-400 p-3.5 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/20 hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded-full">
              SHEET MUSIC
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 group-hover:animate-ping" />
          </div>

          <div className="my-2.5 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/30 group-hover:scale-105 transition-transform shrink-0">
                <BookOpen className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white group-hover:text-indigo-300 transition-colors leading-tight">
                  Composer
                </h3>
                <span className="text-[10px] text-indigo-400/90 font-medium">Score & Notation</span>
              </div>
            </div>

            <p className="text-slate-400 text-[11px] leading-snug line-clamp-2">
              Compose sheet music note-by-note and export to MIDI.
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
          className="group relative bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-emerald-500/30 hover:border-emerald-400 p-3.5 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/20 hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              LIVE BAND
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 group-hover:animate-ping" />
          </div>

          <div className="my-2.5 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/30 group-hover:scale-105 transition-transform shrink-0">
                <Radio className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors leading-tight">
                  Jam Band
                </h3>
                <span className="text-[10px] text-emerald-400/90 font-medium">Live Drums & Bass</span>
              </div>
            </div>

            <p className="text-slate-400 text-[11px] leading-snug line-clamp-2">
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
          className="group relative bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-cyan-500/30 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/20 hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full">
              TECHNIQUE
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover:animate-ping" />
          </div>

          <div className="my-2.5 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/30 group-hover:scale-105 transition-transform shrink-0">
                <Layers className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors leading-tight">
                  Scale Gym
                </h3>
                <span className="text-[10px] text-cyan-300/90 font-medium">Hanon & Scales</span>
              </div>
            </div>

            <p className="text-slate-400 text-[11px] leading-snug line-clamp-2">
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
          className="group relative bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-purple-500/30 hover:border-purple-400 p-3.5 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-full">
              MASTERCLASS
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 group-hover:animate-ping" />
          </div>

          <div className="my-2.5 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-400 flex items-center justify-center text-white shadow-md shadow-purple-500/30 group-hover:scale-105 transition-transform shrink-0">
                <Users className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white group-hover:text-purple-300 transition-colors leading-tight">
                  Masterclass & Social
                </h3>
                <span className="text-[10px] text-purple-400/90 font-medium">Teacher ↔ Student Live</span>
              </div>
            </div>

            <p className="text-slate-400 text-[11px] leading-snug line-clamp-2">
              Live lessons with voice audio, 1v1 duels, and shared musical phrases.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-purple-400 font-bold text-[11px] group-hover:text-purple-300">
            <span>Enter Classroom</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* CARD 6: TUTORIAL & GUIDA COMPLETA */}
        <div
          onClick={() => {
            onInitAudio();
            setIsTutorialOpen(true);
          }}
          onMouseEnter={() => {
            audioEngine.playNote('D4', '8n', 'piano');
          }}
          className="group relative bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-yellow-500/40 hover:border-yellow-300 p-3.5 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/25 hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden ring-1 ring-yellow-500/20"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-yellow-300 bg-yellow-500/20 border border-yellow-500/40 px-2 py-0.5 rounded-full">
              APP GUIDE
            </span>
            <Sparkles className="w-3 h-3 text-yellow-400 group-hover:animate-spin" />
          </div>

          <div className="my-2.5 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-300 flex items-center justify-center text-slate-950 shadow-md shadow-yellow-500/30 group-hover:scale-105 transition-transform shrink-0">
                <BookOpen className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white group-hover:text-yellow-300 transition-colors leading-tight">
                  Tutorial
                </h3>
                <span className="text-[10px] text-yellow-300 font-bold">Guide & Options</span>
              </div>
            </div>

            <p className="text-slate-300 text-[11px] leading-snug line-clamp-2">
              Detailed guide to Masterclass, MIDI setup, sheet music, and all options.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-yellow-300 font-bold text-[11px] group-hover:text-yellow-200">
            <span>Open Guide</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* CARD 7: RECORDINGS & EXERCISES */}
        <div
          onClick={() => handleOpenMode('recordings')}
          onMouseEnter={() => {
            setActiveTabPreview('recordings');
            audioEngine.playNote('A4', '8n', 'piano');
          }}
          className="group relative bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-slate-700/60 hover:border-slate-500 p-3.5 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/10 hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-800/60 border border-slate-700 px-2 py-0.5 rounded-full">
              ARCHIVE
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:animate-ping" />
          </div>

          <div className="my-2.5 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform shrink-0">
                <Disc3 className="w-4 h-4 stroke-[2.2] animate-spin [animation-duration:10s]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white group-hover:text-slate-200 transition-colors leading-tight">
                  Recordings
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">Saved Tracks</span>
              </div>
            </div>

            <p className="text-slate-400 text-[11px] leading-snug line-clamp-2">
              Listen to and export your live piano performances.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-slate-300 font-bold text-[11px] group-hover:text-white">
            <span>Archive</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* FOOTER SOUNDBOARD BAR: Quick Studio Stats & Acoustic Engine indicator */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
            <Disc3 className="w-4 h-4 animate-spin text-amber-400" />
            <span>VirtuKeys Audio Engine: 44.1 kHz Hi-Fi</span>
          </div>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <div className="hidden sm:flex items-center gap-1.5 text-slate-300">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Zero-latency Web Audio</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {gamification.currentStreak > 0 && (
            <div className="flex items-center gap-1 text-orange-400 font-black bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-xl">
              <Flame className="w-3.5 h-3.5 fill-orange-400" />
              <span>{gamification.currentStreak} Day streak</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl">
            <Award className="w-3.5 h-3.5" />
            <span>Level {gamification.level}: {gamification.levelTitle}</span>
          </div>

          {onOpenVersionModal && (
            <button
              onClick={onOpenVersionModal}
              className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 hover:text-amber-300 bg-slate-950/70 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 px-2.5 py-1 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
              title="Verifica versione Studio e allineamento server VPS"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>v{APP_VERSION}</span>
            </button>
          )}
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
