export type ViewMode = 'piano' | 'sheet' | 'jam';
export type NoteNotationFormat = 'latin' | 'letter' | 'german' | 'numeric' | 'none';
export type SoundProfile = 'concert' | 'studio' | 'bright' | 'cathedral';

export interface NoteEvent {
  note: string; // e.g. "C4"
  duration: string; // "4n", "8n", etc.
  time: number; // beat or step index
}

export interface SheetSong {
  id: string;
  title: string;
  description: string;
  key: string;
  bpm: number;
  timeSignature: string;
  chords: string[];
  melody: NoteEvent[];
  bassline: NoteEvent[];
}

export type JamStyle = 'jazz' | 'rock' | 'pop' | 'lofi' | 'bossa' | 'blues';

export type InstrumentType = 'piano' | 'bass' | 'guitar' | 'drums' | 'strings' | 'synth';

export interface RecordedNote {
  note: string;
  time: number;
  duration: number;
}

export interface InteractiveSong {
  id: string;
  title: string;
  author: string;
  bpm: number;
  difficulty: 'facile' | 'medio' | 'difficile';
  notes: {
    note: string;
    time: number; // seconds
    duration: number; // seconds
  }[];
  isPublished?: boolean;
  createdAt?: string;
}

