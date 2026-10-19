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
  const name = NAMES[midiNumber % 12];
  return `${name}${octave}`;
}

// Complete Salamander Grand Piano multi-sample library (Yamaha C5 Concert Grand)
// Every 3 semitones has a dedicated stereo 24/44.1kHz recording
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

interface ActiveSynthVoice {
  note: string;
  oscNodes: OscillatorNode[];
  gainNodes: GainNode[];
  masterGain: GainNode;
  stopTime: number;
}

class AudioEngine {
  private isSustainOn = false;
  private sustainedNotes = new Set<string>();
  private volumePercent = 85;
  private soundProfile: SoundProfile = 'concert';
  private isInitialized = false;

  // Active voice tracker for polyphony management & voice stealing
  private activeVoices = new Map<string, { startTime: number; isHeld: boolean }>();
  private readonly MAX_POLYPHONY = 28;
  private recentBassNotes: { note: string; time: number }[] = [];

  // Tone.js Audio Graph Nodes
  private sampler: Tone.Sampler | null = null;
  private isSamplerLoaded = false;
  private subFilter: Tone.Filter | null = null;
  private equalizer: Tone.EQ3 | null = null;
  private reverb: Tone.Reverb | null = null;
  private limiter: Tone.Limiter | null = null;
  private masterGain: Tone.Gain | null = null;

  // Active synth voices for guitar, strings, bass
  private synthVoices: ActiveSynthVoice[] = [];

  // Tone.js synths for Jam Band drums
  private drumSynth: Tone.MembraneSynth | null = null;
  private hihatSynth: Tone.MetalSynth | null = null;
  private snareSynth: Tone.NoiseSynth | null = null;

  constructor() {
    try {
      const saved = localStorage.getItem('maestro_sound_profile');
      if (saved === 'concert' || saved === 'studio' || saved === 'bright' || saved === 'warm' || saved === 'cathedral') {
        this.soundProfile = saved;
      }
    } catch (e) {}
  }

  async init() {
    if (this.isInitialized && Tone.context.state === 'running') return;

    try {
      await Tone.start();

      const rawCtx = Tone.context.rawContext as AudioContext;
      if (rawCtx && rawCtx.state === 'suspended') {
        await rawCtx.resume();
      }

      // Add auto-recovery listener if browser suspends or interrupts audio
      if (rawCtx) {
        rawCtx.onstatechange = () => {
          if (rawCtx.state === 'suspended' || (rawCtx.state as any) === 'interrupted') {
            rawCtx.resume().catch(() => {});
          }
        };
      }

      this.buildAudioGraph();
      this.initSampler();
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
      // 1. Subsonic High-Pass Filter: Cuts out DC offset & sub-24Hz thumps (prevents speaker popping & distortion)
      this.subFilter = new Tone.Filter({
        frequency: 24,
        type: "highpass",
        rolloff: -12,
      });

      // 2. High-Fidelity Acoustic Equalizer: Tuned for real Yamaha C5 Concert Grand
      this.equalizer = new Tone.EQ3({
        low: 1.8,     // Rich, warm wooden soundboard body
        mid: 0.0,     // Clear, uncolored natural acoustic midrange
        high: 0.8,    // Silky hammer-felt and copper-string shimmer
        lowFrequency: 140,
        highFrequency: 5500,
      });

      // 3. Luxury Concert Hall Convolution / Algorithmic Reverb
      this.reverb = new Tone.Reverb({
        decay: this.soundProfile === 'cathedral' ? 4.5 : this.soundProfile === 'studio' ? 1.0 : 2.2,
        preDelay: 0.015,
        wet: this.soundProfile === 'studio' ? 0.08 : this.soundProfile === 'cathedral' ? 0.40 : 0.16,
      });

      // 4. Studio Brickwall Peak Limiter (-0.5 dBFS) - 100% transparent, prevents ANY digital clipping during glissandos
      this.limiter = new Tone.Limiter(-0.5);

      // 5. Master Output Gain
      this.masterGain = new Tone.Gain(1.0);

      // Connect Chain: subFilter -> equalizer -> reverb -> limiter -> masterGain -> Tone.Destination
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
        release: 1.4,
        attack: 0.0,
        onload: () => {
          this.isSamplerLoaded = true;
        },
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
        this.equalizer.low.value = 1.8;
        this.equalizer.mid.value = 0.0;
        this.equalizer.high.value = 0.8;
        this.reverb.decay = 2.2;
        this.reverb.wet.value = 0.16;
        break;
      case 'studio':
        this.equalizer.low.value = 1.2;
        this.equalizer.mid.value = 0.4;
        this.equalizer.high.value = 0.2;
        this.reverb.decay = 1.0;
        this.reverb.wet.value = 0.08;
        break;
      case 'bright':
        this.equalizer.low.value = 0.8;
        this.equalizer.mid.value = 0.6;
        this.equalizer.high.value = 2.2;
        this.reverb.decay = 1.8;
        this.reverb.wet.value = 0.18;
        break;
      case 'warm':
        this.equalizer.low.value = 2.8;
        this.equalizer.mid.value = 0.2;
        this.equalizer.high.value = -0.8;
        this.reverb.decay = 2.4;
        this.reverb.wet.value = 0.18;
        break;
      case 'cathedral':
        this.equalizer.low.value = 1.5;
        this.equalizer.mid.value = -0.5;
        this.equalizer.high.value = 1.0;
        this.reverb.decay = 4.5;
        this.reverb.wet.value = 0.38;
        break;
    }
  }

  private applyVolumeToGain() {
    const normalized = Math.max(0, Math.min(100, this.volumePercent)) / 100;
    const gainValue = normalized === 0 ? 0 : Math.pow(normalized, 1.2);

    if (this.masterGain) {
      this.masterGain.gain.rampTo(gainValue, 0.02);
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

  /**
   * Fletcher-Munson equal-loudness velocity compensation across 88 keys:
   * - Deep Bass (MIDI 21 - 45): full rich body without distortion (0.95 -> 0.88)
   * - Mid Range (MIDI 46 - 72): standard natural acoustic velocity (0.82 -> 0.76)
   * - High Treble (MIDI 73 - 108): softened so it is never shrill or overpowered (0.70 -> 0.58)
   */
  private calculateAcousticVelocity(midi: number): number {
    if (midi <= 45) {
      // Bass: 0.95 down to 0.88
      return 0.95 - ((midi - 21) / 24) * 0.07;
    } else if (midi <= 72) {
      // Mid: 0.88 down to 0.76
      return 0.88 - ((midi - 46) / 26) * 0.12;
    } else {
      // Treble: 0.74 down to 0.58 (smooth, pleasant high-end)
      return Math.max(0.55, 0.74 - ((midi - 73) / 35) * 0.16);
    }
  }

  /**
   * Plays a single note with concert-grand acoustic realism
   */
  playNote(note: string, duration: string = "8n", instrument: InstrumentType = "piano", isInteractive: boolean = true) {
    this.ensureAudioContextRunning();

    const midi = NOTE_TO_MIDI[note] ?? 60;
    const now = Tone.now();
    const vel = this.calculateAcousticVelocity(midi);

    // 1. Acoustic Grand Piano (Yamaha C5 Concert Grand via Tone.Sampler)
    if (instrument === "piano") {
      if (!this.sampler) {
        this.initSampler();
      }

      // Bass glissando dampening: if fast sliding across low keys without sustain pedal,
      // prune older bass notes so low frequencies don't accumulate into rumble
      if (midi < 48) {
        const nowMs = Date.now();
        if (!this.isSustainOn) {
          this.recentBassNotes = this.recentBassNotes.filter((b) => {
            const isOld = nowMs - b.time > 140;
            if (!isOld && b.note !== note) {
              if (this.sampler) {
                try { this.sampler.triggerRelease([b.note]); } catch (e) {}
              }
            }
            return !isOld;
          });
        }
        this.recentBassNotes.push({ note, time: nowMs });
      }

      // Voice Stealing / Polyphony management (cap at MAX_POLYPHONY voices)
      if (this.activeVoices.size >= this.MAX_POLYPHONY) {
        // Find oldest voice that is no longer physically held down by finger
        let stolenNote: string | null = null;
        let oldestTime = Infinity;

        for (const [vNote, info] of this.activeVoices.entries()) {
          if (!info.isHeld && info.startTime < oldestTime) {
            oldestTime = info.startTime;
            stolenNote = vNote;
          }
        }

        // If all are currently held, steal the oldest note overall
        if (!stolenNote) {
          for (const [vNote, info] of this.activeVoices.entries()) {
            if (info.startTime < oldestTime) {
              oldestTime = info.startTime;
              stolenNote = vNote;
            }
          }
        }

        if (stolenNote && this.sampler) {
          try {
            this.sampler.triggerRelease([stolenNote]);
          } catch (e) {}
          this.activeVoices.delete(stolenNote);
        }
      }

      this.activeVoices.set(note, { startTime: Date.now(), isHeld: true });

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
        } catch (e) {
          console.warn("Sampler trigger error:", e);
        }
      }
    }

    // 2. High-Performance Synth Modeling for other instruments (Guitar, Strings, Bass)
    this.playSynthNote(note, duration, instrument);
  }

  private playSynthNote(note: string, duration: string, instrument: InstrumentType) {
    try {
      const rawCtx = Tone.context.rawContext as AudioContext;
      if (!rawCtx) return;
      const now = rawCtx.currentTime;
      const freq = noteToFreq(note);

      // Clean up excess synth voices (max 16 voices)
      while (this.synthVoices.length >= 16) {
        const oldest = this.synthVoices.shift();
        if (oldest) {
          try {
            oldest.masterGain.gain.setValueAtTime(0, now);
            oldest.oscNodes.forEach(o => { try { o.stop(now); o.disconnect(); } catch (e) {} });
            oldest.gainNodes.forEach(g => { try { g.disconnect(); } catch (e) {} });
            oldest.masterGain.disconnect();
          } catch (e) {}
        }
      }

      const voiceMasterGain = rawCtx.createGain();
      const oscNodes: OscillatorNode[] = [];
      const gainNodes: GainNode[] = [];
      const durSec = duration === '2n' ? 2.5 : duration === '4n' ? 1.4 : 0.6;

      if (instrument === "guitar") {
        const osc1 = rawCtx.createOscillator();
        osc1.type = "sawtooth";
        osc1.frequency.setValueAtTime(freq, now);

        const osc2 = rawCtx.createOscillator();
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(freq, now);

        const filter = rawCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(freq * 5.2, now);
        filter.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 1.5), now + 0.25);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(voiceMasterGain);
        oscNodes.push(osc1, osc2);

        voiceMasterGain.gain.setValueAtTime(0.0001, now);
        voiceMasterGain.gain.linearRampToValueAtTime(0.75, now + 0.005);
        voiceMasterGain.gain.exponentialRampToValueAtTime(0.0001, now + durSec);

      } else if (instrument === "strings") {
        const osc1 = rawCtx.createOscillator();
        osc1.type = "sawtooth";
        osc1.frequency.setValueAtTime(freq, now);

        const osc2 = rawCtx.createOscillator();
        osc2.type = "sawtooth";
        osc2.frequency.setValueAtTime(freq, now);
        osc2.detune.setValueAtTime(8, now);

        const filter = rawCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(2200, now);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(voiceMasterGain);
        oscNodes.push(osc1, osc2);

        voiceMasterGain.gain.setValueAtTime(0.0001, now);
        voiceMasterGain.gain.linearRampToValueAtTime(0.70, now + 0.06);
        voiceMasterGain.gain.exponentialRampToValueAtTime(0.0001, now + durSec);

      } else if (instrument === "bass") {
        const osc = rawCtx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq / 2, now);

        const sub = rawCtx.createOscillator();
        sub.type = "sine";
        sub.frequency.setValueAtTime(freq / 2, now);

        osc.connect(voiceMasterGain);
        sub.connect(voiceMasterGain);
        oscNodes.push(osc, sub);

        voiceMasterGain.gain.setValueAtTime(0.0001, now);
        voiceMasterGain.gain.linearRampToValueAtTime(0.85, now + 0.005);
        voiceMasterGain.gain.exponentialRampToValueAtTime(0.0001, now + durSec);
      } else {
        // Fallback piano synth
        const osc = rawCtx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now);

        osc.connect(voiceMasterGain);
        oscNodes.push(osc);

        voiceMasterGain.gain.setValueAtTime(0.0001, now);
        voiceMasterGain.gain.linearRampToValueAtTime(0.80, now + 0.003);
        voiceMasterGain.gain.exponentialRampToValueAtTime(0.0001, now + durSec);
      }

      // Connect to master chain or destination
      if (this.subFilter) {
        Tone.connect(voiceMasterGain, this.subFilter);
      } else {
        voiceMasterGain.connect(rawCtx.destination);
      }

      const stopTime = now + durSec + 0.05;
      oscNodes.forEach(o => {
        try {
          o.start(now);
          o.stop(stopTime);
        } catch (e) {}
      });

      const voiceObj: ActiveSynthVoice = {
        note,
        oscNodes,
        gainNodes,
        masterGain: voiceMasterGain,
        stopTime,
      };
      this.synthVoices.push(voiceObj);

      oscNodes[0].onended = () => {
        const idx = this.synthVoices.indexOf(voiceObj);
        if (idx !== -1) this.synthVoices.splice(idx, 1);
        try {
          oscNodes.forEach(o => o.disconnect());
          gainNodes.forEach(g => g.disconnect());
          voiceMasterGain.disconnect();
        } catch (e) {}
      };
    } catch (e) {
      console.warn("Synth play error:", e);
    }
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
      // Sustain released: damp all sustained notes
      if (this.sustainedNotes.size > 0) {
        const notesToRelease = Array.from(this.sustainedNotes);
        if (this.sampler) {
          try {
            this.sampler.triggerRelease(notesToRelease);
          } catch (e) {}
        }
        this.sustainedNotes.forEach((n) => {
          this.releaseSynthVoice(n);
        });
        this.sustainedNotes.clear();
      }
    }
  }

  /**
   * Called when a key is physically released (finger lifted from screen or keyup)
   */
  releaseNote(note: string) {
    const voiceInfo = this.activeVoices.get(note);
    if (voiceInfo) {
      voiceInfo.isHeld = false;
    }

    if (this.isSustainOn) {
      // Pedal is held down: keep sound ringing until pedal lifts
      this.sustainedNotes.add(note);
      return;
    }

    this.releaseNoteForce(note);
  }

  /**
   * Immediately releases/damps a note with natural acoustic damper decay
   */
  releaseNoteForce(note: string) {
    this.activeVoices.delete(note);

    if (this.sampler) {
      try {
        this.sampler.triggerRelease([note]);
      } catch (e) {}
    }

    this.releaseSynthVoice(note);
  }

  private releaseSynthVoice(note: string) {
    try {
      const rawCtx = Tone.context.rawContext as AudioContext;
      if (!rawCtx) return;
      const now = rawCtx.currentTime;

      this.synthVoices.forEach((v) => {
        if (v.note === note) {
          try {
            v.masterGain.gain.cancelScheduledValues(now);
            const cur = Math.max(0.0001, v.masterGain.gain.value);
            v.masterGain.gain.setValueAtTime(cur, now);
            v.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.08);
            v.oscNodes.forEach(o => {
              try { o.stop(now + 0.09); } catch (e) {}
            });
          } catch (e) {}
        }
      });
    } catch (e) {}
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
