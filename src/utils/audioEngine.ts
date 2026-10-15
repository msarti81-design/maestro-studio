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
  private volumePercent = 90;
  private soundProfile: SoundProfile = 'concert';

  // Master Audio Chain Nodes
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterEqualizerLow: BiquadFilterNode | null = null;
  private masterEqualizerMid: BiquadFilterNode | null = null;
  private masterEqualizerHigh: BiquadFilterNode | null = null;
  private convolver: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private isInitialized = false;
  private activeVoices: ActiveVoice[] = [];
  private readonly MAX_VOICES = 48;

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

        // Initialize Real Acoustic Grand Piano Sampler (Salamander Grand)
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
        onload: () => {
          this.isSamplerLoaded = true;
        },
      });

      this.samplerReverb = new Tone.Reverb({
        decay: this.soundProfile === 'cathedral' ? 4.2 : this.soundProfile === 'studio' ? 1.0 : 2.2,
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
  private createStereoConcertHallImpulse(ctx: AudioContext, duration = 2.4, decay = 2.6): AudioBuffer {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / length;
      // Exponential decay envelope
      const env = Math.pow(1 - t, decay);
      // Frequency-dependent damping (high frequencies absorb faster)
      const damping = Math.exp(-t * 2.8);
      left[i] = (Math.random() * 2 - 1) * env * damping;
      right[i] = (Math.random() * 2 - 1) * env * damping;
    }

    return impulse;
  }

  private ensureContext() {
    try {
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AudioCtxClass({
          latencyHint: 'interactive',
        });

        // 1. Acoustic Soundboard Equalizer
        // Deep body resonance (200 Hz, warm spruce soundboard)
        this.masterEqualizerLow = this.audioCtx.createBiquadFilter();
        this.masterEqualizerLow.type = 'lowshelf';
        this.masterEqualizerLow.frequency.setValueAtTime(200, this.audioCtx.currentTime);
        this.masterEqualizerLow.gain.setValueAtTime(3.0, this.audioCtx.currentTime);

        // Presence & wooden hammer clarity (1500 Hz)
        this.masterEqualizerMid = this.audioCtx.createBiquadFilter();
        this.masterEqualizerMid.type = 'peaking';
        this.masterEqualizerMid.frequency.setValueAtTime(1500, this.audioCtx.currentTime);
        this.masterEqualizerMid.Q.setValueAtTime(1.2, this.audioCtx.currentTime);
        this.masterEqualizerMid.gain.setValueAtTime(1.2, this.audioCtx.currentTime);

        // High brilliance / air shimmer (5000 Hz)
        this.masterEqualizerHigh = this.audioCtx.createBiquadFilter();
        this.masterEqualizerHigh.type = 'highshelf';
        this.masterEqualizerHigh.frequency.setValueAtTime(5000, this.audioCtx.currentTime);
        this.masterEqualizerHigh.gain.setValueAtTime(1.8, this.audioCtx.currentTime);

        // 2. Convolution Reverb (True Stereo Concert Hall)
        this.convolver = this.audioCtx.createConvolver();
        const decayTime = this.soundProfile === 'cathedral' ? 4.5 : this.soundProfile === 'studio' ? 1.0 : 2.4;
        this.convolver.buffer = this.createStereoConcertHallImpulse(this.audioCtx, decayTime);

        this.reverbGain = this.audioCtx.createGain();
        this.dryGain = this.audioCtx.createGain();
        this.applyProfileAcoustics();

        // 3. Studio Mastering Compressor & Limiter
        this.compressor = this.audioCtx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-14, this.audioCtx.currentTime);
        this.compressor.knee.setValueAtTime(8, this.audioCtx.currentTime);
        this.compressor.ratio.setValueAtTime(4.0, this.audioCtx.currentTime);
        this.compressor.attack.setValueAtTime(0.002, this.audioCtx.currentTime);
        this.compressor.release.setValueAtTime(0.18, this.audioCtx.currentTime);

        // 4. Master Output Gain
        this.masterGain = this.audioCtx.createGain();
        this.applyVolumeToGain();

        // Graph Routing:
        // Input -> EQ Low -> EQ Mid -> EQ High
        //    ├─> dryGain ─────────────────────┐
        //    └─> convolver -> reverbGain ────┴─> compressor -> masterGain -> destination
        this.masterEqualizerLow.connect(this.masterEqualizerMid);
        this.masterEqualizerMid.connect(this.masterEqualizerHigh);

        this.masterEqualizerHigh.connect(this.dryGain);
        this.masterEqualizerHigh.connect(this.convolver);
        this.convolver.connect(this.reverbGain);

        this.dryGain.connect(this.compressor);
        this.reverbGain.connect(this.compressor);

        this.compressor.connect(this.masterGain);
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
    if (!this.reverbGain || !this.dryGain || !this.masterEqualizerHigh || !this.audioCtx) return;
    const now = this.audioCtx.currentTime;

    switch (this.soundProfile) {
      case 'concert': // Balanced, majestic grand hall
        this.dryGain.gain.setValueAtTime(0.85, now);
        this.reverbGain.gain.setValueAtTime(0.24, now);
        this.masterEqualizerHigh.gain.setValueAtTime(1.8, now);
        break;
      case 'studio': // Intimate, dry, punchy, direct
        this.dryGain.gain.setValueAtTime(0.95, now);
        this.reverbGain.gain.setValueAtTime(0.08, now);
        this.masterEqualizerHigh.gain.setValueAtTime(1.2, now);
        break;
      case 'bright': // Stage piano, crisp, piercing highs
        this.dryGain.gain.setValueAtTime(0.90, now);
        this.reverbGain.gain.setValueAtTime(0.15, now);
        this.masterEqualizerHigh.gain.setValueAtTime(3.6, now);
        break;
      case 'cathedral': // Ethereal, huge ambient wash
        this.dryGain.gain.setValueAtTime(0.65, now);
        this.reverbGain.gain.setValueAtTime(0.48, now);
        this.masterEqualizerHigh.gain.setValueAtTime(2.2, now);
        break;
    }
  }

  private applyVolumeToGain() {
    if (!this.masterGain || !this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const normalized = Math.max(0, Math.min(100, this.volumePercent)) / 100;
    // Audiophile log curve with clean headroom
    const gainValue = normalized === 0 ? 0 : Math.pow(normalized, 1.25) * 1.45;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(gainValue, now);
  }

  getVolume(): number {
    return this.volumePercent;
  }

  setVolume(percent: number) {
    this.volumePercent = Math.max(0, Math.min(100, percent));
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
      this.samplerReverb.decay = profile === 'cathedral' ? 4.2 : profile === 'studio' ? 1.0 : 2.2;
      this.samplerReverb.wet.value = profile === 'studio' ? 0.12 : profile === 'cathedral' ? 0.45 : 0.28;
    }
  }

  /**
   * Generates a 12ms felt hammer strike noise burst
   */
  private createHammerTransient(ctx: AudioContext, freq: number, now: number): { source: AudioBufferSourceNode; gain: GainNode } | null {
    try {
      const bufferSize = Math.floor(ctx.sampleRate * 0.015); // 15ms buffer
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const hammerFilter = ctx.createBiquadFilter();
      hammerFilter.type = 'bandpass';
      hammerFilter.frequency.setValueAtTime(Math.min(2600, Math.max(500, freq * 1.8)), now);
      hammerFilter.Q.setValueAtTime(2.2, now);

      const hammerGain = ctx.createGain();
      hammerGain.gain.setValueAtTime(0.28, now);
      hammerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.014);

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
  playNote(note: string, duration: string = "8n", instrument: InstrumentType = "piano") {
    this.ensureContext();

    // 1. If Real Acoustic Grand Piano Sample is loaded and instrument is piano, use the sample!
    if (instrument === "piano" && this.isSamplerLoaded && this.sampler) {
      try {
        const vel = 0.85;
        this.sampler.triggerAttackRelease(note, duration, undefined, vel);
        return;
      } catch (e) {
        // Fall back seamlessly to physical modeling
      }
    }

    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    const now = this.audioCtx.currentTime;
    const durationSec = duration === "2n" ? 2.2 : duration === "4n" ? 1.4 : duration === "16n" ? 0.35 : 0.85;
    const effectiveDuration = this.isSustainOn ? durationSec * 2.8 : durationSec;

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
      // A0 (-0.35 left) -> C4 (0.0 center) -> C8 (+0.35 right)
      const midi = NOTE_TO_MIDI[note] ?? 60;
      const panValue = Math.max(-0.4, Math.min(0.4, (midi - 60) / 45));
      let panNode: StereoPannerNode | null = null;
      if (this.audioCtx.createStereoPanner) {
        panNode = this.audioCtx.createStereoPanner();
        panNode.pan.setValueAtTime(panValue, now);
      }

      if (instrument === "piano") {
        // -------------------------------------------------------------
        // CONCERT GRAND PIANO PHYSICAL MODELING SYNTHESIS:
        // Inharmonic stiff string partials: f_k = k * f0 * sqrt(1 + B * k^2)
        // -------------------------------------------------------------
        const B = 0.0003; // Real piano string stiffness coefficient

        // Partials configuration: { partialNumber, amplitude, decayRatio }
        const partials = [
          { k: 1, amp: 0.90, decay: 1.0 },   // Fundamental
          { k: 2, amp: 0.55, decay: 0.72 },  // 2nd harmonic (octave)
          { k: 3, amp: 0.32, decay: 0.48 },  // 3rd harmonic (fifth)
          { k: 4, amp: 0.18, decay: 0.30 },  // 4th harmonic (double octave)
          { k: 5, amp: 0.09, decay: 0.18 },  // 5th harmonic (sparkle)
        ];

        partials.forEach(p => {
          const inharmonicFreq = freq * p.k * Math.sqrt(1 + B * p.k * p.k);
          if (inharmonicFreq > 18000) return;

          const osc = this.audioCtx!.createOscillator();
          osc.type = p.k === 1 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(inharmonicFreq, now);

          const g = this.audioCtx!.createGain();
          g.gain.setValueAtTime(0.0001, now);
          g.gain.linearRampToValueAtTime(p.amp, now + 0.003); // Instant attack
          g.gain.exponentialRampToValueAtTime(0.0001, now + effectiveDuration * p.decay);

          osc.connect(g);
          g.connect(voiceMasterGain);
          oscNodes.push(osc);
          gainNodes.push(g);
        });

        // Dual-String Unison Detune (Acoustic Chorus Bloom):
        // Real piano keys have 2 or 3 strings tuned with a ~0.4Hz beating
        const detuneOsc = this.audioCtx.createOscillator();
        detuneOsc.type = 'triangle';
        detuneOsc.frequency.setValueAtTime(freq + 0.42, now);

        const detuneGain = this.audioCtx.createGain();
        detuneGain.gain.setValueAtTime(0.0001, now);
        detuneGain.gain.linearRampToValueAtTime(0.35, now + 0.004);
        detuneGain.gain.exponentialRampToValueAtTime(0.0001, now + effectiveDuration * 0.9);

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
        voiceMasterGain.gain.linearRampToValueAtTime(0.96, now + 0.003);
        voiceMasterGain.gain.exponentialRampToValueAtTime(0.65, now + 0.15); // Hammer strike ring-out
        voiceMasterGain.gain.exponentialRampToValueAtTime(0.0001, now + effectiveDuration);

      } else if (instrument === "guitar") {
        // Acoustic Nylon/Steel Guitar with Wood Pluck Resonance
        const osc = this.audioCtx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now);

        const osc2 = this.audioCtx.createOscillator();
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(freq, now);

        const filter = this.audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(freq * 5.5, now);
        filter.frequency.exponentialRampToValueAtTime(freq * 1.8, now + 0.25);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(voiceMasterGain);
        oscNodes.push(osc, osc2);

        voiceMasterGain.gain.setValueAtTime(0.0001, now);
        voiceMasterGain.gain.linearRampToValueAtTime(0.92, now + 0.004);
        voiceMasterGain.gain.exponentialRampToValueAtTime(0.0001, now + effectiveDuration * 0.9);

      } else if (instrument === "strings") {
        // Orchestral Strings Ensemble (3 detuned voices with lush bowed attack)
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
        filter.frequency.setValueAtTime(2200, now);

        osc1.connect(filter);
        osc2.connect(filter);
        oscSub.connect(filter);
        filter.connect(voiceMasterGain);
        oscNodes.push(osc1, osc2, oscSub);

        voiceMasterGain.gain.setValueAtTime(0.0001, now);
        voiceMasterGain.gain.linearRampToValueAtTime(0.85, now + 0.07); // Smooth bowing attack
        voiceMasterGain.gain.exponentialRampToValueAtTime(0.0001, now + effectiveDuration);

      } else if (instrument === "bass") {
        // Deep Warm Bass with punchy attack
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
        pluckGain.gain.setValueAtTime(0.4, now);
        pluckGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        pluck.connect(pluckGain);
        pluckGain.connect(voiceMasterGain);
        oscNodes.push(pluck);

        osc.connect(voiceMasterGain);
        sub.connect(voiceMasterGain);
        oscNodes.push(osc, sub);

        voiceMasterGain.gain.setValueAtTime(0.0001, now);
        voiceMasterGain.gain.linearRampToValueAtTime(0.98, now + 0.005);
        voiceMasterGain.gain.exponentialRampToValueAtTime(0.0001, now + effectiveDuration);
      }

      // Route through Panner Node if supported
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
  }

  releaseNote(note: string) {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    this.activeVoices.forEach((voice) => {
      if (voice.note === note) {
        try {
          voice.masterGain.gain.cancelScheduledValues(now);
          voice.masterGain.gain.setValueAtTime(Math.max(0.0001, voice.masterGain.gain.value), now);
          voice.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.04);
          voice.oscNodes.forEach((o) => {
            try { (o as any).stop?.(now + 0.045); } catch (e) {}
          });
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
}

export const audioEngine = new AudioEngine();
