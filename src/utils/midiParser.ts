import { InteractiveSong } from '../types';
import { midiNumberToNoteName } from './midiEngine';

// Pure JavaScript Standard MIDI File (SMF) Parser
export function parseMidiFile(arrayBuffer: ArrayBuffer, fileName: string): InteractiveSong {
  const data = new DataView(arrayBuffer);
  let offset = 0;

  // 1. Check Header 'MThd'
  const magic = getString(data, offset, 4);
  offset += 4;
  if (magic !== 'MThd') {
    throw new Error('File non valido: intestazione MIDI mancante');
  }

  const headerLength = data.getUint32(offset);
  offset += 4;

  const format = data.getUint16(offset);
  offset += 2;
  const numTracks = data.getUint16(offset);
  offset += 2;
  const division = data.getUint16(offset);
  offset += 2;

  // Skip any extra header bytes
  if (headerLength > 6) {
    offset += headerLength - 6;
  }

  // Ticks per quarter note
  const ticksPerBeat = division & 0x7fff;

  interface RawNote {
    midi: number;
    tickStart: number;
    tickEnd: number;
  }

  interface TempoChange {
    tick: number;
    microsPerBeat: number;
  }

  const tempoChanges: TempoChange[] = [{ tick: 0, microsPerBeat: 500000 }]; // Default 120 BPM
  const allNotes: RawNote[] = [];
  let detectedTitle = '';

  // 2. Parse Each Track 'MTrk'
  for (let track = 0; track < numTracks && offset < data.byteLength; track++) {
    const trackMagic = getString(data, offset, 4);
    offset += 4;
    if (trackMagic !== 'MTrk') {
      // Find next chunk or break
      break;
    }

    const trackLength = data.getUint32(offset);
    offset += 4;
    const trackEnd = offset + trackLength;

    let currentTick = 0;
    let runningStatus = 0;
    const activeNotes = new Map<number, number>(); // midiNumber -> tickStart

    while (offset < trackEnd && offset < data.byteLength) {
      // Read Delta Time (Variable Length Quantity)
      const delta = readVarInt(data, offset);
      offset = delta.newOffset;
      currentTick += delta.value;

      let statusByte = data.getUint8(offset);
      if (statusByte & 0x80) {
        runningStatus = statusByte;
        offset++;
      } else {
        statusByte = runningStatus;
      }

      const eventType = statusByte & 0xf0;

      // Note Off (0x80)
      if (eventType === 0x80) {
        const midi = data.getUint8(offset++);
        offset++; // Skip velocity
        if (activeNotes.has(midi)) {
          const start = activeNotes.get(midi)!;
          activeNotes.delete(midi);
          allNotes.push({ midi, tickStart: start, tickEnd: currentTick });
        }
      }
      // Note On (0x90)
      else if (eventType === 0x90) {
        const midi = data.getUint8(offset++);
        const velocity = data.getUint8(offset++);
        if (velocity === 0) {
          // Velocity 0 is Note Off
          if (activeNotes.has(midi)) {
            const start = activeNotes.get(midi)!;
            activeNotes.delete(midi);
            allNotes.push({ midi, tickStart: start, tickEnd: currentTick });
          }
        } else {
          // If already active, close previous
          if (activeNotes.has(midi)) {
            const start = activeNotes.get(midi)!;
            allNotes.push({ midi, tickStart: start, tickEnd: currentTick });
          }
          activeNotes.set(midi, currentTick);
        }
      }
      // Polyphonic Aftertouch (0xA0)
      else if (eventType === 0xa0) {
        offset += 2;
      }
      // Control Change (0xB0)
      else if (eventType === 0xb0) {
        offset += 2;
      }
      // Program Change (0xC0)
      else if (eventType === 0xc0) {
        offset += 1;
      }
      // Channel Aftertouch (0xD0)
      else if (eventType === 0xd0) {
        offset += 1;
      }
      // Pitch Bend (0xE0)
      else if (eventType === 0xe0) {
        offset += 2;
      }
      // Meta Events (0xFF)
      else if (statusByte === 0xff) {
        const metaType = data.getUint8(offset++);
        const metaLength = readVarInt(data, offset);
        offset = metaLength.newOffset;

        // Track / Song Name (0x03)
        if (metaType === 0x03 && metaLength.value > 0) {
          const name = getString(data, offset, metaLength.value);
          if (!detectedTitle && name.trim()) {
            detectedTitle = name.trim();
          }
        }
        // Set Tempo (0x51)
        else if (metaType === 0x51 && metaLength.value === 3) {
          const micros = (data.getUint8(offset) << 16) | (data.getUint8(offset + 1) << 8) | data.getUint8(offset + 2);
          tempoChanges.push({ tick: currentTick, microsPerBeat: micros });
        }

        offset += metaLength.value;
      }
      // SysEx (0xF0, 0xF7)
      else if (statusByte === 0xf0 || statusByte === 0xf7) {
        const sysexLength = readVarInt(data, offset);
        offset = sysexLength.newOffset + sysexLength.value;
      }
    }

    // Flush any dangling active notes
    activeNotes.forEach((start, midi) => {
      allNotes.push({ midi, tickStart: start, tickEnd: currentTick });
    });

    offset = trackEnd;
  }

  // 3. Convert Ticks to Exact Seconds using Tempo Map
  tempoChanges.sort((a, b) => a.tick - b.tick);

  function tickToSeconds(tick: number): number {
    let seconds = 0;
    let prevTick = 0;
    let currentMicros = 500000;

    for (const change of tempoChanges) {
      if (tick <= change.tick) break;
      const deltaTicks = change.tick - prevTick;
      seconds += (deltaTicks / ticksPerBeat) * (currentMicros / 1000000);
      prevTick = change.tick;
      currentMicros = change.microsPerBeat;
    }

    const remainingTicks = tick - prevTick;
    seconds += (remainingTicks / ticksPerBeat) * (currentMicros / 1000000);
    return seconds;
  }

  // Filter piano range (A0 = 21 to C8 = 108) and minimum duration
  const validNotes = allNotes
    .filter((n) => n.midi >= 21 && n.midi <= 108 && n.tickEnd > n.tickStart)
    .sort((a, b) => a.tickStart - b.tickStart);

  if (validNotes.length === 0) {
    throw new Error('Nessuna nota compatibile trovata nel file MIDI.');
  }

  // Normalize so first note begins around 1.0s (giving 1s visual arrival window)
  const firstNoteTime = tickToSeconds(validNotes[0].tickStart);
  const timeOffset = Math.max(0, firstNoteTime - 1.2);

  const parsedNotes = validNotes.map((n) => {
    const startTime = Math.max(0, tickToSeconds(n.tickStart) - timeOffset);
    const endTime = Math.max(startTime + 0.1, tickToSeconds(n.tickEnd) - timeOffset);
    const duration = Math.max(0.15, endTime - startTime);
    return {
      note: midiNumberToNoteName(n.midi),
      time: Math.round(startTime * 100) / 100,
      duration: Math.round(duration * 100) / 100,
    };
  });

  // Calculate BPM
  const firstMicros = tempoChanges[0]?.microsPerBeat || 500000;
  const bpm = Math.round(60000000 / firstMicros);

  const cleanTitle =
    detectedTitle ||
    fileName.replace(/\.(mid|midi)$/i, '').replace(/[-_]/g, ' ') ||
    'Brano MIDI Personalizzato';

  return {
    id: `midi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: cleanTitle,
    author: 'Importato da MIDI',
    bpm: bpm > 30 && bpm < 240 ? bpm : 120,
    difficulty: parsedNotes.length > 100 ? 'difficile' : parsedNotes.length > 40 ? 'medio' : 'facile',
    notes: parsedNotes,
    isPublished: true,
    createdAt: new Date().toISOString(),
  };
}

function getString(view: DataView, offset: number, length: number): string {
  let str = '';
  for (let i = 0; i < length; i++) {
    if (offset + i < view.byteLength) {
      str += String.fromCharCode(view.getUint8(offset + i));
    }
  }
  return str;
}

function readVarInt(view: DataView, offset: number): { value: number; newOffset: number } {
  let value = 0;
  let curOffset = offset;
  while (curOffset < view.byteLength) {
    const byte = view.getUint8(curOffset++);
    value = (value << 7) | (byte & 0x7f);
    if (!(byte & 0x80)) break;
  }
  return { value, newOffset: curOffset };
}
