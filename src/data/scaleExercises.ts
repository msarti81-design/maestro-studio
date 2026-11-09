export interface ScaleExercise {
  id: string;
  name: string;
  category: 'Hanon (Independence)' | 'Major Scales' | 'Minor Scales' | 'Arpeggios' | 'Blues & Pentatonic';
  description: string;
  notes: string[];
  fingering: number[]; // 1 = Thumb, 2 = Index, 3 = Middle, 4 = Ring, 5 = Pinky
  difficulty: 'Easy' | 'Intermediate' | 'Advanced';
  hand?: 'right' | 'left';
  tempoBpm: number;
  keySignature: string;
  tips?: string[];
}

export const FINGER_NAMES: Record<number, { name: string; short: string; icon: string }> = {
  1: { name: 'Thumb', short: '1', icon: '👍' },
  2: { name: 'Index', short: '2', icon: '☝️' },
  3: { name: 'Middle', short: '3', icon: '🖐️' },
  4: { name: 'Ring', short: '4', icon: '💍' },
  5: { name: 'Pinky', short: '5', icon: '🤙' },
};

export const SCALE_EXERCISES: ScaleExercise[] = [
  {
    id: 'scale_c_major',
    name: 'C Major Scale',
    category: 'Major Scales',
    description: 'The primary scale with no sharps or flats. Perfect for learning the essential thumb-under technique beneath the 3rd finger on F.',
    notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'B4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4'],
    fingering: [1, 2, 3, 1, 2, 3, 4, 5, 4, 3, 2, 1, 3, 2, 1],
    difficulty: 'Easy',
    hand: 'right',
    tempoBpm: 80,
    keySignature: 'C Major / C (No accidentals)',
    tips: [
      'Keep your hand relaxed and curved as if holding an apple.',
      'When transitioning from E4 to F4, smoothly slide your thumb (1) under your middle finger (3).',
      'On the way down, cross your middle finger (3) over your thumb (1) to return to E4.',
    ],
  },
  {
    id: 'hanon_1',
    name: 'Hanon No. 1 (Fingers 1-5 Agility)',
    category: 'Hanon (Independence)',
    description: 'The classic virtuous pianist exercise: loosens all 5 fingers, builds independence and touch equality.',
    notes: ['C4', 'E4', 'F4', 'G4', 'A4', 'G4', 'F4', 'E4', 'D4', 'F4', 'G4', 'A4', 'B4', 'A4', 'G4', 'F4', 'E4'],
    fingering: [1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2, 1],
    difficulty: 'Easy',
    hand: 'right',
    tempoBpm: 84,
    keySignature: 'C Major / C',
    tips: [
      'Keep your wrists aligned and steady: only finger joints should move.',
      'Play with an articulate touch and equal intensity for each note.',
    ],
  },
  {
    id: 'scale_g_major',
    name: 'G Major Scale (1 ♯)',
    category: 'Major Scales',
    description: 'Scale with F sharp (F♯). Great for accustoming fingers to black keys while maintaining standard fingering.',
    notes: ['G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F#4', 'G4', 'F#4', 'E4', 'D4', 'C4', 'B3', 'A3', 'G3'],
    fingering: [1, 2, 3, 1, 2, 3, 4, 5, 4, 3, 2, 1, 3, 2, 1],
    difficulty: 'Easy',
    hand: 'right',
    tempoBpm: 80,
    keySignature: 'G Major / G (1 Sharp: F♯)',
    tips: [
      'Finger 4 (ring) comfortably plays the black key F♯4 before G with the pinky (5).',
      'Thumb tuck on C4 after B3.',
    ],
  },
  {
    id: 'scale_f_major',
    name: 'F Major Scale (1 ♭)',
    category: 'Major Scales',
    description: 'Fundamental scale with B flat (B♭). Uses finger 4 on B♭ instead of the thumb!',
    notes: ['F3', 'G3', 'A3', 'Bb3', 'C4', 'D4', 'E4', 'F4', 'E4', 'D4', 'C4', 'Bb3', 'A3', 'G3', 'F3'],
    fingering: [1, 2, 3, 4, 1, 2, 3, 4, 3, 2, 1, 4, 3, 2, 1],
    difficulty: 'Intermediate',
    hand: 'right',
    tempoBpm: 75,
    keySignature: 'F Major / F (1 Flat: B♭)',
    tips: [
      'Caution: do not pass your thumb under B♭! Use finger 4 on B♭, then pass your thumb under on C4.',
    ],
  },
  {
    id: 'scale_d_major',
    name: 'D Major Scale (2 ♯)',
    category: 'Major Scales',
    description: 'Brilliant scale with two sharps: F sharp and C sharp. Excellent for ergonomic positioning on white and black keys.',
    notes: ['D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C#5', 'D5', 'C#5', 'B4', 'A4', 'G4', 'F#4', 'E4', 'D4'],
    fingering: [1, 2, 3, 1, 2, 3, 4, 5, 4, 3, 2, 1, 3, 2, 1],
    difficulty: 'Intermediate',
    hand: 'right',
    tempoBpm: 80,
    keySignature: 'D Major / D (2 Sharps: F♯, C♯)',
    tips: [
      'Your middle finger (3) plays F♯4, then your thumb (1) passes under to G4.',
      'Your ring finger (4) plays C♯5.',
    ],
  },
  {
    id: 'scale_a_minor',
    name: 'A Natural Minor Scale',
    category: 'Minor Scales',
    description: 'The relative minor of C Major: all on white keys, but with a meditative and melancholic character.',
    notes: ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4', 'B3', 'A3'],
    fingering: [1, 2, 3, 1, 2, 3, 4, 5, 4, 3, 2, 1, 3, 2, 1],
    difficulty: 'Easy',
    hand: 'right',
    tempoBpm: 75,
    keySignature: 'A Minor / Am (No accidentals)',
    tips: [
      'Pass your thumb (1) under the 3rd finger on D4.',
    ],
  },
  {
    id: 'scale_e_minor',
    name: 'E Harmonic Minor Scale',
    category: 'Minor Scales',
    description: 'Minor scale with raised 7th degree (D♯): creates the expressive augmented second interval typical of classical music.',
    notes: ['E4', 'F#4', 'G4', 'A4', 'B4', 'C5', 'D#5', 'E5', 'D#5', 'C5', 'B4', 'A4', 'G4', 'F#4', 'E4'],
    fingering: [1, 2, 3, 1, 2, 3, 4, 5, 4, 3, 2, 1, 3, 2, 1],
    difficulty: 'Intermediate',
    hand: 'right',
    tempoBpm: 75,
    keySignature: 'E Minor / Em (F♯, D♯)',
    tips: [
      'Pay attention to D♯5 played with the 4th finger before E5 with the pinky.',
    ],
  },
  {
    id: 'arpeggio_c_major',
    name: 'C Major Arpeggio (C Major Triad)',
    category: 'Arpeggios',
    description: 'Fundamental exercise for extension and fluidity across the core chord tones C - E - G - C.',
    notes: ['C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'C4'],
    fingering: [1, 2, 3, 5, 3, 2, 1],
    difficulty: 'Easy',
    hand: 'right',
    tempoBpm: 70,
    keySignature: 'C Major Chord (C)',
    tips: [
      'Keep your wrist supple as your hand opens slightly to reach C5 with the pinky (5).',
    ],
  },
  {
    id: 'arpeggio_a_minor',
    name: 'A Minor Arpeggio (A Minor Triad)',
    category: 'Arpeggios',
    description: 'Arpeggio on the A minor triad (A - C - E - A). Great expressiveness and pianistic elegance.',
    notes: ['A3', 'C4', 'E4', 'A4', 'E4', 'C4', 'A3'],
    fingering: [1, 2, 3, 5, 3, 2, 1],
    difficulty: 'Easy',
    hand: 'right',
    tempoBpm: 70,
    keySignature: 'A Minor Chord (Am)',
    tips: [
      'Keep your fingers elastic and let the triad ring out with clarity.',
    ],
  },
  {
    id: 'scale_c_blues',
    name: 'C Blues Scale',
    category: 'Blues & Pentatonic',
    description: 'The legendary Blue Note (F♯/G♭) for authentic swing, jazz, and blues improvisation.',
    notes: ['C4', 'Eb4', 'F4', 'F#4', 'G4', 'Bb4', 'C5', 'Bb4', 'G4', 'F#4', 'F4', 'Eb4', 'C4'],
    fingering: [1, 2, 3, 4, 1, 3, 4, 3, 1, 4, 3, 2, 1],
    difficulty: 'Advanced',
    hand: 'right',
    tempoBpm: 80,
    keySignature: 'C Blues (E♭, F♯, B♭)',
    tips: [
      'Great for blues feeling: F♯ is the passing blue note.',
    ],
  },
];
