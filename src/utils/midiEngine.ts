// Web MIDI Engine for connecting physical digital pianos via USB-OTG or Bluetooth MIDI

const MIDI_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiNumberToNoteName(midiNumber: number): string {
  const octave = Math.floor(midiNumber / 12) - 1;
  const name = MIDI_NAMES[midiNumber % 12];
  return `${name}${octave}`;
}

export function noteNameToMidiNumber(noteName: string): number {
  const match = noteName.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) return 60;
  const name = match[1];
  const octave = parseInt(match[2], 10);
  const nameIndex = MIDI_NAMES.indexOf(name);
  if (nameIndex === -1) return 60;
  return (octave + 1) * 12 + nameIndex;
}

export type MidiStatusListener = (status: {
  isSupported: boolean;
  isConnected: boolean;
  deviceNames: string[];
}) => void;

class MidiEngine {
  private midiAccess: any = null;
  private isSupported = false;
  private isConnected = false;
  private deviceNames: string[] = [];
  private listeners: Set<MidiStatusListener> = new Set();
  private onNoteDownCallback: ((note: string, velocity: number) => void) | null = null;
  private onNoteUpCallback: ((note: string) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      this.isSupported = Boolean((navigator as any).requestMIDIAccess);
    }
  }

  async init() {
    if (!this.isSupported) return false;

    try {
      const nav = navigator as any;
      this.midiAccess = await nav.requestMIDIAccess({ sysex: false });

      this.updateDevices();

      this.midiAccess.onstatechange = () => {
        this.updateDevices();
      };

      return true;
    } catch (e) {
      console.warn('Web MIDI not granted or unavailable:', e);
      this.isConnected = false;
      this.notifyListeners();
      return false;
    }
  }

  private updateDevices() {
    if (!this.midiAccess) return;

    const names: string[] = [];
    const inputs = this.midiAccess.inputs.values();

    for (const input of inputs) {
      names.push(input.name || 'Dispositivo MIDI');
      input.onmidimessage = (msg: any) => this.handleMidiMessage(msg);
    }

    this.deviceNames = names;
    this.isConnected = names.length > 0;
    this.notifyListeners();
  }

  private handleMidiMessage(event: any) {
    const data = event.data;
    if (!data || data.length < 2) return;

    const status = data[0] & 0xf0;
    const noteNumber = data[1];
    const velocity = data.length > 2 ? data[2] : 0;

    // Note On
    if (status === 0x90 && velocity > 0) {
      const noteName = midiNumberToNoteName(noteNumber);
      if (this.onNoteDownCallback) {
        this.onNoteDownCallback(noteName, velocity);
      }
      window.dispatchEvent(
        new CustomEvent('piano:midinotedown', { detail: { note: noteName, velocity } })
      );
    }
    // Note Off
    else if (status === 0x80 || (status === 0x90 && velocity === 0)) {
      const noteName = midiNumberToNoteName(noteNumber);
      if (this.onNoteUpCallback) {
        this.onNoteUpCallback(noteName);
      }
      window.dispatchEvent(
        new CustomEvent('piano:midinoteup', { detail: { note: noteName } })
      );
    }
  }

  onNoteDown(cb: (note: string, velocity: number) => void) {
    this.onNoteDownCallback = cb;
  }

  onNoteUp(cb: (note: string) => void) {
    this.onNoteUpCallback = cb;
  }

  subscribe(listener: MidiStatusListener) {
    this.listeners.add(listener);
    listener({
      isSupported: this.isSupported,
      isConnected: this.isConnected,
      deviceNames: this.deviceNames,
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const status = {
      isSupported: this.isSupported,
      isConnected: this.isConnected,
      deviceNames: this.deviceNames,
    };
    this.listeners.forEach((l) => l(status));
  }

  getStatus() {
    return {
      isSupported: this.isSupported,
      isConnected: this.isConnected,
      deviceNames: this.deviceNames,
    };
  }
}

export const midiEngine = new MidiEngine();
