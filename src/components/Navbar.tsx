import React from 'react';
import { ViewMode } from '../types';
import { Piano, BookOpen, Layers, Volume2, VolumeX, Home, Music } from 'lucide-react';

interface NavbarProps {
  currentView: ViewMode | 'home';
  onSelectView: (view: ViewMode | 'home') => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  isAudioActive: boolean;
  onInitAudio: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  volume,
  onVolumeChange,
  isAudioActive,
  onInitAudio,
}) => {
  return (
    <header className="relative w-full bg-slate-950/95 backdrop-blur-md border-b border-amber-500/20 text-slate-100 select-none z-30 shrink-0">
      {/* 5-Line Musical Pentagramma Micro-Stave Border Accent */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-25 flex flex-col justify-between pointer-events-none">
        <div className="w-full h-[0.5px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
        <div className="w-full h-[0.5px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 h-12 sm:h-13 flex items-center justify-between gap-1.5 sm:gap-4">
        {/* BRAND LOGO: Luxury Musical Emblem */}
        <div
          onClick={() => onSelectView('home')}
          className="flex items-center gap-1.5 sm:gap-2.5 cursor-pointer group shrink-0"
          title="Torna alla Home"
        >
          {/* Vinyl Disc with Golden Treble Clef */}
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-300 p-0.5 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center border border-amber-500/40">
              <span className="text-amber-400 text-xs sm:text-sm font-serif leading-none select-none">
                𝄞
              </span>
            </div>
          </div>

          {/* Wordmark with Mini Visualizer */}
          <div className="flex items-baseline gap-1 sm:gap-1.5">
            <span className="text-sm sm:text-base font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-400">
              MAESTRO
            </span>
            <span className="hidden xs:inline-block text-[9px] uppercase tracking-widest font-extrabold text-amber-400/90 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">
              STUDIO
            </span>
          </div>

          {/* Dancing Mini Equalizer Bars */}
          <div className="hidden sm:flex items-end gap-0.5 h-3.5 pl-1 opacity-70">
            <span className="w-0.5 h-2 bg-amber-400 rounded-full animate-pulse" />
            <span className="w-0.5 h-3.5 bg-amber-300 rounded-full animate-pulse [animation-delay:150ms]" />
            <span className="w-0.5 h-1.5 bg-yellow-400 rounded-full animate-pulse [animation-delay:300ms]" />
            <span className="w-0.5 h-3 bg-amber-500 rounded-full animate-pulse [animation-delay:75ms]" />
          </div>
        </div>

        {/* ULTRA-COMPACT SEGMENTED MUSICAL CONTROLLER (Zero Scroll, Fits Everything) */}
        <nav className="flex items-center bg-slate-900/90 p-0.5 sm:p-1 rounded-xl border border-slate-800 shadow-inner overflow-hidden">
          {/* HOME */}
          <button
            onClick={() => onSelectView('home')}
            className={`px-1.5 sm:px-2.5 py-1 rounded-lg flex items-center gap-1 text-[11px] sm:text-xs font-bold transition-all ${
              currentView === 'home'
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
            title="Schermata Principale"
          >
            <Home className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">Home</span>
          </button>

          {/* PIANOFORTE */}
          <button
            onClick={() => {
              onInitAudio();
              onSelectView('piano');
            }}
            className={`px-2 sm:px-3 py-1 rounded-lg flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold transition-all ${
              currentView === 'piano'
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
            title="Pianoforte a coda 88 tasti interattivo con note a cascata"
          >
            <Piano className="w-3.5 h-3.5 shrink-0" />
            <span>Piano</span>
          </button>

          {/* SHEET COMPOSER (SPARTITI) */}
          <button
            onClick={() => {
              onInitAudio();
              onSelectView('sheet');
            }}
            className={`px-2 sm:px-3 py-1 rounded-lg flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold transition-all ${
              currentView === 'sheet'
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
            title="Compositore Spartiti con esportazione MIDI e JSON"
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>Spartiti</span>
            <span className="hidden lg:inline text-[9px] bg-slate-950/40 px-1 rounded text-amber-200">
              MIDI
            </span>
          </button>

          {/* JAM BAND */}
          <button
            onClick={() => {
              onInitAudio();
              onSelectView('jam');
            }}
            className={`px-2 sm:px-2.5 py-1 rounded-lg flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold transition-all ${
              currentView === 'jam'
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
            title="Jam Band con batteria, basso e sezioni ritmiche"
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>Jam</span>
          </button>
        </nav>

        {/* AUDIO & CONSOLE STATUS */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Quick Volume Slider */}
          <div className="hidden xs:flex items-center gap-1 sm:gap-1.5 bg-slate-900/90 px-2 py-1 rounded-xl border border-slate-800">
            {volume <= -25 ? (
              <VolumeX className="w-3 h-3 text-red-400 shrink-0" />
            ) : (
              <Volume2 className="w-3 h-3 text-amber-400 shrink-0" />
            )}
            <input
              type="range"
              min="-30"
              max="6"
              step="1"
              value={volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="w-12 sm:w-16 h-1 accent-amber-500 bg-slate-700 rounded cursor-pointer"
              title="Volume Principale"
            />
          </div>

          {/* Hi-Fi Audio Status Indicator */}
          {!isAudioActive ? (
            <button
              onClick={onInitAudio}
              className="px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shadow-sm shadow-amber-400/20 active:scale-95 animate-pulse flex items-center gap-1"
              title="Clicca per attivare l'audio"
            >
              <Music className="w-3 h-3" />
              <span>Attiva Audio</span>
            </button>
          ) : (
            <div
              className="flex items-center gap-1 px-2 py-1 text-[9px] sm:text-[10px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 rounded-lg whitespace-nowrap"
              title="Audio Hi-Fi attivo e pronto"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="hidden sm:inline">HI-FI</span>
              <span>44.1k</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
