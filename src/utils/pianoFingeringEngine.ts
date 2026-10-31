/**
 * Piano Fingering Engine (Motore Intelligente di Diteggiatura Pianistica)
 * 
 * Implementa le regole e i principi pedagogici standard della diteggiatura pianistica
 * (Algoritmo euristico a costo minimo basato sui modelli accademici di Parncutt, Hart e Balliauw):
 * 1. Posizione naturale a 5 dita (ampiezza standard di quinta/sesta).
 * 2. Direzione melodica: dita crescenti (1->2->3->4->5) in ascesa, decrescenti (5->4->3->2->1) in discesa.
 * 3. Passaggio del pollice (Thumb-under: 1 sotto il 3 o 4) per scale e corse melodiche in salita.
 * 4. Scavalcamento (Cross-over: 3 o 4 sopra l'1) per frasi melodiche in discesa.
 * 5. Preferenza tasti neri: le dita lunghe (2, 3, 4) sono favorite sui tasti neri rispetto a pollice (1) e mignolo (5).
 * 6. Rispetto assoluto della diteggiatura esplicita impostata dall'autore nello spartito.
 */

export interface NoteWithFinger {
  note: string;
  time?: number;
  duration?: number | string;
  finger?: number; // 1-5 optional override
}

export interface FingerInfo {
  number: number;
  name: string;
  englishName: string;
  shortName: string;
  color: string;
  accentBg: string;
  accentText: string;
  badgeBg: string;
  icon: string;
  description: string;
}

export const FINGER_METADATA: Record<number, FingerInfo> = {
  1: {
    number: 1,
    name: 'Thumb',
    englishName: 'Thumb',
    shortName: '1 Th',
    color: '#f59e0b', // amber-500
    accentBg: 'bg-amber-500',
    accentText: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
    icon: '👍',
    description: 'Rotation pivot for scales and jumps. Ideal for the lowest note in the right hand.',
  },
  2: {
    number: 2,
    name: 'Index',
    englishName: 'Index',
    shortName: '2 Ind',
    color: '#06b6d4', // cyan-500
    accentBg: 'bg-cyan-500',
    accentText: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300',
    icon: '☝️',
    description: 'Agile and extended finger. Excellent on both white and black keys.',
  },
  3: {
    number: 3,
    name: 'Middle',
    englishName: 'Middle',
    shortName: '3 Mid',
    color: '#10b981', // emerald-500
    accentBg: 'bg-emerald-500',
    accentText: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    icon: '🖐️',
    description: 'Longest finger of the hand, pivot for the thumb cross-under (1-2-3-1...).',
  },
  4: {
    number: 4,
    name: 'Ring',
    englishName: 'Ring',
    shortName: '4 Rng',
    color: '#a855f7', // purple-500
    accentBg: 'bg-purple-500',
    accentText: 'text-purple-400',
    badgeBg: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
    icon: '💍',
    description: 'Shares tendons with the middle finger. Requires a curved, relaxed posture.',
  },
  5: {
    number: 5,
    name: 'Pinky',
    englishName: 'Pinky',
    shortName: '5 Pnk',
    color: '#ec4899', // pink-500
    accentBg: 'bg-pink-500',
    accentText: 'text-pink-400',
    badgeBg: 'bg-pink-500/20 border-pink-500/40 text-pink-300',
    icon: '🤙',
    description: 'Hand extremity, natural for melody peak notes or octave bass notes.',
  },
};

/**
 * Converte una nota musicale (es. "C4", "F#3", "Bb5") in semitoni MIDI (C4 = 60).
 */
export function noteToMidiPitch(note: string): number {
  if (!note) return 60;
  const match = note.match(/^([A-G])([#b]?)(-?\d+)$/i);
  if (!match) return 60;

  const step = match[1].toUpperCase();
  const acc = match[2];
  const octave = parseInt(match[3], 10);

  const stepToSemitone: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };

  let semitone = stepToSemitone[step] || 0;
  if (acc === '#') semitone += 1;
  else if (acc === 'b') semitone -= 1;

  return (octave + 1) * 12 + semitone;
}

/**
 * Riconosce se una nota corrisponde a un tasto nero (diesis o bemolle).
 */
export function isBlackKey(note: string): boolean {
  if (!note) return false;
  return note.includes('#') || note.includes('b');
}

/**
 * Restituisce i dettagli e il nome italiano di un dito (1-5).
 */
export function getFingerInfo(finger: number): FingerInfo {
  return FINGER_METADATA[finger] || FINGER_METADATA[1];
}

/**
 * Matrice di ampiezza ideale (in semitoni) tra coppie di dita adiacenti o distanti per la mano destra.
 */
const NATURAL_SPAN: Record<string, { min: number; ideal: number; max: number }> = {
  '1-2': { min: 1, ideal: 2, max: 5 },
  '2-3': { min: 1, ideal: 2, max: 4 },
  '3-4': { min: 1, ideal: 1.5, max: 3 },
  '4-5': { min: 1, ideal: 1.5, max: 3 },
  '1-3': { min: 2, ideal: 4, max: 7 },
  '1-4': { min: 3, ideal: 5, max: 8 },
  '1-5': { min: 4, ideal: 7, max: 12 },
  '2-4': { min: 2, ideal: 3, max: 5 },
  '2-5': { min: 3, ideal: 5, max: 8 },
  '3-5': { min: 2, ideal: 3, max: 5 },
};

/**
 * Calcola il costo ergonomico di transizione tra il dito 'prevFinger' sulla nota 'prevPitch'
 * e il dito 'currFinger' sulla nota 'currPitch' per la mano destra.
 */
function calculateTransitionCost(
  prevFinger: number,
  currFinger: number,
  prevPitch: number,
  currPitch: number,
  isCurrBlack: boolean,
  isPrevBlack: boolean,
  hand: 'right' | 'left' = 'right'
): number {
  let cost = 0;
  const deltaPitch = currPitch - prevPitch;

  // Se invertiamo per mano sinistra, invertiamo la logica di pitch
  const effectiveDeltaPitch = hand === 'right' ? deltaPitch : -deltaPitch;

  // 1. STESSO PITCH (ripetizione nota)
  if (effectiveDeltaPitch === 0) {
    if (prevFinger === currFinger) return 0; // Stesso dito su stessa nota è comodissimo
    // Cambio dito su stessa nota (tecnica virtuosistica 3-2-1)
    return 10;
  }

  // 2. MOVIMENTO ASCENDENTE (effectiveDeltaPitch > 0)
  if (effectiveDeltaPitch > 0) {
    if (currFinger > prevFinger) {
      // Movimento naturale: dita crescenti in salita (1->2->3->4->5)
      const pairKey = `${prevFinger}-${currFinger}`;
      const span = NATURAL_SPAN[pairKey];
      if (span) {
        const diffFromIdeal = Math.abs(effectiveDeltaPitch - span.ideal);
        cost += diffFromIdeal * 4;
        if (effectiveDeltaPitch > span.max) {
          cost += (effectiveDeltaPitch - span.max) * 15; // Sovraestensione
        } else if (effectiveDeltaPitch < span.min) {
          cost += 20; // Dita troppo accavallate
        }
      } else {
        cost += 30;
      }
    } else if (currFinger === prevFinger) {
      // Salto con lo stesso dito verso l'alto (spostamento della mano)
      cost += Math.abs(effectiveDeltaPitch) * 8 + 25;
    } else {
      // Dito inferiore dopo dito superiore in ascesa: PASSAGGIO DEL POLLICE (Thumb-under)
      if (currFinger === 1 && (prevFinger === 3 || prevFinger === 4)) {
        // Regola d'oro del pianoforte: pollice sotto il medio o anulare!
        cost += 12;
        if (isCurrBlack) {
          // Pollice su tasto nero durante il passaggio è sconsigliato in pedagogia
          cost += 25;
        }
      } else if (currFinger === 1 && prevFinger === 2) {
        cost += 18;
      } else {
        // Passaggi anomali non-standard
        cost += 80;
      }
    }
  }

  // 3. MOVIMENTO DISCENDENTE (effectiveDeltaPitch < 0)
  if (effectiveDeltaPitch < 0) {
    const absDelta = Math.abs(effectiveDeltaPitch);
    if (currFinger < prevFinger) {
      // Movimento naturale: dita decrescenti in discesa (5->4->3->2->1)
      const pairKey = `${currFinger}-${prevFinger}`;
      const span = NATURAL_SPAN[pairKey];
      if (span) {
        const diffFromIdeal = Math.abs(absDelta - span.ideal);
        cost += diffFromIdeal * 4;
        if (absDelta > span.max) {
          cost += (absDelta - span.max) * 15;
        } else if (absDelta < span.min) {
          cost += 20;
        }
      } else {
        cost += 30;
      }
    } else if (currFinger === prevFinger) {
      cost += absDelta * 8 + 25;
    } else {
      // Dito superiore dopo dito inferiore in discesa: SCAVALCAMENTO (Cross-over)
      if (prevFinger === 1 && (currFinger === 3 || currFinger === 4)) {
        // Regola d'oro del pianoforte: medio o anulare scavalca il pollice!
        cost += 12;
      } else if (prevFinger === 1 && currFinger === 2) {
        cost += 16;
      } else {
        cost += 80;
      }
    }
  }

  // 4. PENALITÀ TASTI NERI
  // Pollice (1) e mignolo (5) sono corti: sui tasti neri subiscono una penalità ergonomica
  if (isCurrBlack) {
    if (currFinger === 1) cost += 18;
    else if (currFinger === 5) cost += 14;
    // Dita 2, 3, 4 adorano i tasti neri (zero penalità)
  }

  // 5. PENALITÀ ANULARE DEBOLE (Dito 4)
  if (currFinger === 4 && (currFinger - prevFinger > 1 || prevFinger - currFinger > 1)) {
    cost += 8;
  }

  return cost;
}

/**
 * Calcola la diteggiatura ottimale per un elenco di note musicali
 * utilizzando l'algoritmo di programmazione dinamica a costo minimo (Viterbi Heuristic).
 * Se una nota ha già `finger` esplicito impostato dall'autore, lo rispetta rigidamente.
 */
export function calculateFingeringForNotes(
  notes: NoteWithFinger[],
  hand: 'right' | 'left' = 'right'
): number[] {
  const n = notes.length;
  if (n === 0) return [];

  // Se c'è una sola nota
  if (n === 1) {
    if (notes[0].finger && notes[0].finger >= 1 && notes[0].finger <= 5) {
      return [notes[0].finger];
    }
    // Default ragionevole per singola nota (indice o pollice)
    return [isBlackKey(notes[0].note) ? 2 : 1];
  }

  const pitches = notes.map((item) => noteToMidiPitch(item.note));
  const blackKeys = notes.map((item) => isBlackKey(item.note));

  // dp[step][finger (1..5)] = minimum cost up to step with that finger
  const dp: number[][] = Array.from({ length: n }, () => Array(6).fill(Infinity));
  // parent[step][finger] = which finger it came from at the previous step
  const parent: number[][] = Array.from({ length: n }, () => Array(6).fill(0));

  // Initialize first step
  const firstExplicit = notes[0].finger;
  for (let f = 1; f <= 5; f++) {
    if (firstExplicit && firstExplicit >= 1 && firstExplicit <= 5) {
      if (f === firstExplicit) dp[0][f] = 0;
      else dp[0][f] = Infinity;
    } else {
      // Initial cost based on starting note and hand conformation
      let initCost = 0;
      if (blackKeys[0] && (f === 1 || f === 5)) initCost += 20;

      // If the first notes are ascending/descending, adjust initial finger preference
      if (n > 1) {
        const delta = pitches[1] - pitches[0];
        if (delta > 0 && f > 3) initCost += 25;
        if (delta < 0 && f < 3) initCost += 25;
      }

      dp[0][f] = initCost;
    }
  }

  // Programmazione dinamica forward
  for (let i = 1; i < n; i++) {
    const explicitFinger = notes[i].finger;
    const isCurrBlack = blackKeys[i];
    const isPrevBlack = blackKeys[i - 1];
    const currPitch = pitches[i];
    const prevPitch = pitches[i - 1];

    for (let currF = 1; currF <= 5; currF++) {
      if (explicitFinger && explicitFinger >= 1 && explicitFinger <= 5 && currF !== explicitFinger) {
        dp[i][currF] = Infinity;
        continue;
      }

      let bestPrevCost = Infinity;
      let bestPrevF = 1;

      for (let prevF = 1; prevF <= 5; prevF++) {
        if (dp[i - 1][prevF] === Infinity) continue;

        const transCost = calculateTransitionCost(
          prevF,
          currF,
          prevPitch,
          currPitch,
          isCurrBlack,
          isPrevBlack,
          hand
        );

        const total = dp[i - 1][prevF] + transCost;
        if (total < bestPrevCost) {
          bestPrevCost = total;
          bestPrevF = prevF;
        }
      }

      dp[i][currF] = bestPrevCost;
      parent[i][currF] = bestPrevF;
    }
  }

  // Backtracking del percorso ottimale
  let bestFinalFinger = 1;
  let minFinalCost = Infinity;

  for (let f = 1; f <= 5; f++) {
    if (dp[n - 1][f] < minFinalCost) {
      minFinalCost = dp[n - 1][f];
      bestFinalFinger = f;
    }
  }

  const result: number[] = new Array(n);
  let curFinger = bestFinalFinger;

  for (let i = n - 1; i >= 0; i--) {
    result[i] = curFinger;
    curFinger = parent[i][curFinger] || 1;
  }

  return result;
}

/**
 * Rileva automaticamente se una melodia è adatta alla Mano Sinistra o alla Mano Destra
 * analizzando il registro e l'altezza media delle note (C4 = 60).
 * - Sotto il DO centrale (C4 / 60, ottave 1, 2, 3 tipiche della chiave di basso): Mano Sinistra
 * - Dal DO centrale in su (C4 e superiori, ottave 4, 5, 6 tipiche della chiave di violino): Mano Destra
 */
export function detectSongHand(notes: NoteWithFinger[]): 'right' | 'left' {
  if (!notes || notes.length === 0) return 'right';
  let totalPitch = 0;
  for (const n of notes) {
    totalPitch += noteToMidiPitch(n.note);
  }
  const avgPitch = totalPitch / notes.length;
  // Se l'altezza media è strettamente nel registro grave (sotto 58 = circa La3/Si3), rileva Mano Sinistra
  return avgPitch < 58 ? 'left' : 'right';
}

/**
 * Genera un consiglio pedagogico per una nota specifica basato sul dito calcolato e sulla mano attiva
 */
export function getPedagogicalFingeringTip(
  note: string,
  finger: number,
  prevNote?: string,
  prevFinger?: number,
  hand: 'right' | 'left' = 'right'
): string {
  const fingerData = getFingerInfo(finger);
  const isBlack = isBlackKey(note);
  const isLeft = hand === 'left';
  const handLabel = isLeft ? 'Mano Sinistra' : 'Mano Destra';

  if (prevNote && prevFinger !== undefined) {
    const currPitch = noteToMidiPitch(note);
    const prevPitch = noteToMidiPitch(prevNote);

    if (!isLeft) {
      // RIGHT HAND
      if (currPitch > prevPitch && finger === 1 && (prevFinger === 3 || prevFinger === 4)) {
        return `Thumb Cross-Under (1 under ${prevFinger}): smoothly slide the thumb under your palm towards ${note}.`;
      }
      if (currPitch < prevPitch && prevFinger === 1 && (finger === 3 || finger === 4)) {
        return `Cross-Over (${finger} over 1): lift wrist smoothly and cross over the thumb to play ${note}.`;
      }
    } else {
      // LEFT HAND (Mirrored!)
      if (currPitch > prevPitch && prevFinger === 1 && (finger === 3 || finger === 4)) {
        return `Left Hand Cross-Over (${finger} over 1 ascending towards ${note}): smoothly cross over the thumb towards higher notes.`;
      }
      if (currPitch < prevPitch && finger === 1 && (prevFinger === 3 || prevFinger === 4)) {
        return `Left Hand Thumb Cross-Under (1 under ${prevFinger} descending towards ${note}): slide the thumb towards lower notes.`;
      }
    }
  }

  if (isBlack && (finger === 2 || finger === 3 || finger === 4)) {
    return `${fingerData.englishName} (${finger}) on black key ${note} [${handLabel}]: keep fingers curved and wrist horizontal.`;
  }

  if (finger === 1) {
    return `Thumb (1) [${handLabel}]: touch key ${note} with the side of the phalanx (${isLeft ? 'upper side of left hand' : 'lower side of right hand'}).`;
  }

  if (finger === 5) {
    return `Pinky (5) [${handLabel}]: maintain arch shape to support arm weight on key ${note} (${isLeft ? 'bass' : 'treble'}).`;
  }

  return `${fingerData.englishName} (Finger ${finger}) [${handLabel}]: touch key ${note} with a curved, soft fingertip.`;
}

export interface FingeringRuleDescription {
  id: string;
  title: string;
  rule: string;
  explanation: string;
  icon: string;
}

/**
 * Standard gold rules of piano fingering for user guidance.
 */
export function getStandardFingeringRules(): FingeringRuleDescription[] {
  return [
    {
      id: 'hand-symmetry',
      title: 'Right Hand vs Left Hand (Mirror Anatomy)',
      rule: 'The anatomical conformation of both hands is exactly mirrored',
      explanation: 'In the Right Hand, the Thumb (1) is on the lower side (left) and the Pinky (5) is on the upper side (right). In the Left Hand, it is opposite: the Pinky (5) is on the lower side and the Thumb (1) is on the upper side! The algorithm calculates transitions and passages by mirroring the formula.',
      icon: '👐',
    },
    {
      id: 'natural-position',
      title: 'Natural 5-Finger Position',
      rule: '1 Finger for each Consecutive Key',
      explanation: 'The resting hand spans an interval of a fifth (e.g. C-G: 1=C, 2=D, 3=E, 4=F, 5=G for right hand; 5=C, 4=D, 3=E, 2=F, 1=G for left hand). In this position, arm movement is not required.',
      icon: '🖐️',
    },
    {
      id: 'direction-harmony',
      title: 'Melody Direction',
      rule: 'Fingers ergonomically oriented to direction',
      explanation: 'In the right hand, ascending uses increasing fingers (1→2→3→4→5). In the left hand, ascending uses decreasing fingers (5→4→3→2→1) because the thumb faces higher notes.',
      icon: '📈',
    },
    {
      id: 'thumb-under',
      title: 'Thumb-Under Passage',
      rule: 'The Thumb (1) slides under the Middle (3) or Ring (4)',
      explanation: 'To extend the scale beyond 5 notes: in the right hand it occurs ascending (1 under 3 or 4); in the left hand it occurs descending (1 under 3 or 4 towards lower notes).',
      icon: '🔄',
    },
    {
      id: 'cross-over',
      title: 'Cross-Over Passage',
      rule: 'The Middle (3) or Ring (4) cross over the Thumb (1)',
      explanation: 'In melodic phrases: in the right hand finger 3 or 4 crosses over the thumb descending; in the left hand it crosses over the thumb ascending towards higher notes.',
      icon: '🔀',
    },
    {
      id: 'black-keys',
      title: 'Anatomy and Black Keys',
      rule: 'Long fingers (2, 3, 4) on black keys',
      explanation: 'Since black keys are higher and recessed, they are preferably played by long fingers (2 index, 3 middle, 4 ring). The thumb and pinky avoid black keys unless required by the melody.',
      icon: '🎹',
    },
    {
      id: 'manual-override',
      title: 'Manual Choice and Intelligent Detection',
      rule: 'Auto-register detection + Right/Left quick toggle',
      explanation: 'The system analyzes note pitches to determine if the song is in bass clef (Left Hand) or treble clef (Right Hand). You can always manually toggle between Right Hand ✋ and Left Hand 🤚 with a single tap, or customize every single note!',
      icon: '✍️',
    },
  ];
}
