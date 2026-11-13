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
  {
    id: 'emerald',
    icon: '💎',
    shortName: 'Emerald',
    name: '💎 Emerald Jade',
    desc: 'Giada Imperiale & Malachite',
  },
  {
    id: 'ruby',
    icon: '🔥',
    shortName: 'Ruby',
    name: '🔥 Magma Ruby',
    desc: 'Quarzo Rosa & Rubino Lavico',
  },
  {
    id: 'sapphire',
    icon: '❄️',
    shortName: 'Sapphire',
    name: '❄️ Arctic Sapphire',
    desc: 'Cristallo Ghiaccio & Zaffiro',
  },
  {
    id: 'amethyst',
    icon: '🔮',
    shortName: 'Amethyst',
    name: '🔮 Cosmic Amethyst',
    desc: 'Opale Aurora & Ametista',
  },
  {
    id: 'rainbow',
    icon: '🌈',
    shortName: 'Rainbow',
    name: '🌈 Cartoon Rainbow (Kids)',
    desc: 'Arcobaleno & Faccine Buffe',
  },
  {
    id: 'animals',
    icon: '🐶',
    shortName: 'Cuccioli',
    name: '🐶 Cuccioli Cartoon (Kids)',
    desc: 'Animaletti Simpatici & Zampette',
  },
  {
    id: 'candy',
    icon: '🍭',
    shortName: 'Candy',
    name: '🍭 Candy & Dolci (Kids)',
    desc: 'Gelato, Cioccolato & Codette',
  },
];

export function isValidStudioTheme(val: unknown): val is StudioTheme {
  return (
    val === 'midnight' ||
    val === 'mahogany' ||
    val === 'marble' ||
    val === 'gold' ||
    val === 'carbon' ||
    val === 'neon' ||
    val === 'emerald' ||
    val === 'ruby' ||
    val === 'sapphire' ||
    val === 'amethyst' ||
    val === 'rainbow' ||
    val === 'animals' ||
    val === 'candy'
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
    case 'emerald':
      return {
        appBg: 'bg-[#031710] text-emerald-50',
        navBg: 'bg-[#062419]/95 border-emerald-500/40 text-emerald-50',
        cardBg: 'bg-[#072b1e] border-emerald-500/30 hover:border-emerald-400 text-emerald-50',
        modalBg: 'bg-[#062419] border-emerald-500/50 text-emerald-50',
        accentBtn: 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black',
        accentText: 'text-emerald-400',
        border: 'border-emerald-700/40',
        badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
      };
    case 'ruby':
      return {
        appBg: 'bg-[#1a050a] text-rose-50',
        navBg: 'bg-[#290810]/95 border-rose-500/40 text-rose-50',
        cardBg: 'bg-[#330a14] border-rose-500/30 hover:border-rose-400 text-rose-50',
        modalBg: 'bg-[#290810] border-rose-500/50 text-rose-50',
        accentBtn: 'bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-black',
        accentText: 'text-rose-400',
        border: 'border-rose-700/40',
        badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
      };
    case 'sapphire':
      return {
        appBg: 'bg-[#030d22] text-sky-50',
        navBg: 'bg-[#071636]/95 border-cyan-400/40 text-sky-50',
        cardBg: 'bg-[#0a1e47] border-cyan-500/30 hover:border-cyan-400 text-sky-50',
        modalBg: 'bg-[#071636] border-cyan-500/50 text-sky-50',
        accentBtn: 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black',
        accentText: 'text-cyan-400',
        border: 'border-cyan-700/40',
        badge: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
      };
    case 'amethyst':
      return {
        appBg: 'bg-[#120524] text-purple-50',
        navBg: 'bg-[#1c0938]/95 border-purple-500/40 text-purple-50',
        cardBg: 'bg-[#240c47] border-purple-500/30 hover:border-purple-400 text-purple-50',
        modalBg: 'bg-[#1c0938] border-purple-500/50 text-purple-50',
        accentBtn: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-black',
        accentText: 'text-purple-400',
        border: 'border-purple-700/40',
        badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
      };
    case 'rainbow':
      return {
        appBg: 'bg-[#0f172a] text-yellow-50',
        navBg: 'bg-[#1e1b4b]/95 border-yellow-400/50 text-yellow-50',
        cardBg: 'bg-[#1e293b] border-pink-400/40 hover:border-yellow-400 text-yellow-50',
        modalBg: 'bg-[#1e1b4b] border-yellow-400/60 text-yellow-50',
        accentBtn: 'bg-gradient-to-r from-pink-500 via-amber-400 to-cyan-400 hover:opacity-95 text-slate-950 font-black',
        accentText: 'text-yellow-300',
        border: 'border-pink-500/40',
        badge: 'bg-yellow-400/20 text-yellow-200 border border-yellow-400/50',
      };
    case 'animals':
      return {
        appBg: 'bg-[#0c1f17] text-emerald-50',
        navBg: 'bg-[#132e22]/95 border-amber-400/50 text-emerald-50',
        cardBg: 'bg-[#163829] border-emerald-400/40 hover:border-amber-400 text-emerald-50',
        modalBg: 'bg-[#132e22] border-amber-400/60 text-emerald-50',
        accentBtn: 'bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 font-black',
        accentText: 'text-amber-300',
        border: 'border-emerald-500/40',
        badge: 'bg-amber-400/20 text-amber-200 border border-amber-400/50',
      };
    case 'candy':
      return {
        appBg: 'bg-[#240a1d] text-pink-50',
        navBg: 'bg-[#360f2c]/95 border-pink-400/50 text-pink-50',
        cardBg: 'bg-[#421336] border-pink-400/40 hover:border-cyan-300 text-pink-50',
        modalBg: 'bg-[#360f2c] border-pink-400/60 text-pink-50',
        accentBtn: 'bg-gradient-to-r from-pink-400 to-cyan-300 hover:from-pink-300 hover:to-cyan-200 text-slate-950 font-black',
        accentText: 'text-pink-300',
        border: 'border-pink-400/40',
        badge: 'bg-pink-400/20 text-pink-200 border border-pink-400/50',
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
