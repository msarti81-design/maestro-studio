/**
 * Piano Fingering Generation Engine
 * Implements classical piano pedagogy heuristics (Parncutt / Czerny / Chopin principles)
 * to automatically assign natural, ergonomic 5-finger pianist fingering (1 = Thumb to 5 = Pinky)
 * to any melody or song without requiring manual entry.
 */

// MIDI note number lookup for chromatic pitch calculations
const NOTE_SEMITONES: Record<string, number> = {
  C: 0,
  'C#': 1,
  DB: 1,
  D: 2,
  'D#': 3,
  EB: 3,
  E: 4,
  F: 5,
  'F#': 6,
  GB: 6,
  G: 7,
  'G#': 8,
  AB: 8,
  A: 9,
  'A#': 10,
  BB: 10,
  B: 11,
};

export function noteToMidiPitch(note: string): number {
  if (!note) return 60;
  const match = note.trim().match(/^([A-Ga-g][#b]?)(-?\d+)?$/);
  if (!match) return 60;
  const pitch = match[1].toUpperCase();
  const octave = match[2] !== undefined ? parseInt(match[2], 10) : 4;
  const semitone = NOTE_SEMITONES[pitch] ?? 0;
  return (octave + 1) * 12 + semitone;
}

export function isBlackKey(note: string): boolean {
  if (!note) return false;
  return note.includes('#') || note.includes('b');
}

export interface NoteFingeringInput {
  note: string;
  time: number;
  duration?: number;
  finger?: number;
}

/**
 * Computes an array of fingers (1 to 5) for every note in the given sequence.
 * Respects any existing explicit `finger` property if present on the note.
 */
export function computeSongFingering(notes: NoteFingeringInput[], hand: 'right' | 'left' = 'right'): number[] {
  if (!notes || notes.length === 0) return [];

  const result: number[] = new Array(notes.length);
  const isRightHand = hand === 'right';

  // Sort by time internally if needed, but preserve original array order for return
  const indexedNotes = notes.map((n, idx) => ({
    originalIndex: idx,
    note: n.note,
    time: n.time,
    pitch: noteToMidiPitch(n.note),
    isBlack: isBlackKey(n.note),
    explicitFinger: n.finger && n.finger >= 1 && n.finger <= 5 ? n.finger : undefined,
  }));

  // Analyze overall pitch range of the piece to choose optimal initial hand anchor
  const pitches = indexedNotes.map((n) => n.pitch);
  const minPitch = Math.min(...pitches);
  const maxPitch = Math.max(...pitches);
  const pitchSpan = maxPitch - minPitch;

  let currentFinger = 1;
  let currentPitch = indexedNotes[0].pitch;
  let handBasePitch = currentPitch; // Anchor of finger 1 (for right hand)

  for (let i = 0; i < indexedNotes.length; i++) {
    const curr = indexedNotes[i];

    // 1. If explicit finger was assigned in sheet music, respect it
    if (curr.explicitFinger !== undefined) {
      currentFinger = curr.explicitFinger;
      currentPitch = curr.pitch;
      handBasePitch = isRightHand ? curr.pitch - (currentFinger - 1) * 2 : curr.pitch + (currentFinger - 1) * 2;
      result[curr.originalIndex] = currentFinger;
      continue;
    }

    // 2. First note initialization
    if (i === 0) {
      if (isRightHand) {
        // If first note is near the low end of the melody range, start with finger 1 or 2
        // If starting on a black key, prefer finger 2
        if (curr.isBlack) {
          currentFinger = 2;
        } else if (curr.pitch <= minPitch + 3) {
          currentFinger = 1;
        } else if (curr.pitch >= maxPitch - 2 && pitchSpan > 5) {
          currentFinger = 5;
        } else {
          currentFinger = 2; // Relaxed index finger start
        }
        handBasePitch = curr.pitch - (currentFinger - 1) * 2;
      } else {
        // Left hand mirror
        if (curr.isBlack) {
          currentFinger = 2;
        } else if (curr.pitch >= maxPitch - 3) {
          currentFinger = 1;
        } else {
          currentFinger = 5;
        }
        handBasePitch = curr.pitch + (currentFinger - 1) * 2;
      }

      result[curr.originalIndex] = currentFinger;
      currentPitch = curr.pitch;
      continue;
    }

    const prev = indexedNotes[i - 1];
    const semitoneDiff = curr.pitch - prev.pitch;
    const timeDelta = curr.time - prev.time;

    // 3. Phrase pause reset: if there is a long rest (> 0.75s), hand can freely reposition
    if (timeDelta > 0.75) {
      if (curr.isBlack) {
        currentFinger = semitoneDiff > 0 ? 3 : 2;
      } else if (curr.pitch > prev.pitch) {
        currentFinger = 1;
      } else {
        currentFinger = 5;
      }
      currentPitch = curr.pitch;
      handBasePitch = isRightHand ? curr.pitch - (currentFinger - 1) * 2 : curr.pitch + (currentFinger - 1) * 2;
      result[curr.originalIndex] = currentFinger;
      continue;
    }

    // 4. Repeated note: same pitch
    if (semitoneDiff === 0) {
      // Keep same finger for moderate tempo, or alternate 2-1 or 3-2 if very fast
      if (timeDelta < 0.15 && currentFinger === 1) {
        currentFinger = 2;
      } else if (timeDelta < 0.15 && currentFinger === 2) {
        currentFinger = 1;
      }
      result[curr.originalIndex] = currentFinger;
      continue;
    }

    // 5. Directional step and leap calculations
    if (isRightHand) {
      if (semitoneDiff > 0) {
        // --- ASCENDING MELODY (Melodia a salire) ---
        if (semitoneDiff <= 2) {
          // Half step or whole step up
          if (currentFinger < 5) {
            currentFinger += 1;
          } else {
            // Thumb-under passage (passaggio del pollice sotto il 3/4 o 5)
            currentFinger = 1;
          }
        } else if (semitoneDiff <= 4) {
          // Minor/major third up
          if (currentFinger <= 3) {
            currentFinger += 2;
          } else if (currentFinger === 4) {
            currentFinger = 5;
          } else {
            currentFinger = curr.isBlack ? 2 : 1;
          }
        } else if (semitoneDiff <= 7) {
          // Fourth or fifth leap up
          if (currentFinger <= 2) {
            currentFinger = 5;
          } else {
            // Reposition thumb or index on destination
            currentFinger = curr.isBlack ? 2 : 1;
          }
        } else {
          // Large leap up (> 7 semitones)
          currentFinger = curr.isBlack ? 3 : 5;
        }
      } else {
        // --- DESCENDING MELODY (Melodia a scendere) ---
        const absDiff = Math.abs(semitoneDiff);
        if (absDiff <= 2) {
          // Half step or whole step down
          if (currentFinger > 1) {
            currentFinger -= 1;
          } else {
            // Finger-over-thumb passage (passaggio del 3° o 4° dito sopra il pollice)
            currentFinger = curr.isBlack ? 4 : 3;
          }
        } else if (absDiff <= 4) {
          // Third down
          if (currentFinger >= 3) {
            currentFinger -= 2;
          } else if (currentFinger === 2) {
            currentFinger = 1;
          } else {
            currentFinger = curr.isBlack ? 4 : 3;
          }
        } else if (absDiff <= 7) {
          // Fourth or fifth leap down
          if (currentFinger >= 4) {
            currentFinger = 1;
          } else {
            currentFinger = 1;
          }
        } else {
          // Large leap down (> 7 semitones)
          currentFinger = 1;
        }
      }

      // 6. Ergonomic black key rule: Avoid finger 1 on black keys when jumping
      if (curr.isBlack && currentFinger === 1) {
        currentFinger = 2;
      }
    } else {
      // Left Hand rules (mirrored)
      if (semitoneDiff > 0) {
        if (semitoneDiff <= 2) {
          if (currentFinger > 1) currentFinger -= 1;
          else currentFinger = curr.isBlack ? 4 : 3;
        } else {
          currentFinger = 1;
        }
      } else {
        const absDiff = Math.abs(semitoneDiff);
        if (absDiff <= 2) {
          if (currentFinger < 5) currentFinger += 1;
          else currentFinger = 1;
        } else {
          currentFinger = 5;
        }
      }
      if (curr.isBlack && currentFinger === 1) {
        currentFinger = 2;
      }
    }

    // Clamp safeguard (1 to 5)
    currentFinger = Math.max(1, Math.min(5, Math.round(currentFinger)));
    currentPitch = curr.pitch;
    result[curr.originalIndex] = currentFinger;
  }

  return result;
}

/**
 * Cache computed fingerings by song id and length to ensure instantaneous 0ms response
 */
const fingeringCache = new Map<string, number[]>();

export function getCachedSongFingering(song: { id: string; notes: NoteFingeringInput[] }): number[] {
  if (!song || !song.notes) return [];
  const cacheKey = `${song.id}_${song.notes.length}`;
  const existing = fingeringCache.get(cacheKey);
  if (existing) return existing;

  const computed = computeSongFingering(song.notes, 'right');
  fingeringCache.set(cacheKey, computed);
  return computed;
}
