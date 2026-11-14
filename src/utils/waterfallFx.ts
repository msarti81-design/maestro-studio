import { StudioTheme } from '../types';

export type WaterfallFxMode =
  | 'all'
  | 'bounce_balls'
  | 'elastic_strings'
  | 'combo_reactor'
  | 'overload_detonator'
  | 'pinball_arena'
  | 'gravity_slingshot'
  | 'crystal_mosaic'
  | 'auto_morph'
  | 'ribbon_dancers'
  | 'pendulum_orbits'
  | 'domino_shockwave'
  | 'fireworks'
  | 'aurora'
  | 'lightning'
  | 'fire'
  | 'vortex'
  | 'gold_rain'
  | 'matrix'
  | 'meteor'
  | 'crystal'
  | 'wave'
  | 'stars'
  | 'off';

export interface WaterfallFxMeta {
  id: WaterfallFxMode;
  icon: string;
  label: string;
  shortLabel: string;
  desc: string;
  category: 'kinetic' | 'stage' | 'clean';
}

export const WATERFALL_FX_ITEMS: WaterfallFxMeta[] = [
  // Kinetic Physics & Evolution Modes (Replaces falling bars — ideal for Shorts & Reels!)
  {
    id: 'bounce_balls',
    icon: '🏀',
    label: '🏀 Bounce Balls',
    shortLabel: '🏀 Bounce',
    desc: 'Rhythmic 3D glowing spheres hopping key-to-key',
    category: 'kinetic',
  },
  {
    id: 'elastic_strings',
    icon: '🪢',
    label: '🪢 Neon Elastics',
    shortLabel: '🪢 Elastics',
    desc: 'Plucked multicolor elastic bands vibrating on every hit',
    category: 'kinetic',
  },
  {
    id: 'combo_reactor',
    icon: '⚡',
    label: '⚡ Combo Reactor',
    shortLabel: '⚡ Reactor',
    desc: 'Evolves LVL 1 → ULTRA with laser wings & rings as your combo climbs!',
    category: 'kinetic',
  },
  {
    id: 'overload_detonator',
    icon: '💣',
    label: '💣 Overload Detonator',
    shortLabel: '💣 Overload',
    desc: 'Charges 0% → 100%, shakes screen & progressively cracks keys into a smoking crater!',
    category: 'kinetic',
  },
  {
    id: 'pinball_arena',
    icon: '🎱',
    label: '🎱 Laser Pinball Arena',
    shortLabel: '🎱 Pinball',
    desc: 'Note orbs ricochet off glowing arcade bumpers before hitting the keys!',
    category: 'kinetic',
  },
  {
    id: 'gravity_slingshot',
    icon: '🕳️',
    label: '🕳️ Gravity Slingshot',
    shortLabel: '🕳️ Vortex',
    desc: 'Central black hole orbits note comets before slinging them onto keys!',
    category: 'kinetic',
  },
  {
    id: 'crystal_mosaic',
    icon: '❄️',
    label: '❄️ Crystal Mosaic',
    shortLabel: '❄️ Mosaic',
    desc: 'Builds a glowing symmetric kaleidoscope sculpture note by note!',
    category: 'kinetic',
  },
  {
    id: 'auto_morph',
    icon: '🎲',
    label: '🎲 Auto-Morph Twist',
    shortLabel: '🎲 Auto-Morph',
    desc: 'Surprise plot-twist mode: switches kinetic styles automatically every few bars!',
    category: 'kinetic',
  },
  {
    id: 'ribbon_dancers',
    icon: '🎀',
    label: '🎀 Silk Ribbons',
    shortLabel: '🎀 Ribbons',
    desc: 'Flowing liquid neon waves & chromatic trails',
    category: 'kinetic',
  },
  {
    id: 'pendulum_orbits',
    icon: '🪐',
    label: '🪐 Pendulum Orbits',
    shortLabel: '🪐 Pendulums',
    desc: 'Harmonic swinging pendulums & orbital laser tethers',
    category: 'kinetic',
  },
  {
    id: 'domino_shockwave',
    icon: '🌠',
    label: '🌠 Domino Laser Arcs',
    shortLabel: '🌠 Domino',
    desc: 'Chain-reaction plasma leaps & shockwave pucks',
    category: 'kinetic',
  },

  // Full Stage & Particle FX (With crystal falling bars)
  {
    id: 'all',
    icon: '👑',
    label: '👑 Ultra Mix',
    shortLabel: '👑 Ultra Mix',
    desc: 'All stage effects active together!',
    category: 'stage',
  },
  {
    id: 'fireworks',
    icon: '🎆',
    label: '🎆 Fireworks',
    shortLabel: '🎆 Fireworks',
    desc: '360° pyrotechnic rocket bursts',
    category: 'stage',
  },
  {
    id: 'aurora',
    icon: '🌈',
    label: '🌈 Aurora Laser',
    shortLabel: '🌈 Laser',
    desc: 'Northern lights & vertical laser beams',
    category: 'stage',
  },
  {
    id: 'lightning',
    icon: '⚡',
    label: '⚡ Tesla Sparks',
    shortLabel: '⚡ Lightning',
    desc: 'High-voltage branched electric arcs',
    category: 'stage',
  },
  {
    id: 'fire',
    icon: '🔥',
    label: '🔥 Lava Blaze',
    shortLabel: '🔥 Lava',
    desc: 'Plasma fire horizon & glowing embers',
    category: 'stage',
  },
  {
    id: 'vortex',
    icon: '🌀',
    label: '🌀 3D Portal',
    shortLabel: '🌀 Portal',
    desc: 'Warp galaxy rings & lightning',
    category: 'stage',
  },
  {
    id: 'gold_rain',
    icon: '🎵',
    label: '🎵 24K Gold Notes',
    shortLabel: '🎵 Gold Notes',
    desc: 'Floating golden ♪ ♫ 𝄞 symbols',
    category: 'stage',
  },
  {
    id: 'matrix',
    icon: '🟢',
    label: '🟢 Cyber Matrix',
    shortLabel: '🟢 Matrix',
    desc: 'Digital code rain & green lasers',
    category: 'stage',
  },
  {
    id: 'meteor',
    icon: '☄️',
    label: '☄️ Meteors',
    shortLabel: '☄️ Meteors',
    desc: 'Shooting stars & fiery impact trails',
    category: 'stage',
  },
  {
    id: 'crystal',
    icon: '💎',
    label: '💎 Crystals',
    shortLabel: '💎 Crystals',
    desc: 'Rotating geometric prism shards',
    category: 'stage',
  },
  {
    id: 'wave',
    icon: '🌊',
    label: '🌊 Audio Waves',
    shortLabel: '🌊 Waves',
    desc: 'Symphonic beat equalizer & waveform',
    category: 'stage',
  },
  {
    id: 'stars',
    icon: '🌌',
    label: '🌌 Galaxy',
    shortLabel: '🌌 Stars',
    desc: 'Reactive deep-space starfield',
    category: 'stage',
  },
  {
    id: 'off',
    icon: '🚫',
    label: '🚫 None',
    shortLabel: '🚫 FX Off',
    desc: 'Clean falling notes only',
    category: 'clean',
  },
];

export const KINETIC_FX_MODES: WaterfallFxMode[] = [
  'bounce_balls',
  'elastic_strings',
  'combo_reactor',
  'overload_detonator',
  'pinball_arena',
  'gravity_slingshot',
  'crystal_mosaic',
  'auto_morph',
  'ribbon_dancers',
  'pendulum_orbits',
  'domino_shockwave',
];

export function isKineticFxMode(mode: WaterfallFxMode): boolean {
  return KINETIC_FX_MODES.includes(mode);
}

const FX_STORAGE_KEY = 'virtukeys_waterfall_fx';

export function loadWaterfallFx(): WaterfallFxMode {
  try {
    const saved = localStorage.getItem(FX_STORAGE_KEY);
    if (saved && WATERFALL_FX_ITEMS.some((item) => item.id === saved)) {
      return saved as WaterfallFxMode;
    }
  } catch {
    // Ignore storage read errors
  }
  return 'all';
}

export function saveWaterfallFx(mode: WaterfallFxMode): void {
  try {
    localStorage.setItem(FX_STORAGE_KEY, mode);
  } catch {
    // Ignore storage write errors
  }
}

export function getWaterfallFxMeta(mode: WaterfallFxMode): WaterfallFxMeta {
  return (
    WATERFALL_FX_ITEMS.find((item) => item.id === mode) ||
    WATERFALL_FX_ITEMS.find((item) => item.id === 'all') ||
    WATERFALL_FX_ITEMS[0]
  );
}

export interface StudioThemeOption {
  id: StudioTheme;
  name: string;
  desc: string;
}

export const STUDIO_THEME_OPTIONS: StudioThemeOption[] = [
  { id: 'midnight', name: '🎹 Concert Ivory', desc: 'Ivory & Ebony Steinway' },
  { id: 'mahogany', name: '🪵 Vintage Wood', desc: 'Maple & Rosewood 3D' },
  { id: 'marble', name: '🏛️ Carrara Marble', desc: 'White Marble & Portoro' },
  { id: 'gold', name: '👑 Royal Gold & Pearl', desc: 'Mother of Pearl & 24k Gold' },
  { id: 'carbon', name: '🏎️ Titanium & Carbon', desc: 'Titanium & Carbon Fiber' },
  { id: 'neon', name: '⚡ Cyber Synth', desc: 'Smoked Glass & Laser' },
  { id: 'rainbow', name: '🌈 Pop Rainbow', desc: 'Pop Rainbow & Kawaii' },
  { id: 'animals', name: '🐾 Pet & Paws', desc: 'Cute Mascots & Paws' },
  { id: 'candy', name: '🍭 Sweet Pastel', desc: 'Pastel Candy & Sprinkles' },
  { id: 'emerald', name: '💎 Emerald Jade', desc: 'Imperial Jade & Malachite' },
  { id: 'ruby', name: '🔥 Magma Ruby', desc: 'Rose Quartz & Lava Ruby' },
  { id: 'sapphire', name: '❄️ Arctic Sapphire', desc: 'Ice Crystal & Sapphire' },
  { id: 'amethyst', name: '🔮 Cosmic Amethyst', desc: 'Aurora Opal & Amethyst' },
];
