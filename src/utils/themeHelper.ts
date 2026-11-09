import { StudioTheme } from '../types';

export function getThemeClasses(theme: StudioTheme) {
  switch (theme) {
    case 'mahogany':
      return {
        appBg: 'bg-[#281308] text-[#fbf8f0]',
        navBg: 'bg-[#35180c]/95 border-amber-600/40 text-[#fbf8f0]',
        cardBg: 'bg-[#3a1b0c] border-amber-600/30 hover:border-amber-500 text-[#fbf8f0]',
        modalBg: 'bg-[#35180c] border-amber-600/50 text-[#fbf8f0]',
        accentBtn: 'bg-amber-600 hover:bg-amber-500 text-[#281308] font-black',
        accentText: 'text-amber-400',
        border: 'border-amber-700/40',
        badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
      };
    case 'neon':
      return {
        appBg: 'bg-[#070314] text-cyan-100',
        navBg: 'bg-[#110626]/95 border-fuchsia-500/40 text-cyan-100',
        cardBg: 'bg-[#15092e] border-fuchsia-500/40 hover:border-cyan-400 text-cyan-100 shadow-[0_0_15px_rgba(217,70,239,0.15)]',
        modalBg: 'bg-[#120729] border-fuchsia-500/60 text-cyan-100',
        accentBtn: 'bg-gradient-to-r from-fuchsia-600 to-cyan-500 hover:from-fuchsia-500 hover:to-cyan-400 text-white font-black shadow-[0_0_15px_rgba(217,70,239,0.4)]',
        accentText: 'text-fuchsia-400',
        border: 'border-fuchsia-500/30',
        badge: 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40',
      };
    case 'midnight':
    default:
      return {
        appBg: 'bg-slate-950 text-slate-100',
        navBg: 'bg-slate-950/95 border-amber-500/20 text-slate-100',
        cardBg: 'bg-slate-900 border-slate-800 hover:border-amber-500/50 text-slate-100',
        modalBg: 'bg-slate-900 border-amber-500/40 text-slate-100',
        accentBtn: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black',
        accentText: 'text-amber-400',
        border: 'border-slate-800',
        badge: 'bg-amber-500/10 text-amber-300 border border-amber-500/30',
      };
  }
}
