import React from 'react';
import { ViewMode } from '../types';
import { Piano, BookOpen, Layers, Sparkles, ArrowRight, Music, Radio } from 'lucide-react';

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
    <div className="max-w-6xl mx-auto py-12 px-6 space-y-12">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
          <Music className="w-4 h-4" />
          Virtual Piano & Music Production Studio
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          Welcome to Maestro Studio
        </h1>
        <p className="text-slate-400 text-base sm:text-lg">
          Play realistic piano keys with comfortable spacing, compose your own sheet music, jam with a virtual band, or let Gemini AI arrange your next song.
        </p>
      </div>

      {/* Mode Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Play Piano Card */}
        <div
          onClick={() => handleOpenMode('piano')}
          className="group relative bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 hover:border-amber-500/50 p-8 rounded-3xl cursor-pointer transition-all hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
              <Piano className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors">
              Pianoforte & Modalità Impara
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Tastiera orizzontale con <strong className="text-amber-300">glissando continuo</strong> (scorri il dito per fare scale), <strong className="text-amber-300">note che scendono dall'alto</strong> sulla linea dei tasti per imparare a suonare anche senza esperienza, e creazione di spartiti condivisibili in locale o nella community!
            </p>
          </div>
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm mt-8 group-hover:translate-x-1 transition-transform">
            <span>Apri Pianoforte & Spartiti</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Sheet Composer Card */}
        <div
          onClick={() => handleOpenMode('sheet')}
          className="group relative bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 hover:border-amber-500/50 p-8 rounded-3xl cursor-pointer transition-all hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors">
              Sheet Composer
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Create, edit, and play custom musical scores, melody sequences, and basslines with classic presets and JSON export.
            </p>
          </div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm mt-8 group-hover:translate-x-1 transition-transform">
            <span>Open Sheet Editor</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Jam Band Studio Card */}
        <div
          onClick={() => handleOpenMode('jam')}
          className="group relative bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 hover:border-amber-500/50 p-8 rounded-3xl cursor-pointer transition-all hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
              <Radio className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors">
              Jam Band Studio
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Jam along with a virtual rhythm section including bass, guitar, drums, and piano across jazz, rock, lofi, and pop styles.
            </p>
          </div>
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mt-8 group-hover:translate-x-1 transition-transform">
            <span>Start Jam Session</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* AI Songwriter Card */}
        <div
          onClick={() => handleOpenMode('ai')}
          className="group relative bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 hover:border-amber-500/50 p-8 rounded-3xl cursor-pointer transition-all hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-white group-hover:text-purple-400 transition-colors">
              AI Songwriter
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Describe any musical idea in plain language and let Gemini AI compose custom chord progressions and melodies instantly.
            </p>
          </div>
          <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm mt-8 group-hover:translate-x-1 transition-transform">
            <span>Create with AI</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
