import { InteractiveSong } from '../types';
import { midiNumberToNoteName } from './midiEngine';

export const GM_INSTRUMENTS: string[] = [
  // 0-7: Piano
  'Acoustic Grand Piano', 'Bright Acoustic Piano', 'Electric Grand Piano', 'Honky-tonk Piano',
  'Electric Piano 1 (Rhodes)', 'Electric Piano 2 (DX)', 'Harpsichord', 'Clavinet',
  // 8-15: Chromatic Percussion
  'Celesta', 'Glockenspiel', 'Music Box', 'Vibraphone', 'Marimba', 'Xylophone', 'Tubular Bells', 'Dulcimer',
  // 16-23: Organ
  'Drawbar Organ', 'Percussive Organ', 'Rock Organ', 'Church Organ', 'Reed Organ', 'Accordion', 'Harmonica', 'Tango Accordion',
  // 24-31: Guitar
  'Acoustic Guitar (nylon)', 'Acoustic Guitar (steel)', 'Electric Guitar (jazz)', 'Electric Guitar (clean)',
  'Electric Guitar (muted)', 'Overdriven Guitar', 'Distortion Guitar', 'Guitar Harmonics',
  // 32-39: Bass
  'Acoustic Bass', 'Electric Bass (finger)', 'Electric Bass (pick)', 'Fretless Bass', 'Slap Bass 1', 'Slap Bass 2', 'Synth Bass 1', 'Synth Bass 2',
  // 40-47: Strings
  'Violin', 'Viola', 'Cello', 'Contrabass', 'Tremolo Strings', 'Pizzicato Strings', 'Orchestral Harp', 'Timpani',
  // 48-55: Ensemble
  'String Ensemble 1', 'String Ensemble 2', 'Synth Strings 1', 'Synth Strings 2', 'Choir Aahs', 'Voice Oohs', 'Synth Voice', 'Orchestra Hit',
  // 56-63: Brass
  'Trumpet', 'Trombone', 'Tuba', 'Muted Trumpet', 'French Horn', 'Brass Section', 'Synth Brass 1', 'Synth Brass 2',
  // 64-71: Reed
  'Soprano Sax', 'Alto Sax', 'Tenor Sax', 'Baritone Sax', 'Oboe', 'English Horn', 'Bassoon', 'Clarinet',
  // 72-79: Pipe
  'Piccolo', 'Flute', 'Recorder', 'Pan Flute', 'Blown Bottle', 'Shakuhachi', 'Whistle', 'Ocarina',
  // 80-87: Synth Lead
  'Lead 1 (square)', 'Lead 2 (sawtooth)', 'Lead 3 (calliope)', 'Lead 4 (chiff)', 'Lead 5 (charang)', 'Lead 6 (voice)', 'Lead 7 (fifths)', 'Lead 8 (bass + lead)',
  // 88-95: Synth Pad
  'Pad 1 (new age)', 'Pad 2 (warm)', 'Pad 3 (polysynth)', 'Pad 4 (choir)', 'Pad 5 (bowed)', 'Pad 6 (metallic)', 'Pad 7 (halo)', 'Pad 8 (sweep)',
  // 96-103: Synth Effects
  'FX 1 (rain)', 'FX 2 (soundtrack)', 'FX 3 (crystal)', 'FX 4 (atmosphere)', 'FX 5 (brightness)', 'FX 6 (goblins)', 'FX 7 (echoes)', 'FX 8 (sci-fi)',
  // 104-111: Ethnic
  'Sitar', 'Banjo', 'Shamisen', 'Koto', 'Kalimba', 'Bagpipe', 'Fiddle', 'Shanai',
  // 112-119: Percussive
  'Tinkle Bell', 'Agogo', 'Steel Drums', 'Woodblock', 'Taiko Drum', 'Melodic Tom', 'Synth Drum', 'Reverse Cymbal',
  // 120-127: Sound Effects
  'Guitar Fret Noise', 'Breath Noise', 'Seashore', 'Bird Tweet', 'Telephone Ring', 'Helicopter', 'Applause', 'Gunshot'
];

export interface RawNote {
  midi: number;
  tickStart: number;
  tickEnd: number;
  trackIndex: number;
  channel: number;
}

export interface TempoChange {
  tick: number;
  microsPerBeat: number;
}

export type MidiTrackRole = 'melody' | 'chords' | 'bass' | 'drums' | 'other';

export interface MidiTrackDetail {
  id: string; // e.g. "trk_0" or "ch_9"
  trackIndex: number;
  channel?: number;
  name: string;
  instrumentName: string;
  programNumber?: number;
  noteCount: number;
  isDrums: boolean;
  isPiano: boolean;
  role: MidiTrackRole;
  notes: RawNote[];
}

export interface MidiParsedStructure {
  fileName: string;
  title: string;
  bpm: number;
  ticksPerBeat: number;
  tempoChanges: TempoChange[];
  tracks: MidiTrackDetail[];
  totalNotes: number;
  rawNotes: RawNote[];
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

/**
 * Parses and inspects all tracks, channels, and instruments inside a Standard MIDI File (SMF).
 */
export function inspectMidiTracks(arrayBuffer: ArrayBuffer, fileName: string): MidiParsedStructure {
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

  const ticksPerBeat = division & 0x7fff;
  const tempoChanges: TempoChange[] = [{ tick: 0, microsPerBeat: 500000 }]; // Default 120 BPM
  const allNotes: RawNote[] = [];
  let detectedTitle = '';

  interface TrackData {
    trackIndex: number;
    name: string;
    instrumentMeta: string;
    channels: Set<number>;
    programPerChannel: Map<number, number>;
    notes: RawNote[];
  }

  const tracksData: TrackData[] = [];

  // 2. Parse Each Track 'MTrk'
  for (let track = 0; track < numTracks && offset < data.byteLength; track++) {
    const trackMagic = getString(data, offset, 4);
    offset += 4;
    if (trackMagic !== 'MTrk') {
      break;
    }

    const trackLength = data.getUint32(offset);
    offset += 4;
    const trackEnd = offset + trackLength;

    let currentTick = 0;
    let runningStatus = 0;
    const activeNotes = new Map<string, number>(); // `${channel}_${midi}` -> tickStart
    let trackName = '';
    let instrumentMeta = '';
    const channelsInTrack = new Set<number>();
    const programPerChannel = new Map<number, number>();
    const trackNotes: RawNote[] = [];

    while (offset < trackEnd && offset < data.byteLength) {
      // Delta Time
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
      const channel = statusByte & 0x0f;

      // Note Off (0x80)
      if (eventType === 0x80) {
        channelsInTrack.add(channel);
        const midi = data.getUint8(offset++);
        offset++; // Skip velocity
        const key = `${channel}_${midi}`;
        if (activeNotes.has(key)) {
          const start = activeNotes.get(key)!;
          activeNotes.delete(key);
          const noteObj: RawNote = { midi, tickStart: start, tickEnd: currentTick, trackIndex: track, channel };
          trackNotes.push(noteObj);
          allNotes.push(noteObj);
        }
      }
      // Note On (0x90)
      else if (eventType === 0x90) {
        channelsInTrack.add(channel);
        const midi = data.getUint8(offset++);
        const velocity = data.getUint8(offset++);
        const key = `${channel}_${midi}`;

        if (velocity === 0) {
          // Note Off via 0 velocity
          if (activeNotes.has(key)) {
            const start = activeNotes.get(key)!;
            activeNotes.delete(key);
            const noteObj: RawNote = { midi, tickStart: start, tickEnd: currentTick, trackIndex: track, channel };
            trackNotes.push(noteObj);
            allNotes.push(noteObj);
          }
        } else {
          if (activeNotes.has(key)) {
            const start = activeNotes.get(key)!;
            const noteObj: RawNote = { midi, tickStart: start, tickEnd: currentTick, trackIndex: track, channel };
            trackNotes.push(noteObj);
            allNotes.push(noteObj);
          }
          activeNotes.set(key, currentTick);
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
      // Program Change (0xC0) - General MIDI instrument
      else if (eventType === 0xc0) {
        const prog = data.getUint8(offset++);
        programPerChannel.set(channel, prog);
        channelsInTrack.add(channel);
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

        // Track Name (0x03)
        if (metaType === 0x03 && metaLength.value > 0) {
          const name = getString(data, offset, metaLength.value);
          trackName = name.trim();
          if (!detectedTitle && trackName) {
            detectedTitle = trackName;
          }
        }
        // Instrument Name (0x04)
        else if (metaType === 0x04 && metaLength.value > 0) {
          instrumentMeta = getString(data, offset, metaLength.value).trim();
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

    // Flush any open notes
    activeNotes.forEach((start, key) => {
      const [chStr, midiStr] = key.split('_');
      const noteObj: RawNote = {
        midi: parseInt(midiStr, 10),
        tickStart: start,
        tickEnd: currentTick,
        trackIndex: track,
        channel: parseInt(chStr, 10)
      };
      trackNotes.push(noteObj);
      allNotes.push(noteObj);
    });

    tracksData.push({
      trackIndex: track,
      name: trackName,
      instrumentMeta,
      channels: channelsInTrack,
      programPerChannel,
      notes: trackNotes,
    });

    offset = trackEnd;
  }

  // 3. Format into MidiTrackDetail items
  const finalTracks: MidiTrackDetail[] = [];

  // If Format 0 (single track) but multiple channels, decompose by channel
  const tracksWithNotes = tracksData.filter((t) => t.notes.length > 0);

  if (tracksWithNotes.length === 1 && tracksWithNotes[0].channels.size > 1) {
    const single = tracksWithNotes[0];
    const uniqueChannels = Array.from(single.channels).sort((a, b) => a - b);

    uniqueChannels.forEach((ch) => {
      const chNotes = single.notes.filter((n) => n.channel === ch);
      if (chNotes.length === 0) return;

      const isDrums = ch === 9; // Channel 10 is 0-indexed 9
      const prog = single.programPerChannel.get(ch);
      const gmName = prog !== undefined ? GM_INSTRUMENTS[prog] || `Strumento #${prog}` : '';
      const isPiano = !isDrums && (prog === undefined || (prog >= 0 && prog <= 7));

      let role: MidiTrackRole = 'other';
      if (isDrums) {
        role = 'drums';
      } else if (prog !== undefined && prog >= 32 && prog <= 39) {
        role = 'bass';
      } else if (isPiano) {
        role = 'chords';
      } else if (prog !== undefined && ((prog >= 56 && prog <= 87) || prog === 11 || prog === 40 || prog === 73)) {
        role = 'melody';
      }

      let trackTitle = isDrums
        ? 'Batteria / Percussioni'
        : gmName || (isPiano ? 'Pianoforte' : `Strumento Canale ${ch + 1}`);

      finalTracks.push({
        id: `ch_${ch}`,
        trackIndex: 0,
        channel: ch,
        name: trackTitle,
        instrumentName: isDrums ? 'Percussioni (Canale 10)' : gmName || (isPiano ? 'Acoustic Piano (Default)' : 'Generico'),
        programNumber: prog,
        noteCount: chNotes.length,
        isDrums,
        isPiano,
        role,
        notes: chNotes,
      });
    });
  } else {
    // Multi-track Format 1
    tracksData.forEach((t) => {
      if (t.notes.length === 0) return;

      const channelsArr = Array.from(t.channels);
      const isDrums = channelsArr.length === 1 && channelsArr[0] === 9;

      // Primary program
      let prog: number | undefined;
      for (const ch of channelsArr) {
        if (t.programPerChannel.has(ch)) {
          prog = t.programPerChannel.get(ch);
          break;
        }
      }

      const gmName = prog !== undefined ? GM_INSTRUMENTS[prog] : '';
      const textToInspect = `${t.name} ${t.instrumentMeta} ${gmName}`.toLowerCase();

      const isPiano =
        !isDrums &&
        ((prog !== undefined && prog >= 0 && prog <= 7) ||
          /piano|pianoforte|grand|rhodes|clav|harpsi|key|tastier|destra|sinistra|right|left|\brh\b|\blh\b/.test(textToInspect) ||
          (prog === undefined && !isDrums));

      let role: MidiTrackRole = 'other';
      if (isDrums) {
        role = 'drums';
      } else if (
        textToInspect.includes('bass') ||
        textToInspect.includes('basso') ||
        (prog !== undefined && prog >= 32 && prog <= 39)
      ) {
        role = 'bass';
      } else if (
        textToInspect.includes('vocal') ||
        textToInspect.includes('voce') ||
        textToInspect.includes('canto') ||
        textToInspect.includes('melody') ||
        textToInspect.includes('melodia') ||
        textToInspect.includes('lead') ||
        textToInspect.includes('guida') ||
        textToInspect.includes('canta') ||
        textToInspect.includes('solo') ||
        (prog !== undefined && ((prog >= 56 && prog <= 87) || prog === 11 || prog === 40 || prog === 73))
      ) {
        role = 'melody';
      } else if (isPiano || textToInspect.includes('chord') || textToInspect.includes('accordi') || textToInspect.includes('pad')) {
        role = 'chords';
      }

      let displayName = t.name || t.instrumentMeta || gmName || `Traccia ${t.trackIndex + 1}`;
      if (isDrums && !displayName.toLowerCase().includes('drum') && !displayName.toLowerCase().includes('batteria')) {
        displayName += ' (Batteria)';
      }

      finalTracks.push({
        id: `trk_${t.trackIndex}`,
        trackIndex: t.trackIndex,
        channel: channelsArr[0],
        name: displayName,
        instrumentName: gmName || t.instrumentMeta || (isDrums ? 'Batteria' : isPiano ? 'Pianoforte' : 'Strumento Melodico'),
        programNumber: prog,
        noteCount: t.notes.length,
        isDrums,
        isPiano,
        role,
        notes: t.notes,
      });
    });
  }

  // Calculate BPM
  tempoChanges.sort((a, b) => a.tick - b.tick);
  const firstMicros = tempoChanges[0]?.microsPerBeat || 500000;
  const bpm = Math.round(60000000 / firstMicros);

  const cleanTitle =
    detectedTitle ||
    fileName.replace(/\.(mid|midi)$/i, '').replace(/[-_]/g, ' ') ||
    'Brano MIDI';

  return {
    fileName,
    title: cleanTitle,
    bpm: bpm > 30 && bpm < 240 ? bpm : 120,
    ticksPerBeat,
    tempoChanges,
    tracks: finalTracks,
    totalNotes: allNotes.length,
    rawNotes: allNotes,
  };
}

/**
 * Builds an InteractiveSong from the inspected structure, retaining only selected track IDs.
 */
export function buildSongFromMidiStructure(
  structure: MidiParsedStructure,
  selectedTrackIds?: string[]
): InteractiveSong {
  let chosenNotes: RawNote[] = [];

  if (selectedTrackIds && selectedTrackIds.length > 0) {
    const selectedSet = new Set(selectedTrackIds);
    for (const track of structure.tracks) {
      if (selectedSet.has(track.id)) {
        chosenNotes.push(...track.notes);
      }
    }
  } else {
    // Default smart selection:
    // If piano tracks exist, pick only piano tracks
    const pianoTracks = structure.tracks.filter((t) => t.isPiano && !t.isDrums);
    if (pianoTracks.length > 0) {
      chosenNotes = pianoTracks.flatMap((t) => t.notes);
    } else {
      // Otherwise pick non-drum tracks
      const melodicTracks = structure.tracks.filter((t) => !t.isDrums);
      if (melodicTracks.length > 0) {
        chosenNotes = melodicTracks.flatMap((t) => t.notes);
      } else {
        chosenNotes = structure.rawNotes;
      }
    }
  }

  // Filter piano range (A0 = 21 to C8 = 108) and positive duration
  const validNotes = chosenNotes
    .filter((n) => n.midi >= 21 && n.midi <= 108 && n.tickEnd > n.tickStart)
    .sort((a, b) => a.tickStart - b.tickStart);

  if (validNotes.length === 0) {
    throw new Error('Nessuna nota compatibile con il pianoforte trovata nelle tracce selezionate.');
  }

  // Ticks to Seconds conversion
  const { tempoChanges, ticksPerBeat } = structure;

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

  return {
    id: `midi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: structure.title,
    author: 'Importato da MIDI',
    bpm: structure.bpm,
    difficulty: parsedNotes.length > 100 ? 'difficile' : parsedNotes.length > 40 ? 'medio' : 'facile',
    notes: parsedNotes,
    isPublished: false,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Backward-compatible single-call MIDI parser
 */
export function parseMidiFile(
  arrayBuffer: ArrayBuffer,
  fileName: string,
  selectedTrackIds?: string[]
): InteractiveSong {
  const structure = inspectMidiTracks(arrayBuffer, fileName);
  return buildSongFromMidiStructure(structure, selectedTrackIds);
}
