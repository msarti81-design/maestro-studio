import { InteractiveSong } from '../types';

export interface PlaybackState {
  currentTime: number;
  isPlaying: boolean;
  activeSong: InteractiveSong | null;
  waitingTargetNote: string | null;
  waitingNoteIndex: number | null;
  waitingFinger: number | null;
  waitingTip: string | null;
  playMode: 'learn' | 'arcade' | 'fingering' | 'demo';
}

export const songPlaybackState: PlaybackState = {
  currentTime: 0,
  isPlaying: false,
  activeSong: null,
  waitingTargetNote: null,
  waitingNoteIndex: null,
  waitingFinger: null,
  waitingTip: null,
  playMode: 'arcade',
};
