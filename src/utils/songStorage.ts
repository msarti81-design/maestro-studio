import { InteractiveSong } from '../types';
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
    return JSON.parse(raw);
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
    if (!raw) {
      // Seed initial default community songs
      localStorage.setItem(PUBLISHED_SONGS_KEY, JSON.stringify(DEFAULT_INTERACTIVE_SONGS));
      return DEFAULT_INTERACTIVE_SONGS;
    }
    const parsed: InteractiveSong[] = JSON.parse(raw);
    // Ensure all default songs exist in the list
    const existingIds = new Set(parsed.map(s => s.id));
    const merged = [...parsed];
    for (const def of DEFAULT_INTERACTIVE_SONGS) {
      if (!existingIds.has(def.id)) {
        merged.push(def);
      }
    }
    return merged;
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
