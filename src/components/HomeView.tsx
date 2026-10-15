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
} from 'lucide-react';
import { audioEngine } from '../utils/audioEngine';
import { loadGamificationState } from '../utils/gamification';

interface HomeViewProps {
  onSelectView: (view: ViewMode) => void;
  onInitAudio: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onSelectView, onInitAudio }) => {
  const [isPlayingWelcome, setIsPlayingWelcome] = useState<boolean>(false);
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
              MAESTRO
            </span>
            <span className="text-white tracking-widest font-light text-2xl sm:text-3xl md:text-4xl opacity-90 border-l border-slate-700 pl-3">
              STUDIO
            </span>
          </h1>

          {/* Golden Subtitle Line */}
          <div className="flex items-center justify-center gap-2 text-slate-400 text-xs sm:text-sm mt-1">
            <span className="w-8 h-px bg-gradient-to-r from-transparent to-amber-500/60" />
            <span className="font-medium text-slate-300">
              Pianoforte a coda, spartiti interattivi e jam band con rhythm section
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
            <span>{isPlayingWelcome ? 'Riproduzione Accordo...' : 'Tocca per ascoltare accordo di prova'}</span>
          </button>
        </div>
      </div>

      {/* THREE REVOLUTIONIZED STUDIO MODULE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 my-4">
        {/* CARD 1: PIANOFORTE & SPARTITI */}
        <div
          onClick={() => handleOpenMode('piano')}
          onMouseEnter={() => {
            setActiveTabPreview('piano');
            audioEngine.playNote('C4', '8n', 'piano');
          }}
          className="group relative bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-amber-500/30 hover:border-amber-400 p-5 rounded-3xl cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/20 hover:-translate-y-1 flex flex-col justify-between overflow-hidden"
        >
          {/* Top Tag & Acoustic Accent */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
              88 TASTI • WATERFALL NOTE
            </span>
            <div className="w-2 h-2 rounded-full bg-amber-400 group-hover:animate-ping" />
          </div>

          {/* Visual Piano Motif */}
          <div className="my-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
                <Piano className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white group-hover:text-amber-300 transition-colors">
                  Pianoforte
                </h3>
                <span className="text-xs text-amber-400/90 font-medium">Gran Coda & Spartiti</span>
              </div>
            </div>

            {/* Interactive Mini Keyboard Visual Illustration */}
            <div className="h-10 w-full bg-slate-950 rounded-xl p-1 flex border border-slate-800 shadow-inner overflow-hidden">
              {['C', 'D', 'E', 'F', 'G', 'A', 'B'].map((k, i) => (
                <div
                  key={i}
                  className="flex-1 bg-slate-200 border-r border-slate-400 last:border-0 rounded-b-[2px] flex items-end justify-center pb-0.5 text-[8px] font-bold text-slate-700 group-hover:bg-amber-100 transition-colors"
                >
                  {k}
                </div>
              ))}
            </div>

            <p className="text-slate-400 text-xs leading-relaxed">
              Tastiera orizzontale a schermo intero con <strong className="text-amber-300 font-bold">glissando</strong>, note a cascata stile Synthesia e sfide musicali.
            </p>
          </div>

          {/* Action button */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-amber-400 font-black text-xs group-hover:text-amber-300">
            <span>Suona Ora</span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 group-hover:bg-amber-500 group-hover:text-slate-950 flex items-center justify-center transition-all">
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* CARD 2: SHEET COMPOSER */}
        <div
          onClick={() => handleOpenMode('sheet')}
          onMouseEnter={() => {
            setActiveTabPreview('sheet');
            audioEngine.playNote('E4', '8n', 'piano');
          }}
          className="group relative bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-indigo-500/30 hover:border-indigo-400 p-5 rounded-3xl cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-1 flex flex-col justify-between overflow-hidden"
        >
          {/* Top Tag & Acoustic Accent */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
              PENTAGRAMMA • SEQUENCER
            </span>
            <div className="w-2 h-2 rounded-full bg-indigo-400 group-hover:animate-ping" />
          </div>

          {/* Visual Sheet Motif */}
          <div className="my-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white group-hover:text-indigo-300 transition-colors">
                  Sheet Composer
                </h3>
                <span className="text-xs text-indigo-400/90 font-medium">Compositore & Editor</span>
              </div>
            </div>

            {/* Interactive Pentagram Stave Illustration */}
            <div className="h-10 w-full bg-slate-950/80 rounded-xl p-2 flex flex-col justify-between border border-slate-800 shadow-inner relative overflow-hidden">
              <div className="w-full h-px bg-slate-700" />
              <div className="w-full h-px bg-slate-700" />
              <div className="w-full h-px bg-slate-700" />
              <div className="w-full h-px bg-slate-700" />
              <div className="w-full h-px bg-slate-700" />
              {/* Note heads overlay */}
              <div className="absolute top-1 left-4 text-xs font-serif text-indigo-400">𝄞</div>
              <div className="absolute top-3 left-12 w-2 h-2 rounded-full bg-amber-400" />
              <div className="absolute top-1.5 left-24 w-2 h-2 rounded-full bg-indigo-400" />
              <div className="absolute top-4 left-36 w-2 h-2 rounded-full bg-emerald-400" />
            </div>

            <p className="text-slate-400 text-xs leading-relaxed">
              Crea spartiti nota per nota, imposta <strong className="text-indigo-300 font-bold">BPM e melodia</strong>, salva nella tua libreria ed esporta in formato JSON.
            </p>
          </div>

          {/* Action button */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-indigo-400 font-black text-xs group-hover:text-indigo-300">
            <span>Componi Ora</span>
            <div className="w-7 h-7 rounded-xl bg-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white flex items-center justify-center transition-all">
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* CARD 3: JAM BAND STUDIO */}
        <div
          onClick={() => handleOpenMode('jam')}
          onMouseEnter={() => {
            setActiveTabPreview('jam');
            audioEngine.playNote('G3', '8n', 'piano');
          }}
          className="group relative bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-emerald-500/30 hover:border-emerald-400 p-5 rounded-3xl cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-1 flex flex-col justify-between overflow-hidden"
        >
          {/* Top Tag & Acoustic Accent */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
              LIVE BAND • 4 STRUMENTI
            </span>
            <div className="w-2 h-2 rounded-full bg-emerald-400 group-hover:animate-ping" />
          </div>

          {/* Visual Jam Motif */}
          <div className="my-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                <Radio className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white group-hover:text-emerald-300 transition-colors">
                  Jam Band Studio
                </h3>
                <span className="text-xs text-emerald-400/90 font-medium">Virtual Rhythm Section</span>
              </div>
            </div>

            {/* Interactive Multi-track VU meters Illustration */}
            <div className="h-10 w-full bg-slate-950 rounded-xl p-2 flex items-center justify-around border border-slate-800 shadow-inner">
              {[
                { name: 'Piano', color: 'bg-amber-400' },
                { name: 'Basso', color: 'bg-emerald-400' },
                { name: 'Batteria', color: 'bg-rose-400' },
                { name: 'Chitarra', color: 'bg-cyan-400' },
              ].map((trk, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <div className="w-6 h-3 bg-slate-800 rounded-sm overflow-hidden flex">
                    <div className={`h-full ${trk.color} w-3/4 rounded-sm animate-pulse`} />
                  </div>
                  <span className="text-[7px] text-slate-500 uppercase font-black">{trk.name}</span>
                </div>
              ))}
            </div>

            <p className="text-slate-400 text-xs leading-relaxed">
              Suona con una band automatica: <strong className="text-emerald-300 font-bold">basso, batteria acustica</strong> e chitarra jazz, rock, blues e lofi.
            </p>
          </div>

          {/* Action button */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-emerald-400 font-black text-xs group-hover:text-emerald-300">
            <span>Avvia Jam</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-slate-950 flex items-center justify-center transition-all">
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER SOUNDBOARD BAR: Quick Studio Stats & Acoustic Engine indicator */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
            <Disc3 className="w-4 h-4 animate-spin text-amber-400" />
            <span>Maestro Audio Engine: 44.1 kHz Hi-Fi</span>
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
              <span>{gamification.currentStreak} Giorni di fila</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl">
            <Award className="w-3.5 h-3.5" />
            <span>Livello {gamification.level}: {gamification.levelTitle}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
