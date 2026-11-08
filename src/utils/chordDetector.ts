// Real-time Chord Recognition Engine

const NOTE_TO_SEMITONE: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11
};

const SEMITONE_TO_NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface IdentifiedChord {
  name: string;
  symbol: string;
  root: string;
  quality: string;
}

export function identifyChord(notes: string[]): IdentifiedChord | null {
  if (!notes || notes.length === 0) return null;

  const semitones = new Set<number>();
  let rootNoteName = 'C';

  for (const n of notes) {
    const match = n.match(/^([A-G][#b]?)(-?\d+)$/);
    if (match) {
      const noteName = match[1];
      if (NOTE_TO_SEMITONE[noteName] !== undefined) {
        semitones.add(NOTE_TO_SEMITONE[noteName]);
      }
    }
  }

  if (semitones.size === 0) return null;

  const semiArray = Array.from(semitones).sort((a, b) => a - b);
  const rootSemi = semiArray[0];
  rootNoteName = SEMITONE_TO_NOTE[rootSemi];

  const intervals = semiArray.map(s => (s - rootSemi + 12) % 12).sort((a, b) => a - b);
  const intervalKey = intervals.join(',');

  const dict: Record<string, { symbol: string; quality: string }> = {
    '0,4,7': { symbol: '', quality: 'Maggiore' },
    '0,3,7': { symbol: 'm', quality: 'Minore' },
    '0,3,6': { symbol: 'dim', quality: 'Diminuito' },
    '0,4,8': { symbol: 'aug', quality: 'Aumentato' },
    '0,4,7,10': { symbol: '7', quality: 'Settima' },
    '0,4,7,11': { symbol: 'maj7', quality: 'Settima Maggiore' },
    '0,3,7,10': { symbol: 'm7', quality: 'Minore Settima' },
    '0,3,6,10': { symbol: 'm7b5', quality: 'Semidiminuito' },
    '0,5,7': { symbol: 'sus4', quality: 'Sospeso 4' },
    '0,2,7': { symbol: 'sus2', quality: 'Sospeso 2' },
  };

  const found = dict[intervalKey];
  if (found) {
    return {
      name: `${rootNoteName} ${found.quality}`,
      symbol: `${rootNoteName}${found.symbol}`,
      root: rootNoteName,
      quality: found.quality
    };
  }

  if (semiArray.length === 2) {
    const diff = (semiArray[1] - semiArray[0] + 12) % 12;
    if (diff === 7) return { name: `${rootNoteName} Quinta (Power Chord)`, symbol: `${rootNoteName}5`, root: rootNoteName, quality: 'Power Chord' };
  }

  return {
    name: `${rootNoteName} (Accordo)`,
    symbol: `${rootNoteName}*`,
    root: rootNoteName,
    quality: 'Personalizzato'
  };
}
