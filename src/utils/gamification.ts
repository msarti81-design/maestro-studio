// Gamification Engine: XP, Levels, Duolingo-style Daily Streaks, and Achievements
// Highly optimized with in-memory state & debounced localStorage persistence to guarantee 0ms overhead during glissando

export interface UserGamificationState {
  xp: number;
  level: number;
  levelTitle: string;
  nextLevelXp: number;
  currentStreak: number;
  bestStreak: number;
  lastPlayedDate: string; // YYYY-MM-DD
  songsCompleted: number;
  totalNotesHit: number;
  unlockedBadges: string[];
}

const LEVEL_THRESHOLDS = [
  { level: 1, title: 'Beginner 🎵', minXp: 0, nextXp: 250 },
  { level: 2, title: 'Apprentice 🎹', minXp: 250, nextXp: 750 },
  { level: 3, title: 'Musician 🎼', minXp: 750, nextXp: 1800 },
  { level: 4, title: 'Virtuoso 🌟', minXp: 1800, nextXp: 3500 },
  { level: 5, title: 'Piano Maestro 👑', minXp: 3500, nextXp: 7000 },
  { level: 6, title: 'Living Legend 🏆', minXp: 7000, nextXp: 99999 },
];

export const AVAILABLE_BADGES = [
  { id: 'first_note', title: 'First Note', desc: 'You played your first note', icon: '🎵' },
  { id: 'first_song', title: 'First Piece', desc: 'You completed your first sheet', icon: '🎉' },
  { id: 'streak_3', title: 'Iron Consistency', desc: '3 consecutive days of piano', icon: '🔥' },
  { id: 'streak_7', title: 'Maestro Week', desc: '7 consecutive days of piano', icon: '⚡' },
  { id: 'combo_10', title: 'Fast Hands', desc: 'You reached a 10-note combo', icon: '✨' },
  { id: 'hundred_notes', title: 'Musical Century', desc: '100 notes successfully played', icon: '🎯' },
];

const STORAGE_KEY = 'maestro_gamification_state_v1';

let cachedState: UserGamificationState | null = null;
let saveDebounceTimer: any = null;

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function loadGamificationState(): UserGamificationState {
  if (cachedState) return cachedState;

  if (typeof window === 'undefined') {
    const initial = {
      xp: 0,
      level: 1,
      levelTitle: 'Beginner 🎵',
      nextLevelXp: 250,
      currentStreak: 0,
      bestStreak: 0,
      lastPlayedDate: '',
      songsCompleted: 0,
      totalNotesHit: 0,
      unlockedBadges: [],
    };
    cachedState = initial;
    return initial;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      cachedState = syncLevelAndStreak(state);
      return cachedState;
    }
  } catch (e) {}

  const initial: UserGamificationState = {
    xp: 0,
    level: 1,
    levelTitle: 'Beginner 🎵',
    nextLevelXp: 250,
    currentStreak: 0,
    bestStreak: 0,
    lastPlayedDate: '',
    songsCompleted: 0,
    totalNotesHit: 0,
    unlockedBadges: [],
  };
  cachedState = initial;
  saveGamificationStateImmediate(initial);
  return initial;
}

export function saveGamificationStateImmediate(state: UserGamificationState) {
  cachedState = state;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent('piano:gamificationupdate', { detail: state }));
    } catch (e) {}
  }
}

export function saveGamificationStateDebounced(state: UserGamificationState) {
  cachedState = state;
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    saveGamificationStateImmediate(state);
  }, 2500);
}

export function saveGamificationState(state: UserGamificationState) {
  saveGamificationStateDebounced(state);
}

function syncLevelAndStreak(state: UserGamificationState): UserGamificationState {
  const today = getTodayString();
  const yesterday = getYesterdayString();

  if (state.lastPlayedDate && state.lastPlayedDate !== today && state.lastPlayedDate !== yesterday) {
    state.currentStreak = 0;
  }

  let currentTier = LEVEL_THRESHOLDS[0];
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (state.xp >= LEVEL_THRESHOLDS[i].minXp) {
      currentTier = LEVEL_THRESHOLDS[i];
      break;
    }
  }

  state.level = currentTier.level;
  state.levelTitle = currentTier.title;
  state.nextLevelXp = currentTier.nextXp;

  return state;
}

export function recordNoteHitBonus(points: number = 5): UserGamificationState {
  const state = loadGamificationState();
  const today = getTodayString();
  const yesterday = getYesterdayString();

  if (state.lastPlayedDate !== today) {
    if (state.lastPlayedDate === yesterday) {
      state.currentStreak += 1;
    } else {
      state.currentStreak = 1;
    }
    state.lastPlayedDate = today;
    state.bestStreak = Math.max(state.bestStreak, state.currentStreak);
  }

  state.xp += points;
  state.totalNotesHit += 1;

  if (state.totalNotesHit >= 1 && !state.unlockedBadges.includes('first_note')) {
    state.unlockedBadges.push('first_note');
  }
  if (state.totalNotesHit >= 100 && !state.unlockedBadges.includes('hundred_notes')) {
    state.unlockedBadges.push('hundred_notes');
  }
  if (state.currentStreak >= 3 && !state.unlockedBadges.includes('streak_3')) {
    state.unlockedBadges.push('streak_3');
  }
  if (state.currentStreak >= 7 && !state.unlockedBadges.includes('streak_7')) {
    state.unlockedBadges.push('streak_7');
  }

  const updated = syncLevelAndStreak(state);
  // Debounced save prevents synchronous disk I/O lockup on every single note hit!
  saveGamificationStateDebounced(updated);
  return updated;
}

export function recordSongCompletedBonus(finalScore: number, maxCombo: number): UserGamificationState {
  const state = loadGamificationState();
  const bonusXp = 100 + Math.round(finalScore / 10);

  state.xp += bonusXp;
  state.songsCompleted += 1;

  if (!state.unlockedBadges.includes('first_song')) {
    state.unlockedBadges.push('first_song');
  }
  if (maxCombo >= 10 && !state.unlockedBadges.includes('combo_10')) {
    state.unlockedBadges.push('combo_10');
  }

  const updated = syncLevelAndStreak(state);
  saveGamificationStateImmediate(updated);
  return updated;
}
