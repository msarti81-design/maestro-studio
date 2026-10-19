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

function getHarmonicOctaveNote(note: string): string | null {
  const midi = NOTE_TO_MIDI[note];
  if (!midi) return null;
  const harmonicMidi = midi + 12;
  if (harmonicMidi > 108) return null;
  return midiToNoteName(harmonicMidi);
}

interface ActiveVoice {
  note: string;
  oscNodes: (AudioNode | OscillatorNode)[];
  gainNodes: GainNode[];
  masterGain: GainNode;
  endTime: number;
}

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private isSustainOn = false;
  private sustainedNotes = new Set<string>();
  private volumePercent = 85;
  private soundProfile: SoundProfile = 'concert';

  // Master Audio Chain Nodes
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private waveShaperLimiter: WaveShaperNode | null = null;
  private masterEqualizerLow: BiquadFilterNode | null = null;
  private masterEqualizerMid: BiquadFilterNode | null = null;
  private masterEqualizerHigh: BiquadFilterNode | null = null;
  private convolver: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private isInitialized = false;
  private activeVoices: ActiveVoice[] = [];
  private recentBassNotes: { note: string; time: number }[] = [];
  private readonly MAX_VOICES = 64;

  // Real Sampled Acoustic Grand Piano (Tone.Sampler)
  private sampler: Tone.Sampler | null = null;
  private isSamplerLoaded = false;
  private samplerReverb: Tone.Reverb | null = null;

  // Tone.js synths for Jam Band drums
  private drumSynth: Tone.MembraneSynth | null = null;
  private hihatSynth: Tone.MetalSynth | null = null;
  private snareSynth: Tone.NoiseSynth | null = null;

  constructor() {
    try {
      const saved = localStorage.getItem('maestro_sound_profile');
      if (saved === 'concert' || saved === 'studio' || saved === 'bright' || saved === 'cathedral') {
        this.soundProfile = saved;
      }
    } catch (e) {}
  }

  async init() {
    if (this.isInitialized && this.audioCtx && this.audioCtx.state === 'running') return;

    try {
      this.ensureContext();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      // 1. Initialize Tone.js
      try {
        await Tone.start();

        // Sync initial volume to Tone.Destination
        this.applyVolumeToGain();

        // Initialize Real Acoustic Grand Piano Sampler
        if (!this.sampler) {
          this.initSampler();
        }

        // Initialize Drum synths
        if (!this.drumSynth) {
          this.drumSynth = new Tone.MembraneSynth({
            volume: -2,
            pitchDecay: 0.04,
            octaves: 5,
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.35, sustain: 0.01, release: 0.35 },
          }).toDestination();

          this.hihatSynth = new Tone.MetalSynth({
            volume: -12,
            frequency: 200,
            envelope: { attack: 0.001, decay: 0.06, release: 0.04 },
            harmonicity: 5.1,
            modulationIndex: 32,
            resonance: 4000,
            octaves: 1.5,
          } as any).toDestination();

          this.snareSynth = new Tone.NoiseSynth({
            volume: -6,
            noise: { type: "white" },
            envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.12 },
          }).toDestination();
        }
      } catch (e) {
        console.warn("Tone.start error:", e);
      }

      this.isInitialized = true;
    } catch (e) {
      console.error("Failed to initialize Web Audio Engine", e);
    }
  }

  /**
   * Loads high-definition real acoustic grand piano samples asynchronously
   */
  private initSampler() {
    try {
      this.sampler = new Tone.Sampler({
        urls: {
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
        },
        baseUrl: "https://tonejs.github.io/audio/salamander/",
        release: 1.8,
        attack: 0.005,
        onload: () => {
          this.isSamplerLoaded = true;
        },
      });

      this.samplerReverb = new Tone.Reverb({
        decay: this.soundProfile === 'cathedral' ? 4.5 : this.soundProfile === 'studio' ? 1.0 : 2.4,
        preDelay: 0.02,
        wet: this.soundProfile === 'studio' ? 0.12 : 0.28,
      }).toDestination();

      this.sampler.connect(this.samplerReverb);
    } catch (e) {
      console.warn("Sampler load warning:", e);
    }
  }

  /**
   * Generates a stereo impulse response for the Concert Hall Convolution Reverb
   */
  private createStereoConcertHallImpulse(ctx: AudioContext, duration = 2.8, decay = 2.6): AudioBuffer {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    // Early reflection delays (in milliseconds) simulating a 9-foot grand in a luxury hall
    const earlyReflectionsL = [
      { delayMs: 14, gain: 0.72 },
      { delayMs: 24, gain: 0.58 },
      { delayMs: 38, gain: 0.46 },
      { delayMs: 52, gain: 0.35 },
      { delayMs: 78, gain: 0.22 },
    ];
    const earlyReflectionsR = [
      { delayMs: 18, gain: 0.68 },
      { delayMs: 28, gain: 0.52 },
      { delayMs: 44, gain: 0.42 },
      { delayMs: 62, gain: 0.31 },
      { delayMs: 84, gain: 0.18 },
    ];

    // Late diffuse reverberation decay
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const env = Math.pow(1 - t, decay);
      const damping = Math.exp(-t * 2.8);
      left[i] = (Math.random() * 2 - 1) * env * damping * 0.42;
      right[i] = (Math.random() * 2 - 1) * env * damping * 0.42;
    }

    // Inject early reflections into channel buffers
    earlyReflectionsL.forEach(({ delayMs, gain }) => {
      const sampleIdx = Math.floor((delayMs / 1000) * rate);
      if (sampleIdx < length) {
        left[sampleIdx] += gain * 0.5;
      }
    });

    earlyReflectionsR.forEach(({ delayMs, gain }) => {
      const sampleIdx = Math.floor((delayMs / 1000) * rate);
      if (sampleIdx < length) {
        right[sampleIdx] += gain * 0.5;
      }
    });

    return impulse;
  }

  private createSoftLimiterCurve(samples = 2048): Float32Array {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Smooth analog tape saturation curve prevents digital clipping on fast glissandos
      curve[i] = Math.tanh(x * 1.05);
    }
    return curve;
  }

  private ensureContext() {
    try {
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AudioCtxClass({
          latencyHint: 'interactive',
        });

        // 1. Acoustic Soundboard Equalizer (Balanced bass warmth & silky treble)
        this.masterEqualizerLow = this.audioCtx.createBiquadFilter();
        this.masterEqualizerLow.type = 'lowshelf';
        this.masterEqualizerLow.frequency.setValueAtTime(150, this.audioCtx.currentTime);
        this.masterEqualizerLow.gain.setValueAtTime(3.2, this.audioCtx.currentTime);

        this.masterEqualizerMid = this.audioCtx.createBiquadFilter();
        this.masterEqualizerMid.type = 'peaking';
        this.masterEqualizerMid.frequency.setValueAtTime(1000, this.audioCtx.currentTime);
        this.masterEqualizerMid.Q.setValueAtTime(0.9, this.audioCtx.currentTime);
        this.masterEqualizerMid.gain.setValueAtTime(1.0, this.audioCtx.currentTime);

        this.masterEqualizerHigh = this.audioCtx.createBiquadFilter();
        this.masterEqualizerHigh.type = 'highshelf';
        this.masterEqualizerHigh.frequency.setValueAtTime(5500, this.audioCtx.currentTime);
        this.masterEqualizerHigh.gain.setValueAtTime(0.5, this.audioCtx.currentTime);

        // 2. Convolution Reverb
        this.convolver = this.audioCtx.createConvolver();
        const decayTime = this.soundProfile === 'cathedral' ? 4.8 : this.soundProfile === 'studio' ? 1.0 : 2.6;
        this.convolver.buffer = this.createStereoConcertHallImpulse(this.audioCtx, decayTime);

        this.reverbGain = this.audioCtx.createGain();
        this.dryGain = this.audioCtx.createGain();
        this.applyProfileAcoustics();

        // 3. Studio Mastering Compressor & Limiter (Tuned to prevent bass pumping/crackle)
        this.compressor = this.audioCtx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-18, this.audioCtx.currentTime);
        this.compressor.knee.setValueAtTime(20, this.audioCtx.currentTime);
        this.compressor.ratio.setValueAtTime(2.8, this.audioCtx.currentTime);
        this.compressor.attack.setValueAtTime(0.025, this.audioCtx.currentTime);
        this.compressor.release.setValueAtTime(0.38, this.audioCtx.currentTime);

        // 4. Soft-Clipping WaveShaper Brickwall Limiter (Guarantees zero digital clipping during fast bass glissandos)
        this.waveShaperLimiter = this.audioCtx.createWaveShaper();
        this.waveShaperLimiter.curve = this.createSoftLimiterCurve();
        this.waveShaperLimiter.oversample = '4x';

        // 5. Master Output Gain
        this.masterGain = this.audioCtx.createGain();
        this.applyVolumeToGain();

        // Graph Routing:
        this.masterEqualizerLow.connect(this.masterEqualizerMid);
        this.masterEqualizerMid.connect(this.masterEqualizerHigh);

        this.masterEqualizerHigh.connect(this.dryGain);
        this.masterEqualizerHigh.connect(this.convolver);
        this.convolver.connect(this.reverbGain);

        this.dryGain.connect(this.compressor);
        this.reverbGain.connect(this.compressor);

        this.compressor.connect(this.waveShaperLimiter);
        this.waveShaperLimiter.connect(this.masterGain);
        this.masterGain.connect(this.audioCtx.destination);
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn("ensureContext error:", e);
    }
  }

  private applyProfileAcoustics() {
    if (!this.reverbGain || !this.dryGain || !this.masterEqualizerLow || !this.masterEqualizerMid || !this.masterEqualizerHigh || !this.audioCtx) return;
    const now = this.audioCtx.currentTime;

    switch (this.soundProfile) {
      case 'concert':
        this.dryGain.gain.setValueAtTime(0.88, now);
        this.reverbGain.gain.setValueAtTime(0.24, now);
        this.masterEqualizerLow.gain.setValueAtTime(3.2, now);
        this.masterEqualizerMid.gain.setValueAtTime(1.0, now);
        this.masterEqualizerHigh.gain.setValueAtTime(0.5, now);
        break;
      case 'studio':
        this.dryGain.gain.setValueAtTime(0.96, now);
        this.reverbGain.gain.setValueAtTime(0.08, now);
        this.masterEqualizerLow.gain.setValueAtTime(2.4, now);
        this.masterEqualizerMid.gain.setValueAtTime(1.2, now);
        this.masterEqualizerHigh.gain.setValueAtTime(0.0, now);
        break;
      case 'bright':
        this.dryGain.gain.setValueAtTime(0.90, now);
        this.reverbGain.gain.setValueAtTime(0.18, now);
        this.masterEqualizerLow.gain.setValueAtTime(1.8, now);
        this.masterEqualizerMid.gain.setValueAtTime(1.5, now);
        this.masterEqualizerHigh.gain.setValueAtTime(1.8, now);
        break;
      case 'warm':
        this.dryGain.gain.setValueAtTime(0.92, now);
        this.reverbGain.gain.setValueAtTime(0.22, now);
        this.masterEqualizerLow.gain.setValueAtTime(3.8, now);
        this.masterEqualizerMid.gain.setValueAtTime(1.2, now);
        this.masterEqualizerHigh.gain.setValueAtTime(-1.8, now);
        break;
      case 'cathedral':
        this.dryGain.gain.setValueAtTime(0.58, now);
        this.reverbGain.gain.setValueAtTime(0.52, now);
        this.masterEqualizerLow.gain.setValueAtTime(2.8, now);
        this.masterEqualizerMid.gain.setValueAtTime(0.6, now);
        this.masterEqualizerHigh.gain.setValueAtTime(1.0, now);
        break;
    }
  }

  private applyVolumeToGain() {
    let normalized = Math.max(0, Math.min(100, this.volumePercent)) / 100;
    if (this.volumePercent <= 0) normalized = 0;
    const gainValue = normalized === 0 ? 0 : Math.pow(normalized, 1.25) * 1.5;

    // 1. Web Audio API Master Gain
    if (this.masterGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(gainValue, now);
    }

    // 2. Tone.js Destination Master Volume (Directly controls Tone.Sampler acoustic piano and Tone synths!)
    try {
      if (typeof Tone !== 'undefined' && Tone.getDestination) {
        if (normalized === 0) {
          Tone.getDestination().volume.value = -Infinity;
        } else {
          // Tone.gainToDb converts gain factor to decibels
          const db = Tone.gainToDb(gainValue);
          Tone.getDestination().volume.value = db;
        }
      }
    } catch (e) {
      console.warn("Tone destination volume update error:", e);
    }
  }

  getVolume(): number {
    return this.volumePercent;
  }

  setVolume(percentOrDb: number) {
    // If passed a negative dB value like from slider (-30 to +6), map to 0-100%
    if (percentOrDb <= 6 && percentOrDb >= -30) {
      const normalized = (percentOrDb - (-30)) / (6 - (-30)); // 0.0 to 1.0
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

    if (this.samplerReverb) {
      this.samplerReverb.decay = profile === 'cathedral' ? 4.8 : profile === 'studio' ? 1.0 : 2.4;
      this.samplerReverb.wet.value = profile === 'studio' ? 0.12 : profile === 'cathedral' ? 0.50 : 0.28;
    }
  }

  private staticHammerBuffer: AudioBuffer | null = null;

  /**
   * Generates a felt hammer strike noise burst (cached buffer for 0ms CPU glissando)
   */
  private createHammerTransient(ctx: AudioContext, freq: number, now: number): { source: AudioBufferSourceNode; gain: GainNode } | null {
    try {
      if (!this.staticHammerBuffer || this.staticHammerBuffer.sampleRate !== ctx.sampleRate) {
        const bufferSize = Math.floor(ctx.sampleRate * 0.016);
        this.staticHammerBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = this.staticHammerBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.22));
        }
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = this.staticHammerBuffer;

      const hammerFilter = ctx.createBiquadFilter();
      hammerFilter.type = 'bandpass';
      hammerFilter.frequency.setValueAtTime(Math.min(3200, Math.max(600, freq * 1.8)), now);
      hammerFilter.Q.setValueAtTime(2.4, now);

      const hammerGain = ctx.createGain();
      hammerGain.gain.setValueAtTime(0.18, now);
      hammerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

      whiteNoise.connect(hammerFilter);
      hammerFilter.connect(hammerGain);

      return { source: whiteNoise, gain: hammerGain };
    } catch (e) {
      return null;
    }
  }

  /**
   * Plays a single note with high-definition acoustic realism
   */
  playNote(note: string, duration: string = "8n", instrument: InstrumentType = "piano", isInteractive: boolean = true) {
    this.ensureContext();

    const midi = NOTE_TO_MIDI[note] ?? 60;

    // Bass glissando dampening: if user is sliding fast across low keys without sustain, prune older bass notes
    if (midi < 48) {
      const nowMs = Date.now();
      if (!this.isSustainOn) {
        this.recentBassNotes = this.recentBassNotes.filter((b) => {
          const isOld = nowMs - b.time > 130;
          if (!isOld && b.note !== note) {
            if (this.isSamplerLoaded && this.sampler) {
              try { this.sampler.triggerRelease([b.note]); } catch (e) {}
            }
          }
          return !isOld;
        });
      }
      this.recentBassNotes.push({ note, time: nowMs });
    }

    // Smooth pitch-dependent velocity scaling:
    // Low Bass (midi 21-48): vel 0.88 to 0.84 -> full deep warm body!
    // Mid Range (midi 49-72): vel 0.82 to 0.76 -> natural acoustic response!
    // High Treble (midi 73-108): vel 0.72 to 0.62 -> smooth, non-piercing high end!
    const pitchComp = Math.max(0.62, Math.min(0.88, 0.88 - (midi - 21) * 0.0032));
    const vel = pitchComp;

    // 1. If Real Acoustic Grand Piano Sample is loaded and instrument is piano, use the sample!
    if (instrument === "piano" && this.isSamplerLoaded && this.sampler) {
      try {
        if (this.isSustainOn) {
          this.sampler.triggerAttack(note, undefined, vel);
          this.sustainedNotes.add(note);

          // Acoustic Soundboard Sympathetic String Resonance
          const harmonicNote = getHarmonicOctaveNote(note);
          if (harmonicNote && harmonicNote !== note) {
            try { this.sampler.triggerAttack(harmonicNote, undefined, vel * 0.05); } catch (e) {}
          }
          return;
        } else if (isInteractive) {
          this.sampler.triggerAttack(note, undefined, vel);

          // Subtle Sympathetic String Resonance
          const harmonicNote = getHarmonicOctaveNote(note);
          if (harmonicNote && harmonicNote !== note) {
            try { this.sampler.triggerAttack(harmonicNote, undefined, vel * 0.04); } catch (e) {}
          }
          return;
        } else {
          this.sampler.triggerAttackRelease(note, duration, undefined, vel);
          return;
        }
      } catch (e) {
        // Fall back seamlessly to physical modeling
      }
    }

    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    const now = this.audioCtx.currentTime;
    const durationSec = duration === "2n" ? 3.5 : duration === "4n" ? 2.5 : duration === "16n" ? 0.6 : 1.8;
    const effectiveDuration = this.isSustainOn ? Math.max(durationSec * 3.5, 6.0) : durationSec;

    // Smooth voice recycling
    while (this.activeVoices.length >= this.MAX_VOICES) {
      const oldest = this.activeVoices.shift();
      if (oldest) {
        try {
          oldest.masterGain.gain.cancelScheduledValues(now);
          oldest.masterGain.gain.setValueAtTime(Math.max(0.0001, oldest.masterGain.gain.value), now);
          oldest.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.015);
          oldest.oscNodes.forEach(o => {
            try { (o as any).stop?.(now + 0.02); } catch (e) {}
          });
        } catch (e) {}
      }
    }

    try {
      const freq = noteToFreq(note);
      const voiceMasterGain = this.audioCtx.createGain();
      const oscNodes: (AudioNode | OscillatorNode)[] = [];
      const gainNodes: GainNode[] = [];

      // Binaural Stereo Panning based on keyboard pitch
      const midi = NOTE_TO_MIDI[note] ?? 60;
      const panValue = Math.max(-0.45, Math.min(0.45, (midi - 60) / 42));
      let panNode: StereoPannerNode | null = null;
      if (this.audioCtx.createStereoPanner) {
        panNode = this.audioCtx.createStereoPanner();
        panNode.pan.setValueAtTime(panValue, now);
      }

      if (instrument === "piano") {
        // High-definition warm acoustic piano model (low CPU, pristine glissando)
        const partials = [
          { k: 1, amp: 1.00, decay: 1.00, type: 'triangle' as const },
          { k: 2, amp: 0.52, decay: 0.75, type: 'sine' as const },
          { k: 3, amp: 0.28, decay: 0.50, type: 'sine' as const },
        ];

        partials.forEach(p => {
          const harmonicFreq = freq * p.k;
          if (harmonicFreq > 18500) return;

          const osc = this.audioCtx!.createOscillator();
          osc.type = p.type;
          osc.frequency.setValueAtTime(harmonicFreq, now);

          const g = this.audioCtx!.createGain();
          g.gain.setValueAtTime(0.0001, now);
          g.gain.linearRampToValueAtTime(p.amp * 0.9, now + 0.0025);
          g.gain.exponentialRampToValueAtTime(0.0001, now + effectiveDuration * p.decay);

          osc.connect(g);
          g.connect(voiceMasterGain);
          oscNodes.push(osc);
          gainNodes.push(g);
        });

        // Acoustic Detune Chorus Shimmer
        const detuneOsc = this.audioCtx.createOscillator();
        detuneOsc.type = 'triangle';
        detuneOsc.frequency.setValueAtTime(freq + 0.38, now);
        const detuneGain = this.audioCtx.createGain();
        detuneGain.gain.setValueAtTime(0.0001, now);
        detuneGain.gain.linearRampToValueAtTime(0.24, now + 0.0035);
        detuneGain.gain.exponentialRampToValueAtTime(0.0001, now + effectiveDuration * 0.85);
        detuneOsc.connect(detuneGain);
        detuneGain.connect(voiceMasterGain);
        oscNodes.push(detuneOsc);
        gainNodes.push(detuneGain);

        // Physical Hammer Felt Impact Transient
        const hammer = this.createHammerTransient(this.audioCtx, freq, now);
        if (hammer) {
          hammer.gain.connect(voiceMasterGain);
          hammer.source.start(now);
          hammer.source.stop(now + 0.02);
          oscNodes.push(hammer.source);
          gainNodes.push(hammer.gain);
        }

        // Master Voice Envelope
        voiceMasterGain.gain.setValueAtTime(0.0001, now);
        voiceMasterGain.gain.linearRampToValueAtTime(0.96, now + 0.0025);
        voiceMasterGain.gain.exponentialRampToValueAtTime(0.65, now + 0.16);
        voiceMasterGain.gain.exponentialRampToValueAtTime(0.0001, now + effectiveDuration);

      } else if (instrument === "guitar") {
        const osc = this.audioCtx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now);

        const osc2 = this.audioCtx.createOscillator();
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(freq, now);

        const filter = this.audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(freq * 5.8, now);
        filter.frequency.exponentialRampToValueAtTime(freq * 1.8, now + 0.25);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(voiceMasterGain);
        oscNodes.push(osc, osc2);

        voiceMasterGain.gain.setValueAtTime(0.0001, now);
        voiceMasterGain.gain.linearRampToValueAtTime(0.94, now + 0.004);
        voiceMasterGain.gain.exponentialRampToValueAtTime(0.0001, now + effectiveDuration * 0.9);

      } else if (instrument === "strings") {
        const osc1 = this.audioCtx.createOscillator();
        osc1.type = "sawtooth";
        osc1.frequency.setValueAtTime(freq, now);

        const osc2 = this.audioCtx.createOscillator();
        osc2.type = "sawtooth";
        osc2.frequency.setValueAtTime(freq, now);
        osc2.detune.setValueAtTime(8, now);

        const oscSub = this.audioCtx.createOscillator();
        oscSub.type = "sine";
        oscSub.frequency.setValueAtTime(freq, now);
        oscSub.detune.setValueAtTime(-8, now);

        const filter = this.audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(2400, now);

        osc1.connect(filter);
        osc2.connect(filter);
        oscSub.connect(filter);
        filter.connect(voiceMasterGain);
        oscNodes.push(osc1, osc2, oscSub);

        voiceMasterGain.gain.setValueAtTime(0.0001, now);
        voiceMasterGain.gain.linearRampToValueAtTime(0.88, now + 0.06);
        voiceMasterGain.gain.exponentialRampToValueAtTime(0.0001, now + effectiveDuration);

      } else if (instrument === "bass") {
        const osc = this.audioCtx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq / 2, now);

        const sub = this.audioCtx.createOscillator();
        sub.type = "sine";
        sub.frequency.setValueAtTime(freq / 2, now);

        const pluck = this.audioCtx.createOscillator();
        pluck.type = "sawtooth";
        pluck.frequency.setValueAtTime(freq, now);
        const pluckGain = this.audioCtx.createGain();
        pluckGain.gain.setValueAtTime(0.45, now);
        pluckGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        pluck.connect(pluckGain);
        pluckGain.connect(voiceMasterGain);
        oscNodes.push(pluck);

        osc.connect(voiceMasterGain);
        sub.connect(voiceMasterGain);
        oscNodes.push(osc, sub);

        voiceMasterGain.gain.setValueAtTime(0.0001, now);
        voiceMasterGain.gain.linearRampToValueAtTime(0.98, now + 0.004);
        voiceMasterGain.gain.exponentialRampToValueAtTime(0.0001, now + effectiveDuration);
      }

      // Route through Panner Node
      if (panNode) {
        voiceMasterGain.connect(panNode);
        if (this.masterEqualizerLow) {
          panNode.connect(this.masterEqualizerLow);
        } else {
          panNode.connect(this.audioCtx.destination);
        }
      } else {
        if (this.masterEqualizerLow) {
          voiceMasterGain.connect(this.masterEqualizerLow);
        } else {
          voiceMasterGain.connect(this.audioCtx.destination);
        }
      }

      const stopTime = now + effectiveDuration + 0.05;
      oscNodes.forEach(o => {
        try {
          (o as OscillatorNode).start?.(now);
          (o as OscillatorNode).stop?.(stopTime);
        } catch (e) {}
      });

      const voice: ActiveVoice = {
        note,
        oscNodes,
        gainNodes,
        masterGain: voiceMasterGain,
        endTime: stopTime,
      };
      this.activeVoices.push(voice);

      // Cleanup on voice end
      const firstOsc = oscNodes[0] as OscillatorNode;
      if (firstOsc && 'onended' in firstOsc) {
        firstOsc.onended = () => {
          const idx = this.activeVoices.indexOf(voice);
          if (idx !== -1) this.activeVoices.splice(idx, 1);
          try {
            oscNodes.forEach(o => (o as any).disconnect?.());
            gainNodes.forEach(g => g.disconnect());
            voiceMasterGain.disconnect();
            if (panNode) panNode.disconnect();
          } catch (e) {}
        };
      }
    } catch (e) {
      console.warn("playNote error:", e);
    }
  }

  playChord(notes: string[], duration: string = "2n", instrument: InstrumentType = "piano") {
    notes.forEach((n) => this.playNote(n, duration, instrument));
  }

  playDrum(type: string, time: number = 0) {
    this.ensureContext();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime + time;
    try {
      if (type === "kick") {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.28);
        gain.gain.setValueAtTime(0.95, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        if (this.compressor) {
          gain.connect(this.compressor);
        } else {
          gain.connect(this.audioCtx.destination);
        }
        osc.start(now);
        osc.stop(now + 0.28);
        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch (e) {}
        };
      } else if (type === "snare") {
        if (this.snareSynth) {
          this.snareSynth.triggerAttackRelease("8n", Tone.now() + time);
        }
      } else if (type === "hihat") {
        if (this.hihatSynth) {
          this.hihatSynth.triggerAttackRelease("32n", Tone.now() + time, 0.4);
        }
      }
    } catch (e) {}
  }

  setSustain(sustain: boolean) {
    this.isSustainOn = sustain;
    if (!sustain) {
      this.sustainedNotes.forEach((note) => {
        this.releaseNoteForce(note);
      });
      this.sustainedNotes.clear();
    }
  }

  releaseNote(note: string) {
    if (this.isSustainOn) {
      this.sustainedNotes.add(note);
      return;
    }
    this.releaseNoteForce(note);
  }

  releaseNoteForce(note: string) {
    if (this.isSamplerLoaded && this.sampler) {
      try {
        this.sampler.triggerRelease([note]);
      } catch (e) {}
    }

    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const midi = NOTE_TO_MIDI[note] ?? 60;
    // Low bass notes (below C3) get a smoother linear fade-out to prevent zero-crossing clicks & crackles
    const fadeOutTime = midi < 48 ? 0.18 : 0.08;

    this.activeVoices.forEach((voice) => {
      if (voice.note === note) {
        try {
          voice.masterGain.gain.cancelScheduledValues(now);
          const currentGain = Math.max(0.0001, voice.masterGain.gain.value);
          voice.masterGain.gain.setValueAtTime(currentGain, now);
          voice.masterGain.gain.linearRampToValueAtTime(0.0001, now + fadeOutTime);
          voice.masterGain.gain.setValueAtTime(0, now + fadeOutTime + 0.01);
        } catch (e) {}
      }
    });
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

  // Synthesize Realistic Applause sound effect for Piano Bar / Social mode
  playApplauseSound() {
    this.init().catch(() => {});
    if (!this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const duration = 2.5;
      const sampleRate = this.audioCtx.sampleRate;
      const buffer = this.audioCtx.createBuffer(2, sampleRate * duration, sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      // Pink noise + clapping pulse synthesis
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

      const src = this.audioCtx.createBufferSource();
      src.buffer = buffer;
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(0.8, now);

      src.connect(filter);
      filter.connect(this.audioCtx.destination);
      src.start(now);
    } catch (e) {}
  }

  // Synthesize Victory Chime for Duels and Quiz
  playChimeSound() {
    this.init().catch(() => {});
    const notes = ['E5', 'G#5', 'B5', 'E6'];
    notes.forEach((note, idx) => {
      setTimeout(() => {
        this.playNote(note, '4n', 'piano');
      }, idx * 70);
    });
  }

  // Synthesize Penalty Buzzer for wrong note in Relay / Battle
  playBuzzerSound() {
    this.init().catch(() => {});
    if (!this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now); // Low A2 buzz
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  // Synthesize Crisp Metronome Click Sound
  playMetronomeClick(isAccent: boolean = false) {
    this.init().catch(() => {});
    if (!this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isAccent ? 1400 : 800, now);

      const maxGain = isAccent ? 0.35 : 0.2;
      gain.gain.setValueAtTime(maxGain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  }
}

export const audioEngine = new AudioEngine();
