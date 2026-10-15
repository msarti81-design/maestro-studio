import React from 'react';
import { ViewMode } from '../types';
import { Piano, BookOpen, Radio, ArrowRight, Music } from 'lucide-react';

interface HomeViewProps {
  onSelectView: (view: ViewMode) => void;
  onInitAudio: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onSelectView, onInitAudio }) => {
  const handleOpenMode = (view: ViewMode) => {
    onInitAudio();
    onSelectView(view);
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6 flex flex-col justify-center min-h-[calc(100vh-6rem)]">
      {/* Sleek Hero Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
          <Music className="w-3.5 h-3.5" />
          <span>Virtual Piano & Music Studio</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-500 drop-shadow-sm">
          MAESTRO STUDIO
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto">
          Suona il pianoforte con note a cascata, componi i tuoi spartiti o suona insieme alla band virtuale.
        </p>
      </div>

      {/* Compact 3-Column Studio Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Play Piano Card */}
        <div
          onClick={() => handleOpenMode('piano')}
          className="group relative bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/60 p-5 rounded-2xl cursor-pointer transition-all hover:shadow-xl hover:shadow-amber-500/10 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Piano className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                Pianoforte & Impara
              </h3>
              <p className="text-slate-400 text-xs mt-1 leading-snug">
                Tastiera con glissando, note a cascata dall&apos;alto, modalit&agrave; impara e sfida tra amici.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs mt-4 group-hover:translate-x-1 transition-transform">
            <span>Apri Pianoforte</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Sheet Composer Card */}
        <div
          onClick={() => handleOpenMode('sheet')}
          className="group relative bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/60 p-5 rounded-2xl cursor-pointer transition-all hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                Sheet Composer
              </h3>
              <p className="text-slate-400 text-xs mt-1 leading-snug">
                Crea e modifica spartiti musicali, sequenze di melodie e linee di basso interattive.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs mt-4 group-hover:translate-x-1 transition-transform">
            <span>Componi Spartito</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Jam Band Studio Card */}
        <div
          onClick={() => handleOpenMode('jam')}
          className="group relative bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/60 p-5 rounded-2xl cursor-pointer transition-all hover:shadow-xl hover:shadow-emerald-500/10 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                Jam Band Studio
              </h3>
              <p className="text-slate-400 text-xs mt-1 leading-snug">
                Suona insieme a una rhythm section con basso, batteria, chitarra e pianoforte.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs mt-4 group-hover:translate-x-1 transition-transform">
            <span>Inizia Jam Session</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
