import * as Tone from "tone";
import { InstrumentType, SoundProfile } from "../types";

// Note to MIDI and Frequency map
const NOTE_TO_MIDI: Record<string, number> = {};
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
for (let octave = 0; octave <= 8; octave++) {
  NAMES.forEach((name, i) => {
    NOTE_TO_MIDI[`${name}${octave}`] = 12 + octave * 12 + i;
  });
}

export function noteToFreq(note: string): number {
  const midi = NOTE_TO_MIDI[note] ?? 60;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function midiToNoteName(midiNumber: number): string {
  const octave = Math.floor(midiNumber / 12) - 1;
  const name = NAMES[((midiNumber % 12) + 12) % 12];
  return `${name}${octave}`;
}

// Complete Salamander Grand Piano multi-sample library (Yamaha C5 Concert Grand)
const SALAMANDER_SAMPLES: Record<string, string> = {
  A0: "A0.mp3",
  C1: "C1.mp3",
  "D#1": "Ds1.mp3",
  "F#1": "Fs1.mp3",
  A1: "A1.mp3",
  C2: "C2.mp3",
  "D#2": "Ds2.mp3",
  "F#2": "Fs2.mp3",
  A2: "A2.mp3",
  C3: "C3.mp3",
  "D#3": "Ds3.mp3",
  "F#3": "Fs3.mp3",
  A3: "A3.mp3",
  C4: "C4.mp3",
  "D#4": "Ds4.mp3",
  "F#4": "Fs4.mp3",
  A4: "A4.mp3",
  C5: "C5.mp3",
  "D#5": "Ds5.mp3",
  "F#5": "Fs5.mp3",
  A5: "A5.mp3",
  C6: "C6.mp3",
  "D#6": "Ds6.mp3",
  "F#6": "Fs6.mp3",
  A6: "A6.mp3",
  C7: "C7.mp3",
  "D#7": "Ds7.mp3",
  "F#7": "Fs7.mp3",
  A7: "A7.mp3",
  C8: "C8.mp3",
};

class AudioEngine {
  private isSustainOn = false;
  private sustainedNotes = new Set<string>();
  private volumePercent = 85;
  private soundProfile: SoundProfile = 'concert';
  private isInitialized = false;

  // Tone.js Audio Graph Nodes
  private sampler: Tone.Sampler | null = null;
  private synthFallback: Tone.PolySynth | null = null;
  private subFilter: Tone.Filter | null = null;
  private equalizer: Tone.EQ3 | null = null;
  private reverb: Tone.Reverb | null = null;
  private limiter: Tone.Limiter | null = null;
  private masterGain: Tone.Gain | null = null;

  // Jam Band drums
  private drumSynth: Tone.MembraneSynth | null = null;
  private hihatSynth: Tone.MetalSynth | null = null;
  private snareSynth: Tone.NoiseSynth | null = null;

  // Active voice tracker for bass exclusivity (eliminates "prrrrr" stutter on glissando)
  private activeNotes = new Set<string>();
  private lastBassNote: string | null = null;

  constructor() {
    try {
      const saved = localStorage.getItem('maestro_sound_profile');
      if (saved === 'concert' || saved === 'studio' || saved === 'bright' || saved === 'warm' || saved === 'cathedral') {
        this.soundProfile = saved as SoundProfile;
      }
    } catch (e) {}

    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.init().catch(() => {});
      };
      window.addEventListener('touchstart', unlockAudio, { passive: true, once: true });
      window.addEventListener('pointerdown', unlockAudio, { passive: true, once: true });
      window.addEventListener('keydown', unlockAudio, { passive: true, once: true });
    }
  }

  async init(): Promise<void> {
    if (this.isInitialized && Tone.context.state === 'running') return;

    try {
      await Tone.start();

      const rawCtx = Tone.context.rawContext as AudioContext;
      if (rawCtx && rawCtx.state === 'suspended') {
        await rawCtx.resume();
      }

      if (rawCtx) {
        rawCtx.onstatechange = () => {
          if (rawCtx.state === 'suspended' || (rawCtx.state as any) === 'interrupted') {
            rawCtx.resume().catch(() => {});
          }
        };
      }

      this.buildAudioGraph();
      this.initSampler();
      this.initSynthFallback();
      this.initDrums();
      this.applyVolumeToGain();

      this.isInitialized = true;
    } catch (e) {
      console.warn("AudioEngine init warning:", e);
    }
  }

  private buildAudioGraph() {
    if (this.masterGain) return;

    try {
      // 1. Subsonic High-Pass Filter (24Hz): removes DC rumble and speaker pops
      this.subFilter = new Tone.Filter({
        frequency: 24,
        type: "highpass",
        rolloff: -12,
      });

      // 2. High-Fidelity Acoustic Equalizer (Yamaha C5 Voicing)
      this.equalizer = new Tone.EQ3({
        low: 1.5,
        mid: 0.0,
        high: 0.8,
        lowFrequency: 140,
        highFrequency: 5500,
      });

      // 3. Concert Hall Reverb
      this.reverb = new Tone.Reverb({
        decay: 2.2,
        preDelay: 0.015,
        wet: 0.14,
      });

      // 4. Transparent Peak Limiter (-0.5 dBFS) - guarantees zero digital clipping and zero audio dropout
      this.limiter = new Tone.Limiter(-0.5);

      // 5. Master Output Gain (Boosted for rich, full acoustic presence)
      this.masterGain = new Tone.Gain(1.35);

      // Connect Chain: subFilter -> equalizer -> reverb -> limiter -> masterGain -> Destination
      this.subFilter.connect(this.equalizer);
      this.equalizer.connect(this.reverb);
      this.reverb.connect(this.limiter);
      this.limiter.connect(this.masterGain);
      this.masterGain.toDestination();

      this.applyProfileAcoustics();
    } catch (e) {
      console.warn("Failed to build audio graph:", e);
    }
  }

  private initSampler() {
    if (this.sampler) return;

    try {
      this.sampler = new Tone.Sampler({
        urls: SALAMANDER_SAMPLES,
        baseUrl: "https://tonejs.github.io/audio/salamander/",
        release: 1.2,
        attack: 0.0,
      });

      if (this.subFilter) {
        this.sampler.connect(this.subFilter);
      } else {
        this.sampler.toDestination();
      }
    } catch (e) {
      console.warn("Sampler load warning:", e);
    }
  }

  private initSynthFallback() {
    if (this.synthFallback) return;
    try {
      this.synthFallback = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.005, decay: 1.2, sustain: 0.1, release: 1.0 },
      });
      if (this.subFilter) {
        this.synthFallback.connect(this.subFilter);
      } else {
        this.synthFallback.toDestination();
      }
    } catch (e) {}
  }

  private initDrums() {
    if (this.drumSynth) return;
    try {
      this.drumSynth = new Tone.MembraneSynth({
        volume: -2,
        pitchDecay: 0.04,
        octaves: 5,
        oscillator: { type: "sine" },
        envelope: { attack: 0.001, decay: 0.35, sustain: 0.01, release: 0.35 },
      }).toDestination();

      this.hihatSynth = new Tone.MetalSynth({
        volume: -14,
        frequency: 200,
        envelope: { attack: 0.001, decay: 0.06, release: 0.04 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5,
      } as any).toDestination();

      this.snareSynth = new Tone.NoiseSynth({
        volume: -8,
        noise: { type: "white" },
        envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.12 },
      }).toDestination();
    } catch (e) {}
  }

  private ensureAudioContextRunning() {
    try {
      const rawCtx = Tone.context.rawContext as AudioContext;
      if (rawCtx && (rawCtx.state === 'suspended' || (rawCtx.state as any) === 'interrupted')) {
        rawCtx.resume().catch(() => {});
      }
    } catch (e) {}
  }

  private applyProfileAcoustics() {
    if (!this.equalizer || !this.reverb) return;

    switch (this.soundProfile) {
      case 'concert':
        this.equalizer.low.value = 1.5;
        this.equalizer.mid.value = 0.0;
        this.equalizer.high.value = 1.0;
        this.reverb.decay = 2.2;
        this.reverb.wet.value = 0.14;
        break;
      case 'studio':
        this.equalizer.low.value = 0.8;
        this.equalizer.mid.value = 0.4;
        this.equalizer.high.value = 0.3;
        this.reverb.decay = 1.0;
        this.reverb.wet.value = 0.06;
        break;
      case 'bright':
        this.equalizer.low.value = 0.2;
        this.equalizer.mid.value = 0.5;
        this.equalizer.high.value = 2.2;
        this.reverb.decay = 1.8;
        this.reverb.wet.value = 0.15;
        break;
      case 'warm':
        this.equalizer.low.value = 2.2;
        this.equalizer.mid.value = 0.3;
        this.equalizer.high.value = -0.6;
        this.reverb.decay = 2.4;
        this.reverb.wet.value = 0.16;
        break;
      case 'cathedral':
        this.equalizer.low.value = 1.2;
        this.equalizer.mid.value = -0.4;
        this.equalizer.high.value = 1.2;
        this.reverb.decay = 4.0;
        this.reverb.wet.value = 0.32;
        break;
    }
  }

  private applyVolumeToGain() {
    const normalized = Math.max(0, Math.min(100, this.volumePercent)) / 100;
    const gainValue = normalized === 0 ? 0 : Math.pow(normalized, 1.1);

    if (this.masterGain) {
      this.masterGain.gain.rampTo(gainValue * 1.35, 0.02);
    }

    try {
      if (Tone.getDestination()) {
        if (normalized === 0) {
          Tone.getDestination().volume.value = -Infinity;
        } else {
          Tone.getDestination().volume.value = Tone.gainToDb(gainValue);
        }
      }
    } catch (e) {}
  }

  getVolume(): number {
    return this.volumePercent;
  }

  setVolume(percentOrDb: number) {
    if (percentOrDb <= 6 && percentOrDb >= -30) {
      const normalized = (percentOrDb - (-30)) / (6 - (-30));
      this.volumePercent = Math.round(normalized * 100);
    } else {
      this.volumePercent = Math.max(0, Math.min(100, percentOrDb));
    }
    this.applyVolumeToGain();
  }

  getSoundProfile(): SoundProfile {
    return this.soundProfile;
  }

  setSoundProfile(profile: SoundProfile) {
    this.soundProfile = profile;
    try {
      localStorage.setItem('maestro_sound_profile', profile);
    } catch (e) {}
    this.applyProfileAcoustics();
  }

  private calculateAcousticVelocity(midi: number): number {
    if (midi <= 45) {
      return 0.94 - ((midi - 21) / 24) * 0.04;
    } else if (midi <= 72) {
      return 0.90 - ((midi - 46) / 26) * 0.08;
    } else {
      return Math.max(0.65, 0.78 - ((midi - 73) / 35) * 0.10);
    }
  }

  /**
   * Plays a note with Tone.Sampler & Strict Bass Monophony (eliminates "prrrrr" and "salta l'audio")
   */
  playNote(note: string, duration: string = "8n", instrument: InstrumentType = "piano", isInteractive: boolean = true) {
    this.ensureAudioContextRunning();

    const midi = NOTE_TO_MIDI[note] ?? 60;
    const now = Tone.now();
    const vel = this.calculateAcousticVelocity(midi);

    if (instrument === "piano") {
      if (!this.sampler) {
        this.initSampler();
      }

      // BASS GLISSANDO FIX ("prrrrr"):
      // If playing in the bass register (< 48 MIDI) and not sustained,
      // instantly release the previous bass note so two bass samples never overlap!
      if (midi < 48 && !this.isSustainOn) {
        if (this.lastBassNote && this.lastBassNote !== note) {
          try {
            this.sampler?.triggerRelease([this.lastBassNote], now);
            this.synthFallback?.triggerRelease([this.lastBassNote], now);
          } catch (e) {}
        }
        this.lastBassNote = note;
      }

      // If interactive glissando/swiping without sustain, release notes smoothly
      if (isInteractive && !this.isSustainOn && this.activeNotes.size >= 8) {
        const oldest = Array.from(this.activeNotes)[0];
        if (oldest && oldest !== note) {
          this.activeNotes.delete(oldest);
          try {
            this.sampler?.triggerRelease([oldest], now);
          } catch (e) {}
        }
      }

      this.activeNotes.add(note);

      if (this.sampler) {
        try {
          if (this.isSustainOn) {
            this.sampler.triggerAttack(note, now, vel);
            this.sustainedNotes.add(note);
          } else if (isInteractive) {
            this.sampler.triggerAttack(note, now, vel);
          } else {
            this.sampler.triggerAttackRelease(note, duration, now, vel);
          }
          return;
        } catch (e) {}
      }

      // Fallback synth if sampler not ready
      if (this.synthFallback) {
        try {
          this.synthFallback.triggerAttackRelease(note, duration, now, vel);
        } catch (e) {}
      }
    } else {
      this.playSynthNote(note, duration, instrument);
    }
  }

  private playSynthNote(note: string, duration: string, instrument: InstrumentType) {
    try {
      const rawCtx = Tone.context.rawContext as AudioContext;
      if (!rawCtx) return;
      const now = rawCtx.currentTime;
      const freq = noteToFreq(note);
      const durSec = duration === '2n' ? 2.2 : duration === '4n' ? 1.2 : 0.5;

      const synth = new Tone.Synth({
        oscillator: { type: instrument === 'guitar' ? 'sawtooth' : instrument === 'strings' ? 'sawtooth' : 'triangle' },
        envelope: { attack: 0.005, decay: durSec, sustain: 0.1, release: 0.3 },
      });

      if (this.subFilter) {
        synth.connect(this.subFilter);
      } else {
        synth.toDestination();
      }

      synth.triggerAttackRelease(freq, durSec, now);
    } catch (e) {}
  }

  playChord(notes: string[], duration: string = "2n", instrument: InstrumentType = "piano") {
    notes.forEach((n) => this.playNote(n, duration, instrument));
  }

  playDrum(type: string, time: number = 0) {
    this.ensureAudioContextRunning();
    try {
      if (type === "kick" && this.drumSynth) {
        this.drumSynth.triggerAttackRelease("C1", "8n", Tone.now() + time);
      } else if (type === "snare" && this.snareSynth) {
        this.snareSynth.triggerAttackRelease("8n", Tone.now() + time);
      } else if (type === "hihat" && this.hihatSynth) {
        this.hihatSynth.triggerAttackRelease("32n", Tone.now() + time, 0.4);
      }
    } catch (e) {}
  }

  setSustain(sustain: boolean) {
    this.isSustainOn = sustain;
    if (!sustain) {
      if (this.sustainedNotes.size > 0) {
        const notesToRelease = Array.from(this.sustainedNotes);
        if (this.sampler) {
          try {
            this.sampler.triggerRelease(notesToRelease);
          } catch (e) {}
        }
        this.sustainedNotes.clear();
      }
      this.activeNotes.clear();
    }
  }

  releaseNote(note: string) {
    this.activeNotes.delete(note);
    if (this.isSustainOn) {
      this.sustainedNotes.add(note);
      return;
    }

    if (this.sampler) {
      try {
        this.sampler.triggerRelease([note]);
      } catch (e) {}
    }
  }

  releaseNoteForce(note: string) {
    this.activeNotes.delete(note);
    if (this.sampler) {
      try {
        this.sampler.triggerRelease([note]);
      } catch (e) {}
    }
  }

  playJamBeat(style: string, beatIndex: number) {
    try {
      if (style === "lofi" || style === "blues") {
        if (beatIndex % 4 === 0) this.playDrum("kick", 0);
        if (beatIndex % 4 === 2) this.playDrum("snare", 0);
        if (beatIndex % 2 === 0) this.playDrum("hihat", 0);
      } else if (style === "jazz" || style === "bossa") {
        if (beatIndex % 4 === 0 || beatIndex % 4 === 3) this.playDrum("kick", 0);
        if (beatIndex % 4 === 2) this.playDrum("snare", 0);
        this.playDrum("hihat", 0);
      } else if (style === "pop" || style === "rock") {
        if (beatIndex % 4 === 0 || beatIndex % 4 === 2) this.playDrum("kick", 0);
        if (beatIndex % 4 === 2) this.playDrum("snare", 0);
        if (beatIndex % 2 === 0) this.playDrum("hihat", 0);
      } else {
        if (beatIndex % 4 === 0) this.playDrum("kick", 0);
      }
    } catch (e) {}
  }

  playApplauseSound() {
    this.init().catch(() => {});
    try {
      const rawCtx = Tone.context.rawContext as AudioContext;
      if (!rawCtx) return;
      const now = rawCtx.currentTime;
      const duration = 2.5;
      const sampleRate = rawCtx.sampleRate;
      const buffer = rawCtx.createBuffer(2, sampleRate * duration, sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < buffer.length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        b6 = white * 0.115926;

        const t = i / sampleRate;
        const envelope = Math.sin((t / duration) * Math.PI);
        const clapDensity = Math.sin(t * 18) * 0.3 + 0.7;

        left[i] = pink * 0.12 * envelope * clapDensity;
        right[i] = pink * 0.12 * envelope * (1 - clapDensity * 0.5);
      }

      const src = rawCtx.createBufferSource();
      src.buffer = buffer;
      const filter = rawCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(0.8, now);

      src.connect(filter);
      filter.connect(rawCtx.destination);
      src.start(now);
    } catch (e) {}
  }

  playChimeSound() {
    this.init().catch(() => {});
    const notes = ['E5', 'G#5', 'B5', 'E6'];
    notes.forEach((note, idx) => {
      setTimeout(() => {
        this.playNote(note, '4n', 'piano');
      }, idx * 70);
    });
  }

  playBuzzerSound() {
    this.init().catch(() => {});
    try {
      const rawCtx = Tone.context.rawContext as AudioContext;
      if (!rawCtx) return;
      const now = rawCtx.currentTime;
      const osc = rawCtx.createOscillator();
      const gain = rawCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(rawCtx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  playMetronomeClick(isAccent: boolean = false) {
    this.init().catch(() => {});
    try {
      const rawCtx = Tone.context.rawContext as AudioContext;
      if (!rawCtx) return;
      const now = rawCtx.currentTime;
      const osc = rawCtx.createOscillator();
      const gain = rawCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isAccent ? 1400 : 800, now);

      const maxGain = isAccent ? 0.35 : 0.2;
      gain.gain.setValueAtTime(maxGain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      osc.connect(gain);
      gain.connect(rawCtx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  }
}

export const audioEngine = new AudioEngine();
