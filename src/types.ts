export type ViewMode = 'piano' | 'sheet' | 'jam' | 'social';
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

export type SocialRoomMode = 
  | 'masterclass' // Maestro e Allievo in-app
  | 'relay'       // Staffetta Musicale (Pass the Melody)
  | 'duet'        // Pianoforte a Quattro Mani (Hand division: Right melody, Left bass)
  | 'battle'      // Duelli Musicali / Piano Battle
  | 'guess'       // Indovina la Canzone (Name That Tune)
  | 'pianobar'    // Piano Bar & Sala d'Ascolto Virtuale
  | 'postcards';  // Cartoline e Cartoline Musicali (Audio-Lettere)

export interface MusicalPostcard {
  id: string;
  sender: string;
  recipient: string;
  title: string;
  message: string;
  melody: NoteEvent[];
  bpm: number;
  createdAt: string;
}

export interface SocialSessionResults {
  mode: SocialRoomMode;
  roomId: string;
  songTitle?: string;
  score: number;
  comboMax: number;
  accuracy: number;
  notesPlayed: number;
  winner?: string;
  penalties?: number;
  durationSeconds: number;
}

export interface ActiveSocialSession {
  mode: SocialRoomMode;
  roomId: string;
  userRole: 'maestro' | 'allievo' | 'spettatore' | 'giocatore';
  song?: SheetSong;
  status: 'configuring' | 'active' | 'completed';
  lastResults?: SocialSessionResults;
}
