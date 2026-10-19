export type NoteNotationFormat = 'latin' | 'letter' | 'german' | 'numeric' | 'none';

const LATIN_MAP: Record<string, string> = {
  'C': 'DO',
  'C#': 'DO#',
  'Db': 'REb',
  'D': 'RE',
  'D#': 'RE#',
  'Eb': 'MIb',
  'E': 'MI',
  'F': 'FA',
  'F#': 'FA#',
  'Gb': 'SOLb',
  'G': 'SOL',
  'G#': 'SOL#',
  'Ab': 'LAb',
  'A': 'LA',
  'A#': 'LA#',
  'Bb': 'SIb',
  'B': 'SI',
};

const GERMAN_MAP: Record<string, string> = {
  'C': 'C',
  'C#': 'C#',
  'Db': 'Db',
  'D': 'D',
  'D#': 'D#',
  'Eb': 'Eb',
  'E': 'E',
  'F': 'F',
  'F#': 'F#',
  'Gb': 'Gb',
  'G': 'G',
  'G#': 'G#',
  'Ab': 'Ab',
  'A': 'A',
  'A#': 'B',
  'Bb': 'B',
  'B': 'H',
};

const NUMERIC_MAP: Record<string, string> = {
  'C': '1',
  'C#': '1#',
  'Db': '1#',
  'D': '2',
  'D#': '2#',
  'Eb': '2#',
  'E': '3',
  'F': '4',
  'F#': '4#',
  'Gb': '4#',
  'G': '5',
  'G#': '5#',
  'Ab': '5#',
  'A': '6',
  'A#': '6#',
  'Bb': '6#',
  'B': '7',
};

export function formatNoteLabel(note: string, format: NoteNotationFormat = 'latin', includeOctave: boolean = true): string {
  if (format === 'none' || !note) return '';

  const match = note.match(/^([A-Ga-g][#b]?)(-?\d+)?$/);
  if (!match) return note;

  const pitch = match[1].toUpperCase();
  const octave = match[2] || '';

  let name = pitch;
  switch (format) {
    case 'latin':
      name = LATIN_MAP[pitch] || pitch;
      break;
    case 'german':
      name = GERMAN_MAP[pitch] || pitch;
      break;
    case 'numeric':
      name = NUMERIC_MAP[pitch] || pitch;
      break;
    case 'letter':
    default:
      name = pitch;
      break;
  }

  return includeOctave && octave !== '' ? `${name}${octave}` : name;
}
