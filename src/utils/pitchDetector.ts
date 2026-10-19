// Acoustic Microphone Pitch Detection Engine using Auto-Correlation
// Listens to real upright/grand pianos via smartphone microphone!

import { midiNumberToNoteName } from './midiEngine';

export type PitchCallback = (detectedNote: string, freqHz: number) => void;

class PitchDetector {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private isListening = false;
  private rafId: number | null = null;
  private buffer: Float32Array<ArrayBuffer> = new Float32Array(1024) as Float32Array<ArrayBuffer>;
  private lastNote = '';
  private lastTriggerTime = 0;
  private callback: PitchCallback | null = null;

  async start(onNoteDetected: PitchCallback): Promise<boolean> {
    if (this.isListening) return true;
    this.callback = onNoteDetected;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: true,
          },
        });
      } catch (streamErr) {
        // Fallback for strict mobile browsers
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const source = this.audioCtx.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 1024;
      source.connect(this.analyser);

      this.isListening = true;
      this.loop();
      return true;
    } catch (e) {
      console.warn('Microphone permission or pitch detection error:', e);
      this.stop();
      return false;
    }
  }

  async startListening(cb?: PitchCallback): Promise<boolean> {
    return this.start(cb || (() => {}));
  }

  stopListening() {
    this.stop();
  }

  subscribe(listener: (data: { note: string; cents: number; frequency: number }) => void) {
    this.callback = (note: string, freqHz: number) => {
      // Calculate cents deviation from nearest A440 tuning
      const midiFloat = 69 + 12 * Math.log2(freqHz / 440);
      const nearestMidi = Math.round(midiFloat);
      const cents = Math.round((midiFloat - nearestMidi) * 100);
      listener({ note, cents, frequency: freqHz });
    };
    return () => {
      this.callback = null;
    };
  }

  stop() {
    this.isListening = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.analyser = null;
    this.lastNote = '';
  }

  getIsListening() {
    return this.isListening;
  }

  private consecutiveCount = 0;
  private candidateNote = '';
  private sensitivityMode: 'economy' | 'balanced' | 'pro' = 'economy';

  setSensitivityMode(mode: 'economy' | 'balanced' | 'pro') {
    this.sensitivityMode = mode;
  }

  getSensitivityMode() {
    return this.sensitivityMode;
  }

  private loop = () => {
    if (!this.isListening || !this.analyser || !this.audioCtx) return;

    this.analyser.getFloatTimeDomainData(this.buffer);
    const freq = this.autoCorrelate(this.buffer, this.audioCtx.sampleRate);

    if (freq > 0) {
      // Frequency to MIDI note
      const midiFloat = 69 + 12 * Math.log2(freq / 440);
      const midi = Math.round(midiFloat);

      // Full Piano range: C1 (24) to C8 (108)
      if (midi >= 24 && midi <= 108) {
        const note = midiNumberToNoteName(midi);
        const now = performance.now();

        if (note === this.candidateNote) {
          this.consecutiveCount++;
        } else {
          this.candidateNote = note;
          this.consecutiveCount = 1;
        }

        const debounceTime = this.sensitivityMode === 'economy' ? 180 : 300;
        const requiredFrames = this.sensitivityMode === 'economy' ? 1 : 2;

        if (this.consecutiveCount >= requiredFrames && (note !== this.lastNote || now - this.lastTriggerTime > debounceTime)) {
          this.lastNote = note;
          this.lastTriggerTime = now;

          if (this.callback) {
            this.callback(note, freq);
          }

          window.dispatchEvent(
            new CustomEvent('piano:noteplayed', { detail: { note, source: 'mic' } })
          );
        }
      }
    } else {
      this.consecutiveCount = 0;
      this.candidateNote = '';
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  // Robust Normalized Autocorrelation (NSAC) with adjustable sensitivity mode
  private autoCorrelate(buffer: Float32Array<any>, sampleRate: number): number {
    const SIZE = buffer.length;

    let rmsMin = 0.010;
    let corrMin = 0.26;
    if (this.sensitivityMode === 'balanced') {
      rmsMin = 0.015;
      corrMin = 0.35;
    } else if (this.sensitivityMode === 'pro') {
      rmsMin = 0.020;
      corrMin = 0.40;
    }

    // 1. RMS signal strength check
    let sumSquares = 0;
    for (let i = 0; i < SIZE; i++) {
      const val = buffer[i];
      sumSquares += val * val;
    }
    const rms = Math.sqrt(sumSquares / SIZE);
    if (rms < rmsMin) return -1;

    // Helper to get normalized correlation at any shift
    const getCorrAt = (s: number) => {
      let correlation = 0;
      let energy1 = 0;
      let energy2 = 0;
      const innerLimit = SIZE - s;
      for (let i = 0; i < innerLimit; i++) {
        const b1 = buffer[i];
        const b2 = buffer[i + s];
        correlation += b1 * b2;
        energy1 += b1 * b1;
        energy2 += b2 * b2;
      }
      const denom = Math.sqrt(energy1 * energy2);
      return denom > 0 ? correlation / denom : 0;
    };

    // 2. Normalized Autocorrelation starting at shift = 4 up to SIZE/2
    const maxShift = Math.floor(SIZE / 2);
    let bestCorrelation = -1;
    let bestShift = -1;

    for (let shift = 4; shift < maxShift; shift += (shift < 32 ? 1 : 2)) {
      const normalizedCorr = getCorrAt(shift);
      if (normalizedCorr > bestCorrelation) {
        bestCorrelation = normalizedCorr;
        bestShift = shift;
      }
    }

    if (bestShift <= 3 || bestCorrelation < corrMin) return -1;

    // 3. Sub-harmonic / Octave correction
    const halfShift = Math.round(bestShift / 2);
    if (halfShift >= 4) {
      const corrHalf = getCorrAt(halfShift);
      if (corrHalf >= bestCorrelation * 0.78) {
        bestShift = halfShift;
        bestCorrelation = corrHalf;
      }
    }

    const quarterShift = Math.round(bestShift / 2);
    if (quarterShift >= 4) {
      const corrQuarter = getCorrAt(quarterShift);
      if (corrQuarter >= bestCorrelation * 0.78) {
        bestShift = quarterShift;
        bestCorrelation = corrQuarter;
      }
    }

    // 3.5 Clarity / Prominence check (skipped in economy mode for non-pro keyboards)
    if (this.sensitivityMode !== 'economy') {
      for (let s = 4; s < maxShift; s += 6) {
        if (Math.abs(s - bestShift) > 8 && Math.abs(s - 2 * bestShift) > 8 && Math.abs(2 * s - bestShift) > 8) {
          const otherCorr = getCorrAt(s);
          if (otherCorr >= bestCorrelation * 0.88) {
            return -1;
          }
        }
      }
    }

    // 4. Parabolic sub-sample interpolation
    const shiftPrev = Math.max(1, bestShift - 1);
    const shiftNext = Math.min(maxShift, bestShift + 1);

    const alpha = getCorrAt(shiftPrev);
    const beta = bestCorrelation;
    const gamma = getCorrAt(shiftNext);

    let refinedShift = bestShift;
    const denomPar = alpha - 2 * beta + gamma;
    if (denomPar !== 0) {
      const delta = 0.5 * (alpha - gamma) / denomPar;
      if (Math.abs(delta) <= 1.0) {
        refinedShift = bestShift + delta;
      }
    }

    return sampleRate / refinedShift;
  }
}

export const pitchDetector = new PitchDetector();
