import { SheetSong } from '../types';

export const PRESET_SONGS: SheetSong[] = [
  {
    id: 'fur-elise',
    title: 'Für Elise (Intro)',
    description: 'Ludwig van Beethoven’s timeless masterpiece.',
    key: 'A minor',
    bpm: 120,
    timeSignature: '3/4',
    chords: ['Am', 'E7', 'Am', 'Dm', 'Am', 'E7', 'Am', 'Am'],
    melody: [
      { note: 'E5', duration: '8n', time: 0 },
      { note: 'D#5', duration: '8n', time: 0.5 },
      { note: 'E5', duration: '8n', time: 1 },
      { note: 'D#5', duration: '8n', time: 1.5 },
      { note: 'E5', duration: '8n', time: 2 },
      { note: 'B4', duration: '8n', time: 2.5 },
      { note: 'D5', duration: '8n', time: 3 },
      { note: 'C5', duration: '8n', time: 3.5 },
      { note: 'A4', duration: '4n', time: 4 },
      { note: 'C4', duration: '8n', time: 5 },
      { note: 'E4', duration: '8n', time: 5.5 },
      { note: 'A4', duration: '8n', time: 6 },
      { note: 'B4', duration: '4n', time: 7 },
    ],
    bassline: [
      { note: 'A2', duration: '2n', time: 0 },
      { note: 'E2', duration: '2n', time: 2 },
      { note: 'A2', duration: '2n', time: 4 },
      { note: 'E2', duration: '2n', time: 6 },
    ]
  },
  {
    id: 'canon-in-d',
    title: 'Canon in D',
    description: 'Johann Pachelbel’s harmonious baroque progression.',
    key: 'D major',
    bpm: 100,
    timeSignature: '4/4',
    chords: ['D', 'A', 'Bm', 'F#m', 'G', 'D', 'G', 'A'],
    melody: [
      { note: 'F#5', duration: '4n', time: 0 },
      { note: 'E5', duration: '4n', time: 1 },
      { note: 'D5', duration: '4n', time: 2 },
      { note: 'C#5', duration: '4n', time: 3 },
      { note: 'B4', duration: '4n', time: 4 },
      { note: 'A4', duration: '4n', time: 5 },
      { note: 'B4', duration: '4n', time: 6 },
      { note: 'C#5', duration: '4n', time: 7 },
    ],
    bassline: [
      { note: 'D3', duration: '2n', time: 0 },
      { note: 'A2', duration: '2n', time: 2 },
      { note: 'B2', duration: '2n', time: 4 },
      { note: 'F#2', duration: '2n', time: 6 },
    ]
  },
  {
    id: 'jazz-blues',
    title: 'Midnight Jazz Blues',
    description: 'Smooth 12-bar jazz groove with walking bass and warm piano chords.',
    key: 'C major',
    bpm: 110,
    timeSignature: '4/4',
    chords: ['C7', 'F7', 'C7', 'G7', 'F7', 'C7'],
    melody: [
      { note: 'C4', duration: '4n', time: 0 },
      { note: 'E4', duration: '4n', time: 1 },
      { note: 'G4', duration: '4n', time: 2 },
      { note: 'Bb4', duration: '4n', time: 3 },
      { note: 'C5', duration: '2n', time: 4 },
      { note: 'G4', duration: '2n', time: 6 },
    ],
    bassline: [
      { note: 'C2', duration: '4n', time: 0 },
      { note: 'E2', duration: '4n', time: 1 },
      { note: 'G2', duration: '4n', time: 2 },
      { note: 'Bb2', duration: '4n', time: 3 },
      { note: 'F2', duration: '4n', time: 4 },
      { note: 'A2', duration: '4n', time: 5 },
      { note: 'C3', duration: '4n', time: 6 },
      { note: 'G2', duration: '4n', time: 7 },
    ]
  },
  {
    id: 'pop-anthem',
    title: 'Starlight Pop Anthem',
    description: 'Upbeat modern pop progression with driving beat and synth bass.',
    key: 'G major',
    bpm: 126,
    timeSignature: '4/4',
    chords: ['G', 'D', 'Em', 'C'],
    melody: [
      { note: 'G4', duration: '8n', time: 0 },
      { note: 'B4', duration: '8n', time: 0.5 },
      { note: 'D5', duration: '4n', time: 1 },
      { note: 'B4', duration: '4n', time: 2 },
      { note: 'A4', duration: '2n', time: 4 },
    ],
    bassline: [
      { note: 'G2', duration: '2n', time: 0 },
      { note: 'D2', duration: '2n', time: 2 },
      { note: 'E2', duration: '2n', time: 4 },
      { note: 'C2', duration: '2n', time: 6 },
    ]
  }
];
