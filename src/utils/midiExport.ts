import { SheetSong, InteractiveSong } from '../types';

// Map note name (e.g. "C4", "F#3", "Bb2") to MIDI note number (0 - 127)
const SEMITONES: Record<string, number> = {
  'C': 0,
  'C#': 1,
  'DB': 1,
  'D': 2,
  'D#': 3,
  'EB': 3,
  'E': 4,
  'F': 5,
  'F#': 6,
  'GB': 6,
  'G': 7,
  'G#': 8,
  'AB': 8,
  'A': 9,
  'A#': 10,
  'BB': 10,
  'B': 11,
};

export function noteNameToMidi(noteName: string): number {
  if (!noteName) return 60;
  const match = noteName.trim().match(/^([A-Ga-g][#b]?)(-?\d+)?$/);
  if (!match) return 60;

  const pitch = match[1].toUpperCase();
  const octave = match[2] !== undefined ? parseInt(match[2], 10) : 4;
  const semitone = SEMITONES[pitch] ?? 0;

  // MIDI standard: C4 = 60, (octave + 1) * 12 + semitone
  const midi = (octave + 1) * 12 + semitone;
  return Math.max(0, Math.min(127, midi));
}

// Convert duration string ('16n', '8n', '4n', '2n', '1m') into ticks based on PPQ (480 ticks/quarter note)
export function durationToTicks(duration: string, ppq: number = 480): number {
  switch (duration) {
    case '16n': return Math.round(ppq * 0.25);
    case '8n': return Math.round(ppq * 0.5);
    case '4n': return ppq;
    case '2n': return ppq * 2;
    case '1m': return ppq * 4;
    default: return ppq;
  }
}

// Variable-Length Quantity (VLQ) encoding for MIDI delta times
function encodeVLQ(value: number): number[] {
  let val = Math.max(0, Math.round(value));
  const buffer: number[] = [];
  buffer.push(val & 0x7F);

  while ((val >>= 7) > 0) {
    buffer.unshift((val & 0x7F) | 0x80);
  }
  return buffer;
}

interface MidiInternalEvent {
  tick: number;
  type: 'on' | 'off';
  channel: number;
  pitch: number;
  velocity: number;
}

/**
 * Builds SMF Format 0 file bytes from header, meta events and note events
 */
function buildMidiBinary(title: string, bpm: number, events: MidiInternalEvent[], ppq: number = 480): Uint8Array {
  // Sort events chronologically. If ticks are equal, NoteOff before NoteOn
  events.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    if (a.type === 'off' && b.type === 'on') return -1;
    if (a.type === 'on' && b.type === 'off') return 1;
    return 0;
  });

  const trackBytes: number[] = [];
  const write = (...bytes: number[]) => {
    trackBytes.push(...bytes);
  };

  // Meta: Track Name at tick 0 (delta = 0)
  const safeTitle = (title || 'Maestro Song').slice(0, 32);
  const titleBytes: number[] = [];
  for (let i = 0; i < safeTitle.length; i++) {
    titleBytes.push(safeTitle.charCodeAt(i) & 0x7F);
  }
  write(...encodeVLQ(0));
  write(0xFF, 0x03, titleBytes.length, ...titleBytes);

  // Meta: Set Tempo at tick 0 (delta = 0)
  // Microseconds per quarter note = 60,000,000 / BPM
  const validBpm = Math.max(30, Math.min(240, bpm || 100));
  const mpqn = Math.round(60000000 / validBpm);
  write(...encodeVLQ(0));
  write(0xFF, 0x51, 0x03, (mpqn >> 16) & 0xFF, (mpqn >> 8) & 0xFF, mpqn & 0xFF);

  // Meta: Time Signature (4/4) at tick 0 (delta = 0)
  write(...encodeVLQ(0));
  write(0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);

  // Program Change: Channel 0 -> Acoustic Piano (0)
  write(...encodeVLQ(0));
  write(0xC0, 0x00);

  // Program Change: Channel 1 -> Acoustic / Electric Bass (33)
  write(...encodeVLQ(0));
  write(0xC1, 0x21);

  // Encode all events with delta times
  let lastTick = 0;
  for (const ev of events) {
    const delta = Math.max(0, ev.tick - lastTick);
    write(...encodeVLQ(delta));

    if (ev.type === 'on') {
      write(0x90 | (ev.channel & 0x0F), ev.pitch & 0x7F, ev.velocity & 0x7F);
    } else {
      write(0x80 | (ev.channel & 0x0F), ev.pitch & 0x7F, 0x00);
    }

    lastTick = ev.tick;
  }

  // Meta: End of Track (delta = 0)
  write(...encodeVLQ(0));
  write(0xFF, 0x2F, 0x00);

  // Full SMF Header (Format 0, 1 track, PPQ)
  const headerBytes = [
    0x4D, 0x54, 0x68, 0x64, // 'MThd'
    0x00, 0x00, 0x00, 0x06, // Chunk length = 6
    0x00, 0x00,             // Format 0
    0x00, 0x01,             // 1 track
    (ppq >> 8) & 0xFF, ppq & 0xFF,
  ];

  const trackLen = trackBytes.length;
  const trackHeader = [
    0x4D, 0x54, 0x72, 0x6B, // 'MTrk'
    (trackLen >> 24) & 0xFF,
    (trackLen >> 16) & 0xFF,
    (trackLen >> 8) & 0xFF,
    trackLen & 0xFF,
  ];

  const fullFile = new Uint8Array(headerBytes.length + trackHeader.length + trackBytes.length);
  fullFile.set(headerBytes, 0);
  fullFile.set(trackHeader, headerBytes.length);
  fullFile.set(trackBytes, headerBytes.length + trackHeader.length);

  return fullFile;
}

/**
 * Generates a valid Standard MIDI File (SMF Format 0) binary buffer from a SheetSong
 */
export function generateMidiFile(song: SheetSong): Uint8Array {
  const PPQ = 480;
  const events: MidiInternalEvent[] = [];

  // Melody -> Channel 0 (Piano)
  if (Array.isArray(song.melody)) {
    song.melody.forEach((m) => {
      const pitch = noteNameToMidi(m.note);
      const startTick = Math.max(0, Math.round(m.time * PPQ));
      const durTicks = durationToTicks(m.duration, PPQ);
      const endTick = startTick + durTicks;

      events.push({ tick: startTick, type: 'on', channel: 0, pitch, velocity: 100 });
      events.push({ tick: endTick, type: 'off', channel: 0, pitch, velocity: 0 });
    });
  }

  // Bassline -> Channel 1 (Bass)
  if (Array.isArray(song.bassline)) {
    song.bassline.forEach((b) => {
      const pitch = noteNameToMidi(b.note);
      const startTick = Math.max(0, Math.round(b.time * PPQ));
      const durTicks = durationToTicks(b.duration, PPQ);
      const endTick = startTick + durTicks;

      events.push({ tick: startTick, type: 'on', channel: 1, pitch, velocity: 90 });
      events.push({ tick: endTick, type: 'off', channel: 1, pitch, velocity: 0 });
    });
  }

  return buildMidiBinary(song.title, song.bpm || 100, events, PPQ);
}

/**
 * Generates a valid Standard MIDI File binary from an InteractiveSong (recorded piano notes)
 */
export function generateInteractiveSongMidiFile(song: InteractiveSong): Uint8Array {
  const PPQ = 480;
  const bpm = Math.max(30, Math.min(240, song.bpm || 100));
  const ticksPerSecond = (bpm / 60) * PPQ;
  const events: MidiInternalEvent[] = [];

  if (Array.isArray(song.notes)) {
    song.notes.forEach((n) => {
      const pitch = noteNameToMidi(n.note);
      const startTick = Math.max(0, Math.round(n.time * ticksPerSecond));
      const durTicks = Math.max(120, Math.round((n.duration || 0.5) * ticksPerSecond));
      const endTick = startTick + durTicks;

      events.push({ tick: startTick, type: 'on', channel: 0, pitch, velocity: 100 });
      events.push({ tick: endTick, type: 'off', channel: 0, pitch, velocity: 0 });
    });
  }

  return buildMidiBinary(song.title, bpm, events, PPQ);
}

/**
 * Creates a downloadable Blob of the MIDI file from a SheetSong
 */
export function createMidiBlob(song: SheetSong): Blob {
  const bytes = generateMidiFile(song);
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/midi' });
}

/**
 * Creates a downloadable Blob from an InteractiveSong
 */
export function createInteractiveSongMidiBlob(song: InteractiveSong): Blob {
  const bytes = generateInteractiveSongMidiFile(song);
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/midi' });
}

/**
 * Encodes MIDI binary into Base64 string for safe transport or embedding
 */
export function createMidiBase64(song: SheetSong): string {
  const bytes = generateMidiFile(song);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Bulletproof, zero-fail direct file download helper for modern browsers & mobile
 */
export function downloadBlobFile(filename: string, blob: Blob): boolean {
  const isAndroidWebView = typeof navigator !== 'undefined' && (/wv|Android/i.test(navigator.userAgent) || typeof (window as any).Capacitor !== 'undefined' || typeof (window as any).AndroidFileSaver !== 'undefined');

  // 1. Android Capacitor Native App FileSaver Bridge (Instant Direct Save to Downloads Folder)
  if (typeof window !== 'undefined' && (window as any).AndroidFileSaver?.saveFileToDownloads) {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64Data = dataUrl.split(',')[1] || '';
        const mimeType = blob.type || 'application/octet-stream';
        (window as any).AndroidFileSaver.saveFileToDownloads(filename, base64Data, mimeType);
      };
      reader.readAsDataURL(blob);
      return true;
    } catch (e) {
      console.warn('AndroidFileSaver failed:', e);
    }
  }

  // 2. Try Web Share API with File object ONLY on iOS/Safari or desktop web (Skip Android WebViews where navigator.share is broken or causes silent hanging)
  if (!isAndroidWebView) {
    try {
      if (typeof navigator !== 'undefined' && navigator.canShare && typeof File !== 'undefined') {
        const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
        if (navigator.canShare({ files: [file] })) {
          navigator.share({
            files: [file],
            title: filename,
            text: `File ${filename} da Maestro Studio`,
          }).catch((err) => {
            console.warn('Share dismissed or failed, using direct download', err);
            triggerDirectDownload(filename, blob);
          });
          return true;
        }
      }
    } catch (e) {
      console.warn('Web share check error:', e);
    }
  }

  return triggerDirectDownload(filename, blob);
}

function triggerDirectDownload(filename: string, blob: Blob): boolean {
  // Convert blob to Data URL so that Android WebViews receive the full Base64 payload in DownloadListener
  try {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      link.setAttribute('download', filename);
      link.target = '_blank';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
      }, 1500);
    };
    reader.readAsDataURL(blob);
    return true;
  } catch (err) {
    console.warn('FileReader failed, using blob object URL', err);
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.setAttribute('download', filename);
      link.target = '_blank';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 2000);
      return true;
    } catch (e2) {
      console.error('All download methods failed:', e2);
      return false;
    }
  }
}

/**
 * Direct JSON file download helper
 */
export function downloadJson(first: string | any, second?: any): boolean {
  let filename = 'composition.json';
  let data = first;
  if (typeof first === 'string' && second !== undefined) {
    filename = first;
    data = second;
  } else if (first && typeof first === 'object' && first.title) {
    filename = `${first.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
    data = first;
  }
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  return downloadBlobFile(filename, blob);
}

/**
 * Direct MIDI file download helper
 */
export function downloadMidi(first: string | SheetSong | InteractiveSong, second?: SheetSong | InteractiveSong): boolean {
  let filename = 'recording.mid';
  let song: SheetSong | InteractiveSong;
  if (typeof first === 'string' && second) {
    filename = first;
    song = second;
  } else {
    song = first as SheetSong | InteractiveSong;
    filename = `${(song.title || 'recording').toLowerCase().replace(/[^a-z0-9]/g, '_')}.mid`;
  }
  const blob = 'melody' in song
    ? createMidiBlob(song as SheetSong)
    : createInteractiveSongMidiBlob(song as InteractiveSong);
  return downloadBlobFile(filename, blob);
}
