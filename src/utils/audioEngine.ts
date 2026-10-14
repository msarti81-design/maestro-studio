import * as Tone from "tone";
import { InstrumentType } from "../types";

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
  oscNodes: OscillatorNode[];
  gainNodes: GainNode[];
  filterNode?: BiquadFilterNode;
  masterGain: GainNode;
  endTime: number;
}

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private isSustainOn = false;
  private volumePercent = 90; // Default 90%
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterEqualizerLow: BiquadFilterNode | null = null;
  private masterEqualizerHigh: BiquadFilterNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private isInitialized = false;
  private activeVoices: ActiveVoice[] = [];
  private readonly MAX_VOICES = 32;

  // Tone.js fallback for Jam Band drums
  private drumSynth: Tone.MembraneSynth | null = null;
  private hihatSynth: Tone.MetalSynth | null = null;
  private snareSynth: Tone.NoiseSynth | null = null;

  async init() {
    if (this.isInitialized && this.audioCtx && this.audioCtx.state === 'running') return;

    try {
      this.ensureContext();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      // Initialize Tone.js for drums
      try {
        await Tone.start();
        if (!this.drumSynth) {
          this.drumSynth = new Tone.MembraneSynth({
            volume: -4,
            pitchDecay: 0.05,
            octaves: 4,
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 0.3 },
          }).toDestination();

          this.hihatSynth = new Tone.MetalSynth({ volume: -14 } as any).toDestination();

          this.snareSynth = new Tone.NoiseSynth({
            volume: -8,
            noise: { type: "white" },
            envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
          }).toDestination();
        }
      } catch (e) {}

      this.isInitialized = true;
    } catch (e) {
      console.error("Failed to initialize Web Audio Engine", e);
    }
  }

  // Generates a lush, natural concert hall acoustic impulse response
  private createConcertHallImpulse(ctx: AudioContext, duration = 1.6, decay = 2.4): AudioBuffer {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / length;
      const envelope = Math.pow(1 - t, decay);
      // Diffuse reflections with stereo spatialization
      left[i] = (Math.random() * 2 - 1) * envelope;
      right[i] = (Math.random() * 2 - 1) * envelope;
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

        // 1. Acoustic Soundboard EQ:
        // Warm low shelf for authentic soundboard body & resonance (220 Hz, +3dB)
        this.masterEqualizerLow = this.audioCtx.createBiquadFilter();
        this.masterEqualizerLow.type = 'lowshelf';
        this.masterEqualizerLow.frequency.setValueAtTime(220, this.audioCtx.currentTime);
        this.masterEqualizerLow.gain.setValueAtTime(3.2, this.audioCtx.currentTime);

        // Gentle high shelf to smooth shrill high notes and give grand piano sparkle (4500 Hz, +1.5dB)
        this.masterEqualizerHigh = this.audioCtx.createBiquadFilter();
        this.masterEqualizerHigh.type = 'highshelf';
        this.masterEqualizerHigh.frequency.setValueAtTime(4500, this.audioCtx.currentTime);
        this.masterEqualizerHigh.gain.setValueAtTime(1.5, this.audioCtx.currentTime);

        // 2. High-Performance Zero-Latency Acoustic Resonance (Zero CPU load, instant response)
        const roomDelay = this.audioCtx.createDelay();
        roomDelay.delayTime.setValueAtTime(0.035, this.audioCtx.currentTime); // 35ms reflection
        const roomFeedback = this.audioCtx.createGain();
        roomFeedback.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
        roomDelay.connect(roomFeedback);
        roomFeedback.connect(roomDelay);

        // Wet / Dry mixer
        this.reverbGain = this.audioCtx.createGain();
        this.reverbGain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
        roomDelay.connect(this.reverbGain);

        this.dryGain = this.audioCtx.createGain();
        this.dryGain.gain.setValueAtTime(0.95, this.audioCtx.currentTime);

        // 3. Studio Mastering Compressor: Prevents clipping and delivers punchy, loud volume
        this.compressor = this.audioCtx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-12, this.audioCtx.currentTime);
        this.compressor.knee.setValueAtTime(6, this.audioCtx.currentTime);
        this.compressor.ratio.setValueAtTime(3.8, this.audioCtx.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
        this.compressor.release.setValueAtTime(0.22, this.audioCtx.currentTime);

        // 4. Master Output Gain Booster
        this.masterGain = this.audioCtx.createGain();
        this.applyVolumeToGain();

        // Routing Graph:
        // Source -> masterEqualizerLow -> masterEqualizerHigh
        //    ├─> dryGain ─────────────────────┐
        //    └─> roomDelay -> reverbGain ─────┴─> compressor -> masterGain -> destination
        this.masterEqualizerLow.connect(this.masterEqualizerHigh);
        
        this.masterEqualizerHigh.connect(this.dryGain);
        this.masterEqualizerHigh.connect(roomDelay);

        this.dryGain.connect(this.compressor);
        this.reverbGain.connect(this.compressor);

        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.audioCtx.destination);
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    } catch (e) {}
  }

  private applyVolumeToGain() {
    if (!this.masterGain || !this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const normalized = Math.max(0, Math.min(100, this.volumePercent)) / 100;
    // Perceptual audio scaling curve with +40% volume boost for smartphone speakers
    const gainValue = normalized === 0 ? 0 : Math.pow(normalized, 1.35) * 1.55;
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

  playNote(note: string, duration: string = "8n", instrument: InstrumentType = "piano") {
    this.ensureContext();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const durationSec = duration === "2n" ? 1.4 : duration === "4n" ? 0.85 : duration === "16n" ? 0.22 : 0.45;
    const effectiveDuration = this.isSustainOn ? durationSec * 2.5 : durationSec;

    // Voice Stealing: Recycle oldest voice smoothly if over capacity
    while (this.activeVoices.length >= this.MAX_VOICES) {
      const oldest = this.activeVoices.shift();
      if (oldest) {
        try {
          oldest.masterGain.gain.cancelScheduledValues(now);
          oldest.masterGain.gain.setValueAtTime(Math.max(0.0001, oldest.masterGain.gain.value), now);
          oldest.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.01);
          oldest.oscNodes.forEach(o => {
            try { o.stop(now + 0.015); } catch (e) {}
          });
        } catch (e) {}
      }
    }

    try {
      const freq = noteToFreq(note);
      const voiceMasterGain = this.audioCtx.createGain();
      const oscNodes: OscillatorNode[] = [];
      const gainNodes: GainNode[] = [];
      let dynamicFilter: BiquadFilterNode | undefined;

      if (instrument === "piano") {
        // High-performance acoustic piano synthesis (fast, zero audio buffer lag):
        // 1. Fundamental partial (Triangle core)
        const osc1 = this.audioCtx.createOscillator();
        osc1.type = "triangle";
        osc1.frequency.setValueAtTime(freq, now);
        const gain1 = this.audioCtx.createGain();
        gain1.gain.setValueAtTime(0.85, now);
        osc1.connect(gain1);
        gain1.connect(voiceMasterGain);
        oscNodes.push(osc1);
        gainNodes.push(gain1);

        // 2. Sine overtone for resonance
        const osc2 = this.audioCtx.createOscillator();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(freq * 2, now);
        const gain2 = this.audioCtx.createGain();
        gain2.gain.setValueAtTime(0.20, now);
        osc2.connect(gain2);
        gain2.connect(voiceMasterGain);
        oscNodes.push(osc2);
        gainNodes.push(gain2);

        // Acoustic Piano Amplitude Envelope (Instant clickless attack, natural exponential ring-out)
        const peak = 0.95;
        voiceMasterGain.gain.setValueAtTime(0.0001, now);
        voiceMasterGain.gain.linearRampToValueAtTime(peak, now + 0.003);
        // Stage 1 decay: initial string strike decay
        voiceMasterGain.gain.exponentialRampToValueAtTime(peak * 0.65, now + 0.12);
        // Stage 2 decay: slow acoustic soundboard resonance
        voiceMasterGain.gain.exponentialRampToValueAtTime(0.0001, now + effectiveDuration);

      } else if (instrument === "guitar") {
        // Acoustic guitar pluck
        const osc = this.audioCtx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now);
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(freq * 4, now);
        filter.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.2);
        osc.connect(filter);
        filter.connect(voiceMasterGain);
        oscNodes.push(osc);

        voiceMasterGain.gain.setValueAtTime(0.0001, now);
        voiceMasterGain.gain.linearRampToValueAtTime(0.9, now + 0.004);
        voiceMasterGain.gain.exponentialRampToValueAtTime(0.0001, now + effectiveDuration * 0.85);

      } else if (instrument === "strings") {
        // Warm orchestral strings with gentle attack
        const osc = this.audioCtx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now);
        const oscSub = this.audioCtx.createOscillator();
        oscSub.type = "sine";
        oscSub.frequency.setValueAtTime(freq, now);
        oscSub.detune.setValueAtTime(4, now);
        
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1800, now);

        osc.connect(filter);
        oscSub.connect(filter);
        filter.connect(voiceMasterGain);
        oscNodes.push(osc, oscSub);

        voiceMasterGain.gain.setValueAtTime(0.0001, now);
        voiceMasterGain.gain.linearRampToValueAtTime(0.85, now + 0.06); // Bowing attack
        voiceMasterGain.gain.exponentialRampToValueAtTime(0.0001, now + effectiveDuration);

      } else if (instrument === "bass") {
        // Deep electric/upright bass with punch
        const osc = this.audioCtx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq / 2, now);
        const sub = this.audioCtx.createOscillator();
        sub.type = "sine";
        sub.frequency.setValueAtTime(freq / 2, now);

        osc.connect(voiceMasterGain);
        sub.connect(voiceMasterGain);
        oscNodes.push(osc, sub);

        voiceMasterGain.gain.setValueAtTime(0.0001, now);
        voiceMasterGain.gain.linearRampToValueAtTime(0.98, now + 0.005);
        voiceMasterGain.gain.exponentialRampToValueAtTime(0.0001, now + effectiveDuration);
      }

      // Connect voice into Master EQ -> Reverb/Dry -> Compressor -> Destination
      if (this.masterEqualizerLow) {
        voiceMasterGain.connect(this.masterEqualizerLow);
      } else if (this.compressor) {
        voiceMasterGain.connect(this.compressor);
      } else {
        voiceMasterGain.connect(this.audioCtx.destination);
      }

      const stopTime = now + effectiveDuration + 0.05;
      oscNodes.forEach(o => {
        o.start(now);
        o.stop(stopTime);
      });

      const voice: ActiveVoice = {
        note,
        oscNodes,
        gainNodes,
        filterNode: dynamicFilter,
        masterGain: voiceMasterGain,
        endTime: stopTime,
      };
      this.activeVoices.push(voice);

      // Clean cleanup on end
      if (oscNodes[0]) {
        oscNodes[0].onended = () => {
          const idx = this.activeVoices.indexOf(voice);
          if (idx !== -1) this.activeVoices.splice(idx, 1);
          try {
            oscNodes.forEach(o => o.disconnect());
            gainNodes.forEach(g => g.disconnect());
            if (dynamicFilter) dynamicFilter.disconnect();
            voiceMasterGain.disconnect();
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
          voice.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.03);
          voice.oscNodes.forEach((o) => {
            try { o.stop(now + 0.035); } catch (e) {}
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
