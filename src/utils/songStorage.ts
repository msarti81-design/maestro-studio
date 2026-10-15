import { InteractiveSong, SheetSong } from '../types';
import { DEFAULT_INTERACTIVE_SONGS } from '../data/interactiveSongs';

const USERNAME_KEY = 'maestro_username';
const LOCAL_SONGS_KEY = 'maestro_local_interactive_songs';
const PUBLISHED_SONGS_KEY = 'maestro_community_songs';

export const getUsername = (): string => {
  if (typeof window === 'undefined') return 'Maestro';
  const saved = localStorage.getItem(USERNAME_KEY);
  if (saved && saved.trim()) return saved.trim();
  const randomId = Math.floor(100 + Math.random() * 900);
  const defaultName = `Pianista_${randomId}`;
  localStorage.setItem(USERNAME_KEY, defaultName);
  return defaultName;
};

export const setUsername = (name: string): string => {
  const clean = name.trim() || 'Maestro';
  if (typeof window !== 'undefined') {
    localStorage.setItem(USERNAME_KEY, clean);
  }
  return clean;
};

export const getLocalSongs = (): InteractiveSong[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_SONGS_KEY);
    if (!raw) return [];
    const parsed: InteractiveSong[] = JSON.parse(raw);
    const seen = new Set<string>();
    const unique: InteractiveSong[] = [];
    for (const s of parsed) {
      if (s && s.id && !seen.has(s.id)) {
        seen.add(s.id);
        unique.push(s);
      }
    }
    return unique;
  } catch (e) {
    console.error('Failed to parse local songs', e);
    return [];
  }
};

export const saveLocalSong = (song: InteractiveSong): void => {
  if (typeof window === 'undefined') return;
  const current = getLocalSongs();
  const index = current.findIndex(s => s.id === song.id);
  let updated: InteractiveSong[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = song;
  } else {
    updated = [song, ...current];
  }
  localStorage.setItem(LOCAL_SONGS_KEY, JSON.stringify(updated));
};

export const deleteLocalSong = (id: string): void => {
  if (typeof window === 'undefined') return;
  const current = getLocalSongs();
  const updated = current.filter(s => s.id !== id);
  localStorage.setItem(LOCAL_SONGS_KEY, JSON.stringify(updated));
};

export const getPublishedSongs = (): InteractiveSong[] => {
  if (typeof window === 'undefined') return DEFAULT_INTERACTIVE_SONGS;
  try {
    const raw = localStorage.getItem(PUBLISHED_SONGS_KEY);
    const parsed: InteractiveSong[] = raw ? JSON.parse(raw) : [];

    const seen = new Set<string>();
    const unique: InteractiveSong[] = [];

    // First add parsed community/user published songs
    for (const s of parsed) {
      if (s && s.id && !seen.has(s.id)) {
        seen.add(s.id);
        unique.push(s);
      }
    }

    // Then ensure default songs exist without duplicating
    for (const def of DEFAULT_INTERACTIVE_SONGS) {
      if (def && def.id && !seen.has(def.id)) {
        seen.add(def.id);
        unique.push(def);
      }
    }

    return unique;
  } catch (e) {
    console.error('Failed to load published songs', e);
    return DEFAULT_INTERACTIVE_SONGS;
  }
};

export const publishSong = (song: InteractiveSong): void => {
  if (typeof window === 'undefined') return;
  const publishedList = getPublishedSongs();
  const publishedSong: InteractiveSong = {
    ...song,
    isPublished: true,
    author: song.author || getUsername(),
    createdAt: song.createdAt || new Date().toISOString().split('T')[0],
  };

  const existingIdx = publishedList.findIndex(s => s.id === publishedSong.id);
  let updated: InteractiveSong[];
  if (existingIdx >= 0) {
    updated = [...publishedList];
    updated[existingIdx] = publishedSong;
  } else {
    updated = [publishedSong, ...publishedList];
  }

  localStorage.setItem(PUBLISHED_SONGS_KEY, JSON.stringify(updated));
  // Also save/update locally as published
  saveLocalSong(publishedSong);
};

export const getAllPlayableSongs = (): { local: InteractiveSong[]; published: InteractiveSong[] } => {
  return {
    local: getLocalSongs(),
    published: getPublishedSongs(),
  };
};

// Sheet Composer Persistence
const SHEET_SONGS_STORAGE_KEY = 'maestro_custom_sheet_songs';

export const getSavedSheetSongs = (): SheetSong[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SHEET_SONGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: SheetSong[] = JSON.parse(raw);
    const seen = new Set<string>();
    const unique: SheetSong[] = [];
    for (const s of parsed) {
      if (s && s.id && !seen.has(s.id)) {
        seen.add(s.id);
        unique.push(s);
      }
    }
    return unique;
  } catch (e) {
    console.error('Failed to parse saved sheet songs', e);
    return [];
  }
};

export const saveCustomSheetSong = (song: SheetSong): void => {
  if (typeof window === 'undefined') return;
  try {
    const current = getSavedSheetSongs();
    const idx = current.findIndex(s => s.id === song.id);
    let updated: SheetSong[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = song;
    } else {
      updated = [song, ...current];
    }
    localStorage.setItem(SHEET_SONGS_STORAGE_KEY, JSON.stringify(updated));

    // Also auto-sync as playable Interactive Song for Piano mode!
    const interactive = convertSheetSongToInteractiveSong(song);
    saveLocalSong(interactive);
  } catch (e) {
    console.error('Failed to save sheet song', e);
  }
};

export const deleteCustomSheetSong = (id: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const current = getSavedSheetSongs();
    const updated = current.filter(s => s.id !== id);
    localStorage.setItem(SHEET_SONGS_STORAGE_KEY, JSON.stringify(updated));
    deleteLocalSong(`sheet_${id}`);
  } catch (e) {
    console.error('Failed to delete sheet song', e);
  }
};

export const convertSheetSongToInteractiveSong = (sheetSong: SheetSong): InteractiveSong => {
  const bpm = sheetSong.bpm || 100;
  const beatSec = 60 / bpm;

  const parseDurSec = (dur: string): number => {
    switch (dur) {
      case '16n': return beatSec * 0.25;
      case '8n': return beatSec * 0.5;
      case '4n': return beatSec * 1.0;
      case '2n': return beatSec * 2.0;
      case '1m': return beatSec * 4.0;
      default: return beatSec * 0.5;
    }
  };

  const interactiveNotes = sheetSong.melody.map(m => ({
    note: m.note,
    time: Math.round(m.time * beatSec * 100) / 100,
    duration: Math.round(parseDurSec(m.duration) * 100) / 100,
  }));

  return {
    id: `sheet_${sheetSong.id}`,
    title: sheetSong.title || 'Spartito Personalizzato',
    author: getUsername(),
    bpm: sheetSong.bpm || 100,
    difficulty: sheetSong.melody.length > 20 ? 'medio' : 'facile',
    notes: interactiveNotes,
    isPublished: false,
    createdAt: new Date().toISOString().split('T')[0],
  };
};
