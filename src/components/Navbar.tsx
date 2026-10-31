import React from 'react';
import { ViewMode, StudioTheme } from '../types';
import { Piano, BookOpen, Layers, Volume2, VolumeX, Home, Music, Users, ShieldCheck, Key, User, Disc, Timer, Palette } from 'lucide-react';
import { getThemeClasses } from '../utils/themeHelper';
import { midiEngine } from '../utils/midiEngine';
import { APP_VERSION } from '../utils/versionInfo';

interface NavbarProps {
  currentView: ViewMode | 'home';
  onSelectView: (view: ViewMode | 'home') => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  isAudioActive: boolean;
  onInitAudio: () => void;
  username: string;
  onOpenIdentityModal: () => void;
  onOpenMetronome?: () => void;
  studioTheme: StudioTheme;
  onThemeChange: (theme: StudioTheme) => void;
  onOpenScalesModal: () => void;
  onOpenVersionModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  volume,
  onVolumeChange,
  isAudioActive,
  onInitAudio,
  username,
  onOpenIdentityModal,
  onOpenMetronome,
  studioTheme,
  onThemeChange,
  onOpenScalesModal,
  onOpenVersionModal,
}) => {
  const theme = getThemeClasses(studioTheme);

  return (
    <header className={`relative w-full ${theme.navBg} backdrop-blur-md border-b select-none z-30 shrink-0`}>
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
          title="Return to Home"
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
              VIRTUKEYS
            </span>
            <span className="hidden xs:inline-block text-[9px] uppercase tracking-widest font-extrabold text-amber-400/90 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">
              STUDIO
            </span>
            {onOpenVersionModal && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenVersionModal();
                }}
                className="hidden md:inline-flex items-center gap-1 text-[9px] font-mono font-bold text-slate-500 hover:text-amber-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 px-1.5 py-0.2 rounded transition-colors cursor-pointer ml-1"
                title="Versione Studio: v1.0.157 - Clicca per dettagli aggiornamento"
              >
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                <span>v{APP_VERSION}</span>
              </button>
            )}
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
            title="Main Screen"
          >
            <Home className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">Home</span>
          </button>

          {/* PIANO */}
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
            title="Interactive 88-key grand piano with falling notes waterfall"
          >
            <Piano className="w-3.5 h-3.5 shrink-0" />
            <span>Piano</span>
          </button>

          {/* SHEET MUSIC COMPOSER */}
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
            title="Sheet Music Composer with MIDI & JSON export"
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>Sheet Music</span>
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
            title="Jam Band with drums, bass & rhythm sections"
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>Jam</span>
          </button>

          {/* SOCIAL & CHALLENGES */}
          <button
            onClick={() => {
              onInitAudio();
              onSelectView('social');
            }}
            className={`px-2 sm:px-2.5 py-1 rounded-lg flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold transition-all ${
              currentView === 'social'
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
            title="Masterclass, Battles, Quiz & Virtual Piano Bar"
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>Social</span>
          </button>

          {/* RECORDINGS MANAGER */}
          <button
            onClick={() => {
              onInitAudio();
              onSelectView('recordings');
            }}
            className={`px-2 sm:px-2.5 py-1 rounded-lg flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold transition-all ${
              currentView === 'recordings'
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
            title="Recordings Manager: Listen, rename, and delete saved tracks"
          >
            <Disc className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span>Recordings</span>
          </button>
        </nav>

        {/* SCALES PRACTICE, METRONOME & THEME SELECTOR */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Scales & Warmup Hub Button */}
          <button
            onClick={() => {
              onInitAudio();
              onOpenScalesModal();
            }}
            className="hidden sm:flex items-center gap-1 px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-[10px] sm:text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Scales & Warmup Gym (Hanon, 12 Keys, Arpeggios)"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Scales</span>
          </button>

          {/* Theme Selector Pills (Responsive) */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-xl gap-0.5">
            <button
              onClick={() => onThemeChange('midnight')}
              className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                studioTheme === 'midnight' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Midnight Slate Theme"
            >
              <span className="sm:hidden">🌙</span>
              <span className="hidden sm:inline">🌙 Slate</span>
            </button>
            <button
              onClick={() => onThemeChange('mahogany')}
              className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                studioTheme === 'mahogany' ? 'bg-amber-600 text-amber-100 shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Classic Mahogany Wood Theme"
            >
              <span className="sm:hidden">🪵</span>
              <span className="hidden sm:inline">🪵 Wood</span>
            </button>
            <button
              onClick={() => onThemeChange('neon')}
              className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                studioTheme === 'neon' ? 'bg-fuchsia-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Cyber Neon / Arcade Theme"
            >
              <span className="sm:hidden">⚡</span>
              <span className="hidden sm:inline">⚡ Neon</span>
            </button>
          </div>

          {/* Quick Metronome Button */}
          {onOpenMetronome && (
            <button
              onClick={() => {
                onInitAudio();
                onOpenMetronome();
              }}
              className="flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-300 rounded-xl text-[10px] sm:text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Open Metronome & Practice Tools"
            >
              <Timer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden xs:inline">Metronome</span>
            </button>
          )}

          <button
            onClick={onOpenIdentityModal}
            className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-[10px] sm:text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Protected account on this device. Click to view Transfer Code or switch device."
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate max-w-[80px] sm:max-w-[110px]">{username || 'Pianist'}</span>
            <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1 rounded uppercase">🔒</span>
          </button>

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
              title="Master Volume"
            />
          </div>

          {/* Hi-Fi Audio Status Indicator */}
          {!isAudioActive ? (
            <button
              onClick={onInitAudio}
              className="px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shadow-sm shadow-amber-400/20 active:scale-95 animate-pulse flex items-center gap-1"
              title="Click to enable audio"
            >
              <Music className="w-3 h-3" />
              <span>Enable Audio</span>
            </button>
          ) : (
            <div
              className="flex items-center gap-1 px-2 py-1 text-[9px] sm:text-[10px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 rounded-lg whitespace-nowrap"
              title="Hi-Fi Audio active and ready"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="hidden sm:inline">HI-FI</span>
              <span>44.1k</span>
            </div>
          )}

          {/* USB/Bluetooth MIDI Status Badge */}
          {(() => {
            const [midiStatus, setMidiStatus] = React.useState(() => midiEngine.getStatus());
            React.useEffect(() => {
              const unsubscribe = midiEngine.subscribe((st) => setMidiStatus(st));
              return unsubscribe;
            }, []);
            return (
              <div
                onClick={() => midiEngine.init()}
                className={`hidden md:flex items-center gap-1 px-2 py-1 text-[9px] sm:text-[10px] font-bold rounded-lg whitespace-nowrap border cursor-pointer transition-all ${
                  midiStatus.isConnected
                    ? 'text-emerald-400 bg-emerald-950/50 border-emerald-500/30 hover:bg-emerald-900/60'
                    : 'text-amber-300 bg-amber-950/40 border-amber-500/30 hover:bg-amber-900/50'
                }`}
                title={midiStatus.isConnected ? `MIDI Keyboard Connected: ${midiStatus.deviceNames.join(', ')}` : 'No MIDI keyboard detected. Connect via USB-OTG or Bluetooth MIDI and click to activate.'}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${midiStatus.isConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                <span>🎹 MIDI: {midiStatus.isConnected ? (midiStatus.deviceNames[0] || 'Connected') : 'Disconnected'}</span>
              </div>
            );
          })()}
        </div>
      </div>
    </header>
  );
};
