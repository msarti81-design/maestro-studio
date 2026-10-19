import { InteractiveSong } from '../types';

export const BUILT_IN_SONGS: InteractiveSong[] = [
  {
    id: 'scale-c-major',
    title: 'C Major Scale (Tutorial)',
    author: 'KeyCraft Studio',
    bpm: 80,
    difficulty: 'easy',
    notes: [
      { note: 'C4', time: 1.0, duration: 0.8 },
      { note: 'D4', time: 2.0, duration: 0.8 },
      { note: 'E4', time: 3.0, duration: 0.8 },
      { note: 'F4', time: 4.0, duration: 0.8 },
      { note: 'G4', time: 5.0, duration: 0.8 },
      { note: 'A4', time: 6.0, duration: 0.8 },
      { note: 'B4', time: 7.0, duration: 0.8 },
      { note: 'C5', time: 8.0, duration: 1.5 },
      { note: 'B4', time: 10.0, duration: 0.8 },
      { note: 'A4', time: 11.0, duration: 0.8 },
      { note: 'G4', time: 12.0, duration: 0.8 },
      { note: 'F4', time: 13.0, duration: 0.8 },
      { note: 'E4', time: 14.0, duration: 0.8 },
      { note: 'D4', time: 15.0, duration: 0.8 },
      { note: 'C4', time: 16.0, duration: 1.5 },
    ],
    isPublished: true,
    createdAt: '2026-10-01'
  },
  {
    id: 'inno-alla-gioia',
    title: 'Inno alla Gioia (Ode to Joy)',
    author: 'L. van Beethoven',
    bpm: 105,
    difficulty: 'facile',
    notes: [
      { note: 'E4', time: 1.0, duration: 0.5 },
      { note: 'E4', time: 1.6, duration: 0.5 },
      { note: 'F4', time: 2.2, duration: 0.5 },
      { note: 'G4', time: 2.8, duration: 0.5 },
      { note: 'G4', time: 3.4, duration: 0.5 },
      { note: 'F4', time: 4.0, duration: 0.5 },
      { note: 'E4', time: 4.6, duration: 0.5 },
      { note: 'D4', time: 5.2, duration: 0.5 },
      { note: 'C4', time: 5.8, duration: 0.5 },
      { note: 'C4', time: 6.4, duration: 0.5 },
      { note: 'D4', time: 7.0, duration: 0.5 },
      { note: 'E4', time: 7.6, duration: 0.5 },
      { note: 'E4', time: 8.2, duration: 0.7 },
      { note: 'D4', time: 9.0, duration: 0.4 },
      { note: 'D4', time: 9.5, duration: 1.0 },

      { note: 'E4', time: 11.0, duration: 0.5 },
      { note: 'E4', time: 11.6, duration: 0.5 },
      { note: 'F4', time: 12.2, duration: 0.5 },
      { note: 'G4', time: 12.8, duration: 0.5 },
      { note: 'G4', time: 13.4, duration: 0.5 },
      { note: 'F4', time: 14.0, duration: 0.5 },
      { note: 'E4', time: 14.6, duration: 0.5 },
      { note: 'D4', time: 15.2, duration: 0.5 },
      { note: 'C4', time: 15.8, duration: 0.5 },
      { note: 'C4', time: 16.4, duration: 0.5 },
      { note: 'D4', time: 17.0, duration: 0.5 },
      { note: 'E4', time: 17.6, duration: 0.5 },
      { note: 'D4', time: 18.2, duration: 0.7 },
      { note: 'C4', time: 19.0, duration: 0.4 },
      { note: 'C4', time: 19.5, duration: 1.2 },
    ],
    isPublished: true,
    createdAt: '2026-10-02'
  },
  {
    id: 'per-elisa',
    title: 'Per Elisa (Für Elise)',
    author: 'L. van Beethoven',
    bpm: 120,
    difficulty: 'medio',
    notes: [
      { note: 'E4', time: 1.0, duration: 0.35 },
      { note: 'D#4', time: 1.4, duration: 0.35 },
      { note: 'E4', time: 1.8, duration: 0.35 },
      { note: 'D#4', time: 2.2, duration: 0.35 },
      { note: 'E4', time: 2.6, duration: 0.35 },
      { note: 'B3', time: 3.0, duration: 0.35 },
      { note: 'D4', time: 3.4, duration: 0.35 },
      { note: 'C4', time: 3.8, duration: 0.35 },
      { note: 'A3', time: 4.2, duration: 0.8 },

      { note: 'C3', time: 5.4, duration: 0.35 },
      { note: 'E3', time: 5.8, duration: 0.35 },
      { note: 'A3', time: 6.2, duration: 0.35 },
      { note: 'B3', time: 6.6, duration: 0.8 },

      { note: 'E3', time: 7.8, duration: 0.35 },
      { note: 'G#3', time: 8.2, duration: 0.35 },
      { note: 'B3', time: 8.6, duration: 0.35 },
      { note: 'C4', time: 9.0, duration: 0.8 },

      { note: 'E4', time: 10.2, duration: 0.35 },
      { note: 'D#4', time: 10.6, duration: 0.35 },
      { note: 'E4', time: 11.0, duration: 0.35 },
      { note: 'D#4', time: 11.4, duration: 0.35 },
      { note: 'E4', time: 11.8, duration: 0.35 },
      { note: 'B3', time: 12.2, duration: 0.35 },
      { note: 'D4', time: 12.6, duration: 0.35 },
      { note: 'C4', time: 13.0, duration: 0.35 },
      { note: 'A3', time: 13.4, duration: 1.2 },
    ],
    isPublished: true,
    createdAt: '2026-10-03'
  },
  {
    id: 'bella-ciao',
    title: 'Bella Ciao',
    author: 'Canto Popolare',
    bpm: 118,
    difficulty: 'medio',
    notes: [
      { note: 'E4', time: 1.0, duration: 0.4 },
      { note: 'A4', time: 1.5, duration: 0.4 },
      { note: 'B4', time: 2.0, duration: 0.4 },
      { note: 'C5', time: 2.5, duration: 0.8 },
      { note: 'A4', time: 3.5, duration: 0.8 },

      { note: 'E4', time: 4.8, duration: 0.4 },
      { note: 'A4', time: 5.3, duration: 0.4 },
      { note: 'B4', time: 5.8, duration: 0.4 },
      { note: 'C5', time: 6.3, duration: 0.8 },
      { note: 'A4', time: 7.3, duration: 0.8 },

      { note: 'E4', time: 8.6, duration: 0.4 },
      { note: 'A4', time: 9.1, duration: 0.4 },
      { note: 'B4', time: 9.6, duration: 0.4 },
      { note: 'C5', time: 10.1, duration: 0.4 },
      { note: 'B4', time: 10.6, duration: 0.4 },
      { note: 'A4', time: 11.1, duration: 0.4 },
      { note: 'C5', time: 11.6, duration: 0.4 },
      { note: 'B4', time: 12.1, duration: 0.4 },
      { note: 'A4', time: 12.6, duration: 0.4 },
      { note: 'E5', time: 13.1, duration: 1.5 },
    ],
    isPublished: true,
    createdAt: '2026-10-04'
  },
  {
    id: 'interstellar-theme',
    title: 'Interstellar Theme',
    author: 'Hans Zimmer',
    bpm: 96,
    difficulty: 'difficile',
    notes: [
      { note: 'A4', time: 1.0, duration: 0.4 },
      { note: 'E5', time: 1.5, duration: 0.4 },
      { note: 'A4', time: 2.0, duration: 0.4 },
      { note: 'E5', time: 2.5, duration: 0.4 },
      { note: 'B4', time: 3.0, duration: 0.4 },
      { note: 'E5', time: 3.5, duration: 0.4 },
      { note: 'B4', time: 4.0, duration: 0.4 },
      { note: 'E5', time: 4.5, duration: 0.4 },
      { note: 'C5', time: 5.0, duration: 0.4 },
      { note: 'E5', time: 5.5, duration: 0.4 },
      { note: 'C5', time: 6.0, duration: 0.4 },
      { note: 'E5', time: 6.5, duration: 0.4 },
      { note: 'D5', time: 7.0, duration: 0.4 },
      { note: 'E5', time: 7.5, duration: 0.4 },
      { note: 'D5', time: 8.0, duration: 0.4 },
      { note: 'E5', time: 8.5, duration: 0.4 },
    ],
    isPublished: true,
    createdAt: '2026-10-05'
  },
  {
    id: 'super-mario',
    title: 'Super Mario Bros Theme',
    author: 'Koji Kondo',
    bpm: 130,
    difficulty: 'medio',
    notes: [
      { note: 'E4', time: 0.8, duration: 0.25 },
      { note: 'E4', time: 1.15, duration: 0.25 },
      { note: 'E4', time: 1.6, duration: 0.25 },
      { note: 'C4', time: 1.95, duration: 0.25 },
      { note: 'E4', time: 2.3, duration: 0.25 },
      { note: 'G4', time: 2.8, duration: 0.5 },
      { note: 'G3', time: 3.5, duration: 0.5 },
      { note: 'C4', time: 4.4, duration: 0.4 },
      { note: 'G3', time: 5.0, duration: 0.4 },
      { note: 'E3', time: 5.6, duration: 0.4 },
      { note: 'A3', time: 6.2, duration: 0.4 },
      { note: 'B3', time: 6.7, duration: 0.4 },
      { note: 'A#3', time: 7.2, duration: 0.4 },
      { note: 'A3', time: 7.7, duration: 0.4 },
    ],
    isPublished: true,
    createdAt: '2026-10-06'
  }
];

// Helper to get all songs (Local + Community + Built-in)
export const getLocalSongs = (): InteractiveSong[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('maestro_local_songs');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load local songs:', e);
    return [];
  }
};

export const saveLocalSong = (song: InteractiveSong): void => {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalSongs();
    const existingIndex = current.findIndex(s => s.id === song.id);
    let updated: InteractiveSong[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = song;
    } else {
      updated = [song, ...current];
    }
    localStorage.setItem('maestro_local_songs', JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save local song:', e);
  }
};

export const deleteLocalSong = (songId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalSongs();
    const updated = current.filter(s => s.id !== songId);
    localStorage.setItem('maestro_local_songs', JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete local song:', e);
  }
};

export const getUsername = (): string => {
  if (typeof window === 'undefined') return 'Pianista';
  return localStorage.getItem('maestro_username') || 'Maestro' + Math.floor(100 + Math.random() * 900);
};

export const setUsername = (name: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('maestro_username', name.trim() || 'Pianista');
};
