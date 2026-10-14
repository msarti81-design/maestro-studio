import React from 'react';
import { ViewMode } from '../types';
import { Music, Piano, BookOpen, Layers, Sparkles, Volume2 } from 'lucide-react';

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
    <header className="flex items-center justify-between gap-8 px-6 py-4 bg-slate-900 border-b border-slate-800 text-slate-100 select-none">
      {/* Zone 1: Brand Wordmark */}
      <div 
        onClick={() => onSelectView('piano')}
        className="flex items-center gap-2.5 cursor-pointer shrink-0"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
          <Music className="w-5 h-5" />
        </div>
        <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
          Maestro Studio
        </span>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => { onInitAudio(); onSelectView('piano'); }}
          className={`flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
            currentView === 'piano' ? 'text-amber-400 font-semibold' : 'hover:text-slate-200'
          }`}
        >
          <Piano className="w-4 h-4" />
          Piano Keyboard
        </button>
        <button
          onClick={() => { onInitAudio(); onSelectView('sheet'); }}
          className={`flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
            currentView === 'sheet' ? 'text-amber-400 font-semibold' : 'hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Sheet Composer
        </button>
        <button
          onClick={() => { onInitAudio(); onSelectView('jam'); }}
          className={`flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
            currentView === 'jam' ? 'text-amber-400 font-semibold' : 'hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Jam Band Studio
        </button>
        <button
          onClick={() => { onInitAudio(); onSelectView('ai'); }}
          className={`flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
            currentView === 'ai' ? 'text-amber-400 font-semibold' : 'hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          AI Songwriter
        </button>
      </nav>

      {/* Zone 3: Primary Action / Audio status */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
          <Volume2 className="w-4 h-4 text-slate-400" />
          <input
            type="range"
            min="-30"
            max="6"
            step="1"
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-20 accent-amber-500 cursor-pointer"
            title="Master Volume"
          />
        </div>

        {!isAudioActive ? (
          <button
            onClick={onInitAudio}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap shadow-md shadow-amber-400/20"
          >
            Enable Audio
          </button>
        ) : (
          <div className="px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 rounded-lg whitespace-nowrap">
            Studio Active
          </div>
        )}
      </div>
    </header>
  );
};
