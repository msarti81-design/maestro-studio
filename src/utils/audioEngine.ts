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
  private reverb: Tone.Freeverb | null = null;
  private masterGain: Tone.Gain | null = null;
  private masterCompressor: Tone.Compressor | null = null;
  private masterLimiter: Tone.Limiter | null = null;

  // Jam Band drums
  private drumSynth: Tone.MembraneSynth | null = null;
  private hihatSynth: Tone.MetalSynth | null = null;
  private snareSynth: Tone.NoiseSynth | null = null;

  // Active voice tracker for strict polyphony & voice stealing (prevents audio freeze, crackling & overload during fast glissando)
  // Max 4 simultaneous voices in flight prevents audio quantum starvation and scratchy summing distortion
  private readonly MAX_VOICES = 5;
  private activeVoices: { note: string; time: number }[] = [];
  private autoReleasedNotes = new Map<string, number>();
  private noteLastTriggerTime = new Map<string, number>();
  private lastAnyNoteTime = 0;
  private lastBassNote: string | null = null;
  private noteSafetyTimers = new Map<string, any>();

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

      // Keep-alive watchdog: periodically verifies AudioContext state and revives if suspended
      setInterval(() => {
        try {
          const rawCtx = Tone.context.rawContext as AudioContext;
          if (rawCtx && (rawCtx.state === 'suspended' || (rawCtx.state as any) === 'interrupted')) {
            rawCtx.resume().catch(() => {});
          }
          const now = performance.now();
          for (const [k, exp] of this.autoReleasedNotes.entries()) {
            if (now > exp) {
              this.autoReleasedNotes.delete(k);
            }
          }
        } catch (e) {}
      }, 2000);

      // Expose sequential glissando test to window for manual testing in DevTools console
      (window as any).testPianoSequence = (stepMs = 35, count = 36) => {
        return this.testSequentialGlissando(stepMs, count);
      };
    }
  }

  async init(): Promise<void> {
    if (this.isInitialized && Tone.context.state === 'running') return;

    try {
      Tone.context.lookAhead = 0.05; // 50ms buffer lookahead avoids audio thread starvation in WebView
      await Tone.start();

      const rawCtx = Tone.context.rawContext as AudioContext;
      if (rawCtx && rawCtx.state === 'suspended') {
        await rawCtx.resume();
      }

      if (rawCtx) {
        rawCtx.onstatechange = () => {
          if (rawCtx.state !== 'running' && rawCtx.state !== 'closed') {
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
      // 1. High-Pass Filter at 35Hz to eliminate sub-bass mud, speaker excursion, and crackle on fast low notes
      this.subFilter = new Tone.Filter({
        frequency: 35,
        type: "highpass",
        rolloff: -12,
      });

      // 2. Professional Mastering Chain for high loudness without clipping or distortion
      this.masterCompressor = new Tone.Compressor({
        threshold: -20,
        ratio: 5,
        attack: 0.005,
        release: 0.20,
      });

      this.masterLimiter = new Tone.Limiter(-0.2);

      this.masterGain = new Tone.Gain(2.8);

      this.masterGain.connect(this.subFilter);
      this.subFilter.connect(this.masterCompressor);
      this.masterCompressor.connect(this.masterLimiter);
      this.masterLimiter.toDestination();

      this.isInitialized = true;
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
        attack: 0.005,
        release: 0.30,
      });
      // High +6dB volume for loud, clean, crackle-free studio presence
      this.sampler.volume.value = 6;

      if (this.masterGain) {
        this.sampler.connect(this.masterGain);
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
        envelope: { attack: 0.01, decay: 0.4, sustain: 0.05, release: 0.25 },
      });
      this.synthFallback.maxPolyphony = 4;
      this.synthFallback.volume.value = 6;

      if (this.masterGain) {
        this.synthFallback.connect(this.masterGain);
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
      if (Tone.context.state !== 'running') {
        Tone.context.resume().catch(() => {});
      }
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
        this.reverb.roomSize.value = 0.65;
        this.reverb.dampening = 3500;
        this.reverb.wet.value = 0.12;
        break;
      case 'studio':
        this.equalizer.low.value = 0.8;
        this.equalizer.mid.value = 0.4;
        this.equalizer.high.value = 0.3;
        this.reverb.roomSize.value = 0.35;
        this.reverb.dampening = 4500;
        this.reverb.wet.value = 0.05;
        break;
      case 'bright':
        this.equalizer.low.value = 0.2;
        this.equalizer.mid.value = 0.5;
        this.equalizer.high.value = 2.2;
        this.reverb.roomSize.value = 0.55;
        this.reverb.dampening = 2500;
        this.reverb.wet.value = 0.12;
        break;
      case 'warm':
        this.equalizer.low.value = 2.2;
        this.equalizer.mid.value = 0.3;
        this.equalizer.high.value = -0.6;
        this.reverb.roomSize.value = 0.70;
        this.reverb.dampening = 3000;
        this.reverb.wet.value = 0.14;
        break;
      case 'cathedral':
        this.equalizer.low.value = 1.2;
        this.equalizer.mid.value = -0.4;
        this.equalizer.high.value = 1.2;
        this.reverb.roomSize.value = 0.85;
        this.reverb.dampening = 2000;
        this.reverb.wet.value = 0.25;
        break;
    }
  }

  private applyVolumeToGain() {
    const normalized = Math.max(0, Math.min(100, this.volumePercent)) / 100;
    const gainValue = normalized === 0 ? 0 : Math.pow(normalized, 0.9) * 0.95;

    if (this.masterGain) {
      this.masterGain.gain.rampTo(gainValue, 0.02);
    }
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
      return 0.88 - ((midi - 21) / 24) * 0.04;
    } else if (midi <= 72) {
      return 0.82 - ((midi - 46) / 26) * 0.08;
    } else {
      return Math.max(0.60, 0.74 - ((midi - 73) / 35) * 0.10);
    }
  }

  /**
   * Plays a note with Tone.Sampler & Strict Voice Stealing (eliminates audio crackling, overload, and crash during fast glissando)
   */
  playNote(note: string, duration: string = "8n", instrument: InstrumentType = "piano", isInteractive: boolean = true) {
    this.ensureAudioContextRunning();

    const nowMs = performance.now();

    // 1. Edge-bounce Debouncing:
    // If the exact same note was triggered < 40ms ago (touch jitter on key boundary), ignore duplicate!
    const lastTrigger = this.noteLastTriggerTime.get(note) || 0;
    if (nowMs - lastTrigger < 40) {
      return;
    }

    // 2. Glissando density control:
    // Swipes faster than 38ms between distinct notes are clamped to prevent audio thread overload and scratching
    const isGlissando = nowMs - this.lastAnyNoteTime < 140;
    if (nowMs - this.lastAnyNoteTime < 38) {
      return;
    }

    this.noteLastTriggerTime.set(note, nowMs);
    this.lastAnyNoteTime = nowMs;

    const midi = NOTE_TO_MIDI[note] ?? 60;
    const audioNow = Tone.now();
    let vel = this.calculateAcousticVelocity(midi);

    // Dynamic glissando velocity scaling:
    // When sweeping fast across keys, scale velocity to 0.38-0.52 for a sparkling, delicate concert touch
    // that never overloads the summing bus!
    if (isGlissando) {
      vel = Math.max(0.38, Math.min(0.52, vel * 0.60));
    }

    if (instrument === "piano") {
      if (!this.sampler) {
        this.initSampler();
      }

      // Bass register optimization (< 48 MIDI): immediately release prior bass note so heavy bass samples don't pile up
      if (midi < 48 && !this.isSustainOn) {
        if (this.lastBassNote && this.lastBassNote !== note) {
          try {
            this.sampler?.triggerRelease([this.lastBassNote], audioNow);
            this.synthFallback?.triggerRelease([this.lastBassNote], audioNow);
          } catch (e) {}
        }
        this.lastBassNote = note;
      }

      // Strict Voice Stealing: Cap active playing voices to MAX_VOICES (6)
      // When threshold is reached, smoothly steal the oldest voice with a 40ms micro-fade
      if (!this.isSustainOn) {
        while (this.activeVoices.length >= this.MAX_VOICES) {
          const oldest = this.activeVoices.shift();
          if (oldest && oldest.note !== note) {
            try {
              this.sampler?.triggerRelease([oldest.note], audioNow + 0.04);
              this.synthFallback?.triggerRelease([oldest.note], audioNow + 0.04);
            } catch (e) {}
          }
        }
        this.activeVoices.push({ note, time: nowMs });
      }

      if (this.sampler) {
        try {
          if (this.isSustainOn) {
            // Cap maximum sustained voices to 12 to prevent Web Audio memory overload
            if (this.sustainedNotes.size >= 12) {
              const oldestSustained = this.sustainedNotes.values().next().value;
              if (oldestSustained) {
                this.sustainedNotes.delete(oldestSustained);
                try { this.sampler.triggerRelease([oldestSustained], audioNow + 0.04); } catch (e) {}
              }
            }
            this.sampler.triggerAttack(note, audioNow, vel);
            this.sustainedNotes.add(note);
          } else if (isInteractive) {
            if (isGlissando) {
              // Rapid swipe across keys: trigger with natural musical decay (0.28s)
              // and suppress manual release for 600ms so subsequent touch-up events do NOT double-trigger release
              this.autoReleasedNotes.set(note, performance.now() + 600);
              this.sampler.triggerAttackRelease(note, 0.28, audioNow, vel);
            } else {
              this.sampler.triggerAttack(note, audioNow, vel);
            }

            // Safety timeout: prevent any single note from droning forever if touchup/touchend was dropped
            const oldTimer = this.noteSafetyTimers.get(note);
            if (oldTimer) clearTimeout(oldTimer);
            const safetyTimer = setTimeout(() => {
              if (!this.isSustainOn) {
                this.releaseNote(note);
              }
            }, 3000);
            this.noteSafetyTimers.set(note, safetyTimer);
          } else {
            this.sampler.triggerAttackRelease(note, duration, audioNow, vel);
          }
          return;
        } catch (e) {}
      }

      // Fallback synth if sampler not ready
      if (this.synthFallback) {
        try {
          this.synthFallback.triggerAttackRelease(note, duration, audioNow, vel);
        } catch (e) {}
      }
    } else {
      this.playSynthNote(note, duration, instrument);
    }
  }

  private playSynthNote(note: string, duration: string, instrument: InstrumentType) {
    try {
      if (!this.synthFallback) {
        this.initSynthFallback();
      }
      const now = Tone.now();
      this.synthFallback?.triggerAttackRelease(note, duration, now, 0.6);
    } catch (e) {}
  }

  playChord(notes: string[], duration: string = "2n", instrument: InstrumentType = "piano") {
    // Non-interactive chords MUST trigger attack & release so notes do not stay on forever!
    notes.forEach((n) => this.playNote(n, duration, instrument, false));
  }

  playDrum(type: string, time: number = 0) {
    this.ensureAudioContextRunning();
    try {
      if (type === "kick" && this.drumSynth) {
        this.drumSynth.triggerAttackRelease("C1", "8n", Tone.now() + time);
      } else if (type === "snare" && this.snareSynth) {
        this.snareSynth.triggerAttackRelease("8n", Tone.now() + time);
      } else if (type === "hihat" && this.hihatSynth) {
        this.hihatSynth.triggerAttackRelease("32n", Tone.now() + time, 0.35);
      }
    } catch (e) {}
  }

  setSustain(sustain: boolean) {
    this.isSustainOn = sustain;
    if (!sustain) {
      this.noteSafetyTimers.forEach((t) => clearTimeout(t));
      this.noteSafetyTimers.clear();

      if (this.sustainedNotes.size > 0) {
        const notesToRelease = Array.from(this.sustainedNotes);
        const audioNow = Tone.now();
        if (this.sampler) {
          try {
            this.sampler.triggerRelease(notesToRelease, audioNow);
          } catch (e) {}
        }
        this.sustainedNotes.clear();
      }
      this.activeVoices = [];
    }
  }

  releaseNote(note: string) {
    const timer = this.noteSafetyTimers.get(note);
    if (timer) {
      clearTimeout(timer);
      this.noteSafetyTimers.delete(note);
    }

    // 1. If this note was played during a fast glissando with triggerAttackRelease,
    // its acoustic decay is already scheduled smoothly by Tone.js!
    // Do NOT call triggerRelease again: double-scheduling creates GainNode ramp collisions and crackling!
    const suppressUntil = this.autoReleasedNotes.get(note);
    if (suppressUntil && performance.now() < suppressUntil) {
      return;
    }

    if (this.isSustainOn) {
      this.sustainedNotes.add(note);
      if (this.sustainedNotes.size > 12) {
        const oldestSustained = this.sustainedNotes.values().next().value;
        if (oldestSustained) {
          this.sustainedNotes.delete(oldestSustained);
          try { this.sampler?.triggerRelease([oldestSustained]); } catch (e) {}
        }
      }
      return;
    }

    this.activeVoices = this.activeVoices.filter((v) => v.note !== note);

    // 2. For deliberate held keys, apply a smooth 40ms release fade to eliminate any zero-crossing pop
    const audioNow = Tone.now();
    const releaseTime = audioNow + 0.04;

    if (this.sampler) {
      try {
        this.sampler.triggerRelease([note], releaseTime);
      } catch (e) {}
    }
    if (this.synthFallback) {
      try {
        this.synthFallback.triggerRelease([note], releaseTime);
      } catch (e) {}
    }
  }

  releaseNoteForce(note: string) {
    const timer = this.noteSafetyTimers.get(note);
    if (timer) {
      clearTimeout(timer);
      this.noteSafetyTimers.delete(note);
    }

    this.activeVoices = this.activeVoices.filter((v) => v.note !== note);
    const audioNow = Tone.now();
    if (this.sampler) {
      try {
        this.sampler.triggerRelease([note], audioNow);
      } catch (e) {}
    }
    if (this.synthFallback) {
      try {
        this.synthFallback.triggerRelease([note], audioNow);
      } catch (e) {}
    }
  }

  /**
   * Tests playing a rapid chromatic sequence (glissando sweep up and down)
   * to verify that sequential note playback is crystal-clear, crackle-free, and stable.
   */
  async testSequentialGlissando(stepMs = 35, noteCount = 36): Promise<{ ok: boolean; notesPlayed: number; errors: number; finalState: string }> {
    await this.init();
    this.ensureAudioContextRunning();

    const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const notes: string[] = [];
    for (let oct = 4; oct <= 5; oct++) {
      for (const n of chromaticScale) notes.push(`${n}${oct}`);
    }
    notes.push('C6');
    const fullSequence = [...notes, ...notes.slice().reverse().slice(1)].slice(0, noteCount);

    let played = 0;
    let errors = 0;

    for (const n of fullSequence) {
      try {
        this.playNote(n, '8n', 'piano', false);
        played++;
      } catch (e) {
        errors++;
      }
      await new Promise((res) => setTimeout(res, stepMs));
    }

    const rawCtx = Tone.context.rawContext as AudioContext;
    const finalState = rawCtx ? rawCtx.state : Tone.context.state;

    return {
      ok: errors === 0 && finalState === 'running',
      notesPlayed: played,
      errors,
      finalState,
    };
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
