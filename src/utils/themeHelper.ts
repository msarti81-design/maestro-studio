import { StudioTheme } from '../types';

export interface StudioThemeOption {
  id: StudioTheme;
  icon: string;
  shortName: string;
  name: string;
  desc: string;
}

export const STUDIO_THEMES: StudioThemeOption[] = [
  {
    id: 'midnight',
    icon: '🎹',
    shortName: 'Ivory',
    name: '🎹 Concert Ivory',
    desc: 'Avorio & Ebano Steinway',
  },
  {
    id: 'mahogany',
    icon: '🪵',
    shortName: 'Wood',
    name: '🪵 Vintage Wood',
    desc: 'Acero & Palissandro 3D',
  },
  {
    id: 'marble',
    icon: '🏛️',
    shortName: 'Marble',
    name: '🏛️ Carrara Marble',
    desc: 'Marmo Bianco & Portoro',
  },
  {
    id: 'gold',
    icon: '👑',
    shortName: 'Gold',
    name: '👑 Royal Gold & Pearl',
    desc: 'Madreperla & Oro 24k',
  },
  {
    id: 'carbon',
    icon: '🏎️',
    shortName: 'Carbon',
    name: '🏎️ Titanium & Carbon',
    desc: 'Titanio & Fibra Carbonio',
  },
  {
    id: 'neon',
    icon: '⚡',
    shortName: 'Neon',
    name: '⚡ Cyber Synth',
    desc: 'Vetro Fumé & Laser',
  },
];

export function isValidStudioTheme(val: unknown): val is StudioTheme {
  return (
    val === 'midnight' ||
    val === 'mahogany' ||
    val === 'marble' ||
    val === 'gold' ||
    val === 'carbon' ||
    val === 'neon'
  );
}

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
    case 'marble':
      return {
        appBg: 'bg-stone-950 text-stone-100',
        navBg: 'bg-stone-900/95 border-amber-500/30 text-stone-100',
        cardBg: 'bg-stone-900 border-stone-700/80 hover:border-amber-400/60 text-stone-100',
        modalBg: 'bg-stone-900 border-amber-500/40 text-stone-100',
        accentBtn: 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-black',
        accentText: 'text-amber-300',
        border: 'border-stone-800',
        badge: 'bg-amber-500/15 text-amber-200 border border-amber-500/30',
      };
    case 'gold':
      return {
        appBg: 'bg-[#171206] text-amber-50',
        navBg: 'bg-[#211908]/95 border-yellow-500/40 text-amber-50',
        cardBg: 'bg-[#261d0a] border-yellow-600/40 hover:border-yellow-400 text-amber-50',
        modalBg: 'bg-[#211908] border-yellow-500/50 text-amber-50',
        accentBtn: 'bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 text-slate-950 font-black',
        accentText: 'text-yellow-400',
        border: 'border-yellow-700/40',
        badge: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
      };
    case 'carbon':
      return {
        appBg: 'bg-zinc-950 text-zinc-100',
        navBg: 'bg-zinc-900/95 border-sky-500/30 text-zinc-100',
        cardBg: 'bg-zinc-900 border-zinc-800 hover:border-sky-400/50 text-zinc-100',
        modalBg: 'bg-zinc-900 border-sky-500/40 text-zinc-100',
        accentBtn: 'bg-sky-500 hover:bg-sky-400 text-zinc-950 font-black',
        accentText: 'text-sky-400',
        border: 'border-zinc-800',
        badge: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
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
