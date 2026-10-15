import React from 'react';
import { ViewMode } from '../types';
import { Music, Piano, BookOpen, Layers, Volume2 } from 'lucide-react';

interface NavbarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
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
    <header className="flex items-center justify-between gap-6 px-4 sm:px-6 py-3 bg-slate-900 border-b border-slate-800 text-slate-100 select-none">
      {/* Zone 1: Brand Wordmark */}
      <div 
        onClick={() => onSelectView('piano')}
        className="flex items-center gap-2.5 cursor-pointer shrink-0"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20">
          <Music className="w-4 h-4" />
        </div>
        <span className="text-base font-black tracking-tight text-white whitespace-nowrap">
          MAESTRO STUDIO
        </span>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-400">
        <button
          onClick={() => { onInitAudio(); onSelectView('piano'); }}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
            currentView === 'piano' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Piano className="w-3.5 h-3.5" />
          Pianoforte
        </button>
        <button
          onClick={() => { onInitAudio(); onSelectView('sheet'); }}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
            currentView === 'sheet' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Sheet Composer
        </button>
        <button
          onClick={() => { onInitAudio(); onSelectView('jam'); }}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
            currentView === 'jam' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Jam Band Studio
        </button>
      </nav>

      {/* Zone 3: Primary Action / Audio status */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
          <Volume2 className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="range"
            min="-30"
            max="6"
            step="1"
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-16 accent-amber-500 cursor-pointer"
            title="Master Volume"
          />
        </div>

        {!isAudioActive ? (
          <button
            onClick={onInitAudio}
            className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap shadow-md shadow-amber-400/20"
          >
            Attiva Audio
          </button>
        ) : (
          <div className="px-2.5 py-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 rounded-lg whitespace-nowrap">
            Audio Attivo
          </div>
        )}
      </div>
    </header>
  );
};
