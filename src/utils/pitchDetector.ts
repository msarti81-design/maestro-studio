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

        // Responsive Debounce: trigger new note or repeat note after 160ms
        if (note !== this.lastNote || now - this.lastTriggerTime > 160) {
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
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  // Robust Auto-Correlation pitch estimation
  private autoCorrelate(buffer: Float32Array<any>, sampleRate: number): number {
    const SIZE = buffer.length;

    // 1. RMS signal strength check (reject room silence / faint noise)
    let sumSquares = 0;
    for (let i = 0; i < SIZE; i++) {
      const val = buffer[i];
      sumSquares += val * val;
    }
    const rms = Math.sqrt(sumSquares / SIZE);
    if (rms < 0.008) return -1; // Responsive sensitivity for built-in mobile mic

    // 2. Fast autocorrelation with stride of 2 for O(N) speed without UI lag
    const maxShift = Math.floor(SIZE / 2);
    let bestCorrelation = -1;
    let bestShift = -1;

    for (let shift = 16; shift < maxShift; shift += 2) {
      let correlation = 0;
      for (let i = 0; i < maxShift; i += 2) {
        correlation += buffer[i] * buffer[i + shift];
      }
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestShift = shift;
      }
    }

    if (bestShift <= 0 || bestCorrelation < 0.05) return -1;

    // Refine shift with local neighborhood search
    let refinedShift = bestShift;
    let maxCorr = bestCorrelation;
    for (let shift = Math.max(1, bestShift - 2); shift <= Math.min(maxShift, bestShift + 2); shift++) {
      let correlation = 0;
      for (let i = 0; i < maxShift; i++) {
        correlation += buffer[i] * buffer[i + shift];
      }
      if (correlation > maxCorr) {
        maxCorr = correlation;
        refinedShift = shift;
      }
    }

    return sampleRate / refinedShift;
  }
}

export const pitchDetector = new PitchDetector();
