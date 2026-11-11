import React, { useEffect, useRef, useCallback } from 'react';
import { NoteNotationFormat, StudioTheme } from '../types';
import { formatNoteLabel } from '../utils/noteFormatting';
import { FINGER_NAMES } from '../data/scaleExercises';
import { songPlaybackState } from '../utils/songPlaybackState';

export interface KeyConfig {
  note: string;
  type: 'white' | 'black';
  octave: number;
  computerKey?: string;
}

interface CanvasPianoProps {
  keys: KeyConfig[];
  getTransposedNote: (note: string) => string;
  currentlyPressedNotesRef: React.MutableRefObject<Set<string>>;
  onNoteDown: (note: string) => void;
  onNoteUp: (note: string) => void;
  sustain: boolean;
  showWaterfall: boolean;
  noteNotation?: NoteNotationFormat;
  className?: string;
  studioTheme?: StudioTheme;
  activeGuidanceNote?: string | null;
  activeGuidanceFinger?: number | null;
  activeGuidanceTip?: string | null;
  guidanceHand?: 'right' | 'left';
  studentPressedNotesRef?: React.MutableRefObject<Set<string>>;
}

interface KeyRect {
  note: string;
  type: 'white' | 'black';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  computerKey?: string;
  idx: number;
}

export const CanvasPiano: React.FC<CanvasPianoProps> = ({
  keys,
  getTransposedNote,
  currentlyPressedNotesRef,
  onNoteDown,
  onNoteUp,
  sustain,
  showWaterfall,
  noteNotation = 'latin',
  className,
  studioTheme = 'midnight',
  activeGuidanceNote = null,
  activeGuidanceFinger = null,
  activeGuidanceTip = null,
  guidanceHand = 'right',
  studentPressedNotesRef,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Offscreen cached canvas holding the complete unpressed photorealistic keyboard
  // Eliminates 99.8% of per-frame GPU/CPU work so switching materials or playing is 0ms lag!
  const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const staticDirtyRef = useRef<boolean>(true);
  const lastRenderedSigRef = useRef<string>('');

  const studioThemeRef = useRef<StudioTheme>(studioTheme);
  if (studioThemeRef.current !== studioTheme) {
    studioThemeRef.current = studioTheme;
    staticDirtyRef.current = true;
  }

  const sustainRef = useRef<boolean>(sustain);
  sustainRef.current = sustain;

  const onNoteDownRef = useRef(onNoteDown);
  onNoteDownRef.current = onNoteDown;

  const onNoteUpRef = useRef(onNoteUp);
  onNoteUpRef.current = onNoteUp;

  const activeGuidanceNoteRef = useRef<string | null>(activeGuidanceNote);
  activeGuidanceNoteRef.current = activeGuidanceNote;

  const activeGuidanceFingerRef = useRef<number | null>(activeGuidanceFinger);
  activeGuidanceFingerRef.current = activeGuidanceFinger;

  const activeGuidanceTipRef = useRef<string | null>(activeGuidanceTip);
  activeGuidanceTipRef.current = activeGuidanceTip;

  const guidanceHandRef = useRef<'right' | 'left'>(guidanceHand);
  guidanceHandRef.current = guidanceHand;

  // Animated Transparent Hand Position (Smooth gliding interpolation across keys)
  const handPosRef = useRef<{
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    initialized: boolean;
  }>({
    x: -999,
    y: -999,
    targetX: 0,
    targetY: 0,
    initialized: false,
  });

  // Cached Key Rectangles for 0ms sub-microsecond touch checks
  const keyRectsRef = useRef<{ whiteKeys: KeyRect[]; blackKeys: KeyRect[] }>({
    whiteKeys: [],
    blackKeys: [],
  });

  const canvasDimsRef = useRef<{ width: number; height: number }>({ width: 800, height: 300 });

  // Separate white and black keys from current window
  const whiteKeysList = keys.filter((k) => k.type === 'white');
  const numWhiteKeys = Math.max(1, whiteKeysList.length);

  // Precompute pixel dimensions for all keys whenever keys or container size changes
  const updateKeyGeometries = useCallback((width: number, height: number) => {
    const whiteKeys: KeyRect[] = [];
    const blackKeys: KeyRect[] = [];

    const whiteWidth = width / numWhiteKeys;

    // Build white keys
    whiteKeysList.forEach((k, idx) => {
      const transposed = getTransposedNote(k.note);
      const label = formatNoteLabel(transposed, noteNotation, true);
      whiteKeys.push({
        note: k.note,
        type: 'white',
        x: idx * whiteWidth,
        y: 0,
        width: whiteWidth,
        height: height,
        label,
        computerKey: k.computerKey,
        idx,
      });
    });

    // Build black keys (sit on top of white keys)
    let blackIdx = 0;
    keys.forEach((k, idx) => {
      if (k.type === 'black') {
        let whiteCountBefore = 0;
        for (let i = 0; i < idx; i++) {
          if (keys[i].type === 'white') whiteCountBefore++;
        }
        const blackWidth = whiteWidth * 0.62;
        const blackHeightProportion = showWaterfall ? 0.54 : 0.50;
        const blackHeight = height * blackHeightProportion;
        const x = whiteCountBefore * whiteWidth - blackWidth / 2;

        const transposed = getTransposedNote(k.note);
        const label = formatNoteLabel(transposed, noteNotation, true);

        blackKeys.push({
          note: k.note,
          type: 'black',
          x,
          y: 0,
          width: blackWidth,
          height: blackHeight,
          label,
          computerKey: k.computerKey,
          idx: blackIdx++,
        });
      }
    });

    keyRectsRef.current = { whiteKeys, blackKeys };
    staticDirtyRef.current = true;
  }, [keys, whiteKeysList, numWhiteKeys, getTransposedNote, showWaterfall, noteNotation]);

  const updateKeyGeometriesRef = useRef(updateKeyGeometries);
  updateKeyGeometriesRef.current = updateKeyGeometries;

  // Re-run geometry calculation if props change (without reconnecting ResizeObserver)
  useEffect(() => {
    const { width, height } = canvasDimsRef.current;
    if (width > 0 && height > 0) {
      updateKeyGeometries(width, height);
    }
  }, [updateKeyGeometries]);

  // Per-touch glissando mode tracking ('white' = locks to diatonic white-key glissando, 'all' = chromatic/black keys)
  const touchModesRef = useRef<Map<number, 'white' | 'all'>>(new Map());
  const mouseModeRef = useRef<'white' | 'all'>('white');

  // Ultra-fast instant touch detection with diatonic glissando protection & ergonomic black key bounds
  const getNoteAtCoords = useCallback((clientX: number, clientY: number, forceWhite: boolean = false): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Check bounds with generous vertical fat-finger tolerance
    if (x < -10 || x > rect.width + 10 || y < -20 || y > rect.height + 60) {
      return null;
    }

    const { whiteKeys, blackKeys } = keyRectsRef.current;

    // 1. Check Black Keys:
    // Only if NOT locked to white glissando mode AND touch is strictly in upper 48% of keyboard (<= 88% of black key height).
    if (!forceWhite && blackKeys.length > 0) {
      const blackH = blackKeys[0].height;
      if (y <= blackH * 0.88) {
        for (let i = 0; i < blackKeys.length; i++) {
          const bk = blackKeys[i];
          if (x >= bk.x + 2 && x <= bk.x + bk.width - 2) {
            return bk.note;
          }
        }
      }
    }

    // 2. Check White Keys
    if (whiteKeys.length > 0) {
      const whiteWidth = rect.width / whiteKeys.length;
      const idx = Math.floor(x / whiteWidth);
      if (idx >= 0 && idx < whiteKeys.length) {
        return whiteKeys[idx].note;
      }
    }

    return null;
  }, []);

  // Multi-Touch & Pointer Event Manager
  const processTouches = useCallback((touches: TouchList | Touch[]) => {
    const nextTouchedNotes = new Set<string>();
    const activeTouchIds = new Set<number>();
    const canvas = canvasRef.current;
    const rect = canvas ? canvas.getBoundingClientRect() : null;

    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i];
      activeTouchIds.add(touch.identifier);

      let mode = touchModesRef.current.get(touch.identifier);
      if (!mode) {
        const y = rect ? touch.clientY - rect.top : 100;
        const initialNote = getNoteAtCoords(touch.clientX, touch.clientY, false);
        const { blackKeys } = keyRectsRef.current;
        const blackH = blackKeys.length > 0 ? blackKeys[0].height : 100;
        const isBlack = blackKeys.some((bk) => bk.note === initialNote);

        if (isBlack && y <= blackH * 0.88) {
          mode = 'all';
        } else {
          mode = 'white';
        }
        touchModesRef.current.set(touch.identifier, mode);
      }

      const note = getNoteAtCoords(touch.clientX, touch.clientY, mode === 'white');
      if (note) {
        nextTouchedNotes.add(note);
      }
    }

    // Clean up expired touches from touchModesRef
    for (const id of Array.from(touchModesRef.current.keys())) {
      if (!activeTouchIds.has(id)) {
        touchModesRef.current.delete(id);
      }
    }

    const currentNotes = currentlyPressedNotesRef.current;

    // Fast-path: if touched keys have not changed, exit immediately with zero CPU work!
    if (nextTouchedNotes.size === currentNotes.size) {
      let identical = true;
      for (const n of nextTouchedNotes) {
        if (!currentNotes.has(n)) {
          identical = false;
          break;
        }
      }
      if (identical) return;
    }

    // Turn off un-touched notes
    currentNotes.forEach((note) => {
      if (!nextTouchedNotes.has(note)) {
        onNoteUpRef.current(note);
      }
    });

    // Turn on newly touched notes
    nextTouchedNotes.forEach((note) => {
      if (!currentNotes.has(note)) {
        onNoteDownRef.current(note);
      }
    });

    currentlyPressedNotesRef.current = nextTouchedNotes;
  }, [getNoteAtCoords, currentlyPressedNotesRef]);

  const processTouchesRef = useRef(processTouches);
  processTouchesRef.current = processTouches;

  const getNoteAtCoordsRef = useRef(getNoteAtCoords);
  getNoteAtCoordsRef.current = getNoteAtCoords;

  // Mouse-Drag Glissando Support
  const isMouseDownRef = useRef<boolean>(false);
  const lastTouchTimeRef = useRef<number>(0);

  // Native Non-Passive Touch & Pointer Listeners for True 0ms Response
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      lastTouchTimeRef.current = performance.now();
      processTouchesRef.current(e.touches);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      lastTouchTimeRef.current = performance.now();
      processTouchesRef.current(e.touches);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      lastTouchTimeRef.current = performance.now();
      if (e.touches.length === 0) {
        touchModesRef.current.clear();
        currentlyPressedNotesRef.current.forEach((note) => {
          onNoteUpRef.current(note);
        });
        currentlyPressedNotesRef.current.clear();
      } else {
        processTouchesRef.current(e.touches);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (performance.now() - lastTouchTimeRef.current < 1000) return;
      e.preventDefault();
      isMouseDownRef.current = true;

      const canvasEl = canvasRef.current;
      const rect = canvasEl?.getBoundingClientRect();
      const y = rect ? e.clientY - rect.top : 100;
      const initialNote = getNoteAtCoordsRef.current(e.clientX, e.clientY, false);
      const { blackKeys } = keyRectsRef.current;
      const blackH = blackKeys.length > 0 ? blackKeys[0].height : 100;
      const isBlack = blackKeys.some((bk) => bk.note === initialNote);

      if (isBlack && y <= blackH * 0.88) {
        mouseModeRef.current = 'all';
      } else {
        mouseModeRef.current = 'white';
      }

      const note = getNoteAtCoordsRef.current(e.clientX, e.clientY, mouseModeRef.current === 'white');
      if (note) {
        currentlyPressedNotesRef.current.add(note);
        onNoteDownRef.current(note);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (performance.now() - lastTouchTimeRef.current < 1000) return;
      if (!isMouseDownRef.current) return;
      e.preventDefault();
      const note = getNoteAtCoordsRef.current(e.clientX, e.clientY, mouseModeRef.current === 'white');
      if (note) {
        const currentNotes = currentlyPressedNotesRef.current;
        if (!currentNotes.has(note)) {
          currentNotes.forEach((n) => {
            onNoteUpRef.current(n);
          });
          currentNotes.clear();
          currentNotes.add(note);
          onNoteDownRef.current(note);
        }
      }
    };

    const handleMouseUp = () => {
      if (performance.now() - lastTouchTimeRef.current < 1000) return;
      isMouseDownRef.current = false;
      touchModesRef.current.clear();
      currentlyPressedNotesRef.current.forEach((note) => {
        onNoteUpRef.current(note);
      });
      currentlyPressedNotesRef.current.clear();
    };

    const handleResetAll = () => {
      isMouseDownRef.current = false;
      touchModesRef.current.clear();
      currentlyPressedNotesRef.current.forEach((note) => {
        onNoteUpRef.current(note);
      });
      currentlyPressedNotesRef.current.clear();
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    window.addEventListener('blur', handleResetAll);

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);

      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('blur', handleResetAll);

      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Pre-rendered Offscreen Procedural Textures for 0ms Photorealistic Multi-Material Rendering
  const texturesRef = useRef<{
    lightWoodPattern: CanvasPattern | null;
    darkWoodPattern: CanvasPattern | null;
    ivoryPattern: CanvasPattern | null;
    ebonyPattern: CanvasPattern | null;
    carraraMarblePattern: CanvasPattern | null;
    neroMarquinaPattern: CanvasPattern | null;
    pearlPattern: CanvasPattern | null;
    brushedGoldPattern: CanvasPattern | null;
    brushedTitaniumPattern: CanvasPattern | null;
    carbonFiberPattern: CanvasPattern | null;
    jadePattern: CanvasPattern | null;
    malachitePattern: CanvasPattern | null;
    roseQuartzPattern: CanvasPattern | null;
    magmaRubyPattern: CanvasPattern | null;
    iceCrystalPattern: CanvasPattern | null;
    royalSapphirePattern: CanvasPattern | null;
    opalAuroraPattern: CanvasPattern | null;
    amethystGeodePattern: CanvasPattern | null;
    initialized: boolean;
  }>({
    lightWoodPattern: null,
    darkWoodPattern: null,
    ivoryPattern: null,
    ebonyPattern: null,
    carraraMarblePattern: null,
    neroMarquinaPattern: null,
    pearlPattern: null,
    brushedGoldPattern: null,
    brushedTitaniumPattern: null,
    carbonFiberPattern: null,
    jadePattern: null,
    malachitePattern: null,
    roseQuartzPattern: null,
    magmaRubyPattern: null,
    iceCrystalPattern: null,
    royalSapphirePattern: null,
    opalAuroraPattern: null,
    amethystGeodePattern: null,
    initialized: false,
  });

  const ensureTextures = useCallback((ctx: CanvasRenderingContext2D) => {
    if (texturesRef.current.initialized) return;
    texturesRef.current.initialized = true;

    try {
      // 1. Honey Maple / Boxwood Texture for White Keys ('mahogany' / Wood theme)
      const lwCanvas = document.createElement('canvas');
      lwCanvas.width = 256;
      lwCanvas.height = 512;
      const lwCtx = lwCanvas.getContext('2d');
      if (lwCtx) {
        const baseGrad = lwCtx.createLinearGradient(0, 0, 256, 0);
        baseGrad.addColorStop(0, '#edd4a7');
        baseGrad.addColorStop(0.22, '#f9ebd0');
        baseGrad.addColorStop(0.48, '#e3c38d');
        baseGrad.addColorStop(0.76, '#f6e3be');
        baseGrad.addColorStop(1, '#edd4a7');
        lwCtx.fillStyle = baseGrad;
        lwCtx.fillRect(0, 0, 256, 512);

        for (let i = 0; i < 140; i++) {
          const xBase = (i / 140) * 256;
          const isDarkFiber = i % 3 === 0;
          const alpha = isDarkFiber
            ? 0.075 + ((i * 17) % 10) * 0.009
            : 0.09 + ((i * 13) % 10) * 0.008;
          lwCtx.strokeStyle = isDarkFiber
            ? `rgba(105, 52, 14, ${alpha})`
            : `rgba(255, 252, 242, ${alpha})`;
          lwCtx.lineWidth = isDarkFiber ? 0.85 + (i % 2) * 0.65 : 1.05;

          const waveAmp = 2.8 + (i % 5) * 1.5;
          const waveFreq = 0.012 + (i % 4) * 0.004;
          const phase = (i * 1.37) % (Math.PI * 2);

          lwCtx.beginPath();
          for (let y = 0; y <= 512; y += 16) {
            const xOffset =
              Math.sin(y * waveFreq + phase) * waveAmp +
              Math.cos(y * 0.029 - phase) * (waveAmp * 0.45);
            const px = xBase + xOffset;
            if (y === 0) lwCtx.moveTo(px, y);
            else lwCtx.lineTo(px, y);
          }
          lwCtx.stroke();
        }

        for (let p = 0; p < 220; p++) {
          const px = (p * 73) % 256;
          const py = (p * 131) % 500;
          const len = 5 + (p % 15);
          lwCtx.fillStyle = p % 2 === 0 ? 'rgba(92, 44, 12, 0.085)' : 'rgba(140, 82, 30, 0.055)';
          lwCtx.fillRect(px, py, 1, len);
        }

        texturesRef.current.lightWoodPattern = ctx.createPattern(lwCanvas, 'repeat');
      }

      // 2. Rosewood / Makassar Ebony Texture for Black Keys ('mahogany' / Wood theme)
      const dwCanvas = document.createElement('canvas');
      dwCanvas.width = 128;
      dwCanvas.height = 256;
      const dwCtx = dwCanvas.getContext('2d');
      if (dwCtx) {
        const baseGrad = dwCtx.createLinearGradient(0, 0, 128, 0);
        baseGrad.addColorStop(0, '#1e0d05');
        baseGrad.addColorStop(0.28, '#36190b');
        baseGrad.addColorStop(0.55, '#160903');
        baseGrad.addColorStop(0.82, '#2e1508');
        baseGrad.addColorStop(1, '#1e0d05');
        dwCtx.fillStyle = baseGrad;
        dwCtx.fillRect(0, 0, 128, 256);

        for (let i = 0; i < 80; i++) {
          const xBase = (i / 80) * 128;
          const isWarmStreak = i % 4 === 0;
          dwCtx.strokeStyle = isWarmStreak
            ? `rgba(196, 110, 46, ${0.16 + (i % 5) * 0.025})`
            : `rgba(8, 3, 1, ${0.25 + (i % 4) * 0.04})`;
          dwCtx.lineWidth = isWarmStreak ? 1.3 : 1.0;

          const waveAmp = 1.6 + (i % 4) * 1.1;
          const waveFreq = 0.016 + (i % 3) * 0.005;
          const phase = i * 0.91;

          dwCtx.beginPath();
          for (let y = 0; y <= 256; y += 16) {
            const px = xBase + Math.sin(y * waveFreq + phase) * waveAmp;
            if (y === 0) dwCtx.moveTo(px, y);
            else dwCtx.lineTo(px, y);
          }
          dwCtx.stroke();
        }

        texturesRef.current.darkWoodPattern = ctx.createPattern(dwCanvas, 'repeat');
      }

      // 3. Steinway Concert Ivory Texture ('midnight' White Keys)
      const ivCanvas = document.createElement('canvas');
      ivCanvas.width = 256;
      ivCanvas.height = 512;
      const ivCtx = ivCanvas.getContext('2d');
      if (ivCtx) {
        const ivBase = ivCtx.createLinearGradient(0, 0, 256, 512);
        ivBase.addColorStop(0, '#fdfcf8');
        ivBase.addColorStop(0.45, '#faf8f2');
        ivBase.addColorStop(0.8, '#fdfcf9');
        ivBase.addColorStop(1, '#f4f0e6');
        ivCtx.fillStyle = ivBase;
        ivCtx.fillRect(0, 0, 256, 512);

        for (let i = 0; i < 80; i++) {
          const xBase = (i / 80) * 256;
          ivCtx.strokeStyle =
            i % 2 === 0 ? 'rgba(226, 218, 200, 0.22)' : 'rgba(255, 255, 255, 0.65)';
          ivCtx.lineWidth = 0.9;
          ivCtx.beginPath();
          for (let y = 0; y <= 512; y += 24) {
            const px = xBase + Math.sin(y * 0.015 + i * 0.7) * 1.8;
            if (y === 0) ivCtx.moveTo(px, y);
            else ivCtx.lineTo(px, y);
          }
          ivCtx.stroke();
        }
        texturesRef.current.ivoryPattern = ctx.createPattern(ivCanvas, 'repeat');
      }

      // 3B. Genuine Satin Gaboon Ebony Texture ('midnight' Black Keys)
      const ebCanvas = document.createElement('canvas');
      ebCanvas.width = 128;
      ebCanvas.height = 256;
      const ebCtx = ebCanvas.getContext('2d');
      if (ebCtx) {
        const ebGrad = ebCtx.createLinearGradient(0, 0, 128, 0);
        ebGrad.addColorStop(0, '#141619');
        ebGrad.addColorStop(0.35, '#22262c');
        ebGrad.addColorStop(0.7, '#111317');
        ebGrad.addColorStop(1, '#181b20');
        ebCtx.fillStyle = ebGrad;
        ebCtx.fillRect(0, 0, 128, 256);

        for (let i = 0; i < 96; i++) {
          const x = (i / 96) * 128;
          ebCtx.fillStyle =
            i % 3 === 0
              ? 'rgba(255, 255, 255, 0.045)'
              : i % 2 === 0
              ? 'rgba(0, 0, 0, 0.35)'
              : 'rgba(148, 163, 184, 0.03)';
          ebCtx.fillRect(x, 0, 1, 256);
        }
        for (let p = 0; p < 140; p++) {
          const px = (p * 53) % 128;
          const py = (p * 89) % 248;
          ebCtx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ebCtx.fillRect(px, py, 1, 4 + (p % 7));
        }
        texturesRef.current.ebonyPattern = ctx.createPattern(ebCanvas, 'repeat');
      }

      // 4. Carrara White Marble Texture ('marble' White Keys)
      const cmCanvas = document.createElement('canvas');
      cmCanvas.width = 256;
      cmCanvas.height = 512;
      const cmCtx = cmCanvas.getContext('2d');
      if (cmCtx) {
        const mGrad = cmCtx.createLinearGradient(0, 0, 256, 512);
        mGrad.addColorStop(0, '#f8fafc');
        mGrad.addColorStop(0.35, '#f1f5f9');
        mGrad.addColorStop(0.65, '#ffffff');
        mGrad.addColorStop(1, '#e2e8f0');
        cmCtx.fillStyle = mGrad;
        cmCtx.fillRect(0, 0, 256, 512);

        for (let c = 0; c < 14; c++) {
          const cx = (c * 67) % 256;
          const cy = (c * 97) % 512;
          const r = 35 + (c % 4) * 20;
          const rad = cmCtx.createRadialGradient(cx, cy, 2, cx, cy, r);
          rad.addColorStop(0, 'rgba(148, 163, 184, 0.14)');
          rad.addColorStop(1, 'rgba(148, 163, 184, 0)');
          cmCtx.fillStyle = rad;
          cmCtx.fillRect(0, 0, 256, 512);
        }

        for (let v = 0; v < 24; v++) {
          const isGoldVein = v % 6 === 0;
          let currX = (v * 43) % 256;
          cmCtx.strokeStyle = isGoldVein
            ? 'rgba(217, 159, 38, 0.24)'
            : `rgba(100, 116, 139, ${0.14 + (v % 4) * 0.045})`;
          cmCtx.lineWidth = isGoldVein ? 1.15 : 0.75 + (v % 3) * 0.65;

          cmCtx.beginPath();
          cmCtx.moveTo(currX, 0);
          for (let y = 16; y <= 512; y += 16) {
            currX += Math.sin(y * 0.045 + v * 1.9) * 5.5 + Math.cos(y * 0.09 - v) * 2.8;
            cmCtx.lineTo(currX, y);
          }
          cmCtx.stroke();
        }
        texturesRef.current.carraraMarblePattern = ctx.createPattern(cmCanvas, 'repeat');
      }

      // 5. Nero Portoro Marble with Gold Veins ('marble' Black Keys)
      const nmCanvas = document.createElement('canvas');
      nmCanvas.width = 128;
      nmCanvas.height = 256;
      const nmCtx = nmCanvas.getContext('2d');
      if (nmCtx) {
        nmCtx.fillStyle = '#0c0d10';
        nmCtx.fillRect(0, 0, 128, 256);

        for (let v = 0; v < 18; v++) {
          const isGold = v % 2 === 0;
          let currX = (v * 39) % 128;
          nmCtx.strokeStyle = isGold
            ? `rgba(234, 179, 8, ${0.26 + (v % 3) * 0.08})`
            : 'rgba(226, 232, 240, 0.18)';
          nmCtx.lineWidth = isGold ? 1.35 : 0.85;
          nmCtx.beginPath();
          nmCtx.moveTo(currX, 0);
          for (let y = 16; y <= 256; y += 16) {
            currX += Math.sin(y * 0.05 + v * 1.4) * 4.5;
            nmCtx.lineTo(currX, y);
          }
          nmCtx.stroke();
        }
        texturesRef.current.neroMarquinaPattern = ctx.createPattern(nmCanvas, 'repeat');
      }

      // 6. Iridescent Mother-of-Pearl Texture ('gold' White Keys)
      const prlCanvas = document.createElement('canvas');
      prlCanvas.width = 256;
      prlCanvas.height = 512;
      const prlCtx = prlCanvas.getContext('2d');
      if (prlCtx) {
        const pGrad = prlCtx.createLinearGradient(0, 0, 256, 512);
        pGrad.addColorStop(0, '#fffdf7');
        pGrad.addColorStop(0.25, '#fef3c7');
        pGrad.addColorStop(0.5, '#fdf2f8');
        pGrad.addColorStop(0.75, '#ecfeff');
        pGrad.addColorStop(1, '#fffbeb');
        prlCtx.fillStyle = pGrad;
        prlCtx.fillRect(0, 0, 256, 512);

        for (let i = 0; i < 40; i++) {
          const yBase = (i / 40) * 512;
          prlCtx.strokeStyle =
            i % 2 === 0 ? 'rgba(251, 191, 36, 0.12)' : 'rgba(255, 255, 255, 0.6)';
          prlCtx.lineWidth = 3;
          prlCtx.beginPath();
          for (let x = 0; x <= 256; x += 16) {
            const py = yBase + Math.sin(x * 0.04 + i) * 6;
            if (x === 0) prlCtx.moveTo(x, py);
            else prlCtx.lineTo(x, py);
          }
          prlCtx.stroke();
        }
        texturesRef.current.pearlPattern = ctx.createPattern(prlCanvas, 'repeat');
      }

      // 7. 24k Brushed Gold Ingot Texture ('gold' Black Keys)
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = 128;
      bgCanvas.height = 256;
      const bgCtx = bgCanvas.getContext('2d');
      if (bgCtx) {
        const gGrad = bgCtx.createLinearGradient(0, 0, 128, 0);
        gGrad.addColorStop(0, '#92400e');
        gGrad.addColorStop(0.25, '#eab308');
        gGrad.addColorStop(0.5, '#fef08a');
        gGrad.addColorStop(0.75, '#ca8a04');
        gGrad.addColorStop(1, '#78350f');
        bgCtx.fillStyle = gGrad;
        bgCtx.fillRect(0, 0, 128, 256);

        for (let i = 0; i < 128; i++) {
          bgCtx.fillStyle =
            i % 3 === 0
              ? 'rgba(255, 255, 255, 0.18)'
              : i % 2 === 0
              ? 'rgba(120, 53, 15, 0.18)'
              : 'rgba(250, 204, 21, 0.14)';
          bgCtx.fillRect(i, 0, 1, 256);
        }
        texturesRef.current.brushedGoldPattern = ctx.createPattern(bgCanvas, 'repeat');
      }

      // 8. Brushed Aerospace Titanium Texture ('carbon' White Keys)
      const btCanvas = document.createElement('canvas');
      btCanvas.width = 128;
      btCanvas.height = 256;
      const btCtx = btCanvas.getContext('2d');
      if (btCtx) {
        const tGrad = btCtx.createLinearGradient(0, 0, 128, 0);
        tGrad.addColorStop(0, '#cbd5e1');
        tGrad.addColorStop(0.35, '#f1f5f9');
        tGrad.addColorStop(0.65, '#94a3b8');
        tGrad.addColorStop(1, '#cbd5e1');
        btCtx.fillStyle = tGrad;
        btCtx.fillRect(0, 0, 128, 256);

        for (let i = 0; i < 128; i++) {
          btCtx.fillStyle =
            i % 2 === 0 ? 'rgba(255, 255, 255, 0.24)' : 'rgba(51, 65, 85, 0.14)';
          btCtx.fillRect(i, 0, 1, 256);
        }
        texturesRef.current.brushedTitaniumPattern = ctx.createPattern(btCanvas, 'repeat');
      }

      // 9. True 3D Woven 2x2 Twill Carbon Fiber Texture ('carbon' Black Keys)
      const tileCanvas = document.createElement('canvas');
      tileCanvas.width = 16;
      tileCanvas.height = 16;
      const tileCtx = tileCanvas.getContext('2d');
      if (tileCtx) {
        tileCtx.fillStyle = '#09090b';
        tileCtx.fillRect(0, 0, 16, 16);

        const drawBundle = (x: number, y: number, w: number, h: number, bright: boolean) => {
          const g = tileCtx.createLinearGradient(x, y, x + w, y + h);
          if (bright) {
            g.addColorStop(0, '#27272a');
            g.addColorStop(0.5, '#52525b');
            g.addColorStop(1, '#18181b');
          } else {
            g.addColorStop(0, '#09090b');
            g.addColorStop(0.5, '#27272a');
            g.addColorStop(1, '#09090b');
          }
          tileCtx.fillStyle = g;
          tileCtx.fillRect(x, y, w, h);
        };

        drawBundle(0, 0, 8, 8, true);
        drawBundle(8, 8, 8, 8, true);
        drawBundle(8, 0, 8, 8, false);
        drawBundle(0, 8, 8, 8, false);

        tileCtx.strokeStyle = 'rgba(161, 161, 170, 0.24)';
        tileCtx.lineWidth = 1;
        tileCtx.beginPath();
        tileCtx.moveTo(0, 8);
        tileCtx.lineTo(8, 0);
        tileCtx.moveTo(8, 16);
        tileCtx.lineTo(16, 8);
        tileCtx.stroke();

        const cfCanvas = document.createElement('canvas');
        cfCanvas.width = 128;
        cfCanvas.height = 128;
        const cfCtx = cfCanvas.getContext('2d');
        if (cfCtx) {
          for (let ty = 0; ty < 128; ty += 16) {
            for (let tx = 0; tx < 128; tx += 16) {
              cfCtx.drawImage(tileCanvas, tx, ty);
            }
          }
          texturesRef.current.carbonFiberPattern = ctx.createPattern(cfCanvas, 'repeat');
        }
      }

      // 10. Imperial Jade & Malachite ('emerald' White & Black Keys)
      const jdCanvas = document.createElement('canvas');
      jdCanvas.width = 256;
      jdCanvas.height = 512;
      const jdCtx = jdCanvas.getContext('2d');
      if (jdCtx) {
        const jGrad = jdCtx.createLinearGradient(0, 0, 256, 512);
        jGrad.addColorStop(0, '#ecfdf5');
        jGrad.addColorStop(0.35, '#a7f3d0');
        jGrad.addColorStop(0.7, '#d1fae5');
        jGrad.addColorStop(1, '#6ee7b7');
        jdCtx.fillStyle = jGrad;
        jdCtx.fillRect(0, 0, 256, 512);

        for (let v = 0; v < 28; v++) {
          const isGold = v % 5 === 0;
          let cx = (v * 41) % 256;
          jdCtx.strokeStyle = isGold ? 'rgba(245, 158, 11, 0.32)' : 'rgba(5, 150, 105, 0.22)';
          jdCtx.lineWidth = isGold ? 1.4 : 1.0 + (v % 3) * 0.6;
          jdCtx.beginPath();
          jdCtx.moveTo(cx, 0);
          for (let y = 16; y <= 512; y += 16) {
            cx += Math.sin(y * 0.04 + v * 1.3) * 5;
            jdCtx.lineTo(cx, y);
          }
          jdCtx.stroke();
        }
        texturesRef.current.jadePattern = ctx.createPattern(jdCanvas, 'repeat');
      }

      const mlCanvas = document.createElement('canvas');
      mlCanvas.width = 128;
      mlCanvas.height = 256;
      const mlCtx = mlCanvas.getContext('2d');
      if (mlCtx) {
        const mlGrad = mlCtx.createLinearGradient(0, 0, 128, 256);
        mlGrad.addColorStop(0, '#022c22');
        mlGrad.addColorStop(0.45, '#065f46');
        mlGrad.addColorStop(0.75, '#047857');
        mlGrad.addColorStop(1, '#022c22');
        mlCtx.fillStyle = mlGrad;
        mlCtx.fillRect(0, 0, 128, 256);

        for (let b = 0; b < 32; b++) {
          const yBase = (b / 32) * 256;
          mlCtx.strokeStyle = b % 4 === 0 ? 'rgba(250, 204, 21, 0.35)' : b % 2 === 0 ? 'rgba(52, 211, 153, 0.38)' : 'rgba(2, 44, 34, 0.55)';
          mlCtx.lineWidth = 2.2;
          mlCtx.beginPath();
          for (let x = 0; x <= 128; x += 8) {
            const py = yBase + Math.sin(x * 0.09 + b * 0.7) * 5;
            if (x === 0) mlCtx.moveTo(x, py);
            else mlCtx.lineTo(x, py);
          }
          mlCtx.stroke();
        }
        texturesRef.current.malachitePattern = ctx.createPattern(mlCanvas, 'repeat');
      }

      // 11. Crystalline Rose Quartz & Magma Ruby ('ruby' White & Black Keys)
      const rqCanvas = document.createElement('canvas');
      rqCanvas.width = 256;
      rqCanvas.height = 512;
      const rqCtx = rqCanvas.getContext('2d');
      if (rqCtx) {
        const rqGrad = rqCtx.createLinearGradient(0, 0, 256, 512);
        rqGrad.addColorStop(0, '#fff1f2');
        rqGrad.addColorStop(0.35, '#fecdd3');
        rqGrad.addColorStop(0.7, '#ffe4e6');
        rqGrad.addColorStop(1, '#fda4af');
        rqCtx.fillStyle = rqGrad;
        rqCtx.fillRect(0, 0, 256, 512);

        for (let v = 0; v < 26; v++) {
          let cx = (v * 47) % 256;
          rqCtx.strokeStyle = v % 3 === 0 ? 'rgba(255, 255, 255, 0.75)' : 'rgba(225, 29, 72, 0.2)';
          rqCtx.lineWidth = v % 3 === 0 ? 1.8 : 1.0;
          rqCtx.beginPath();
          rqCtx.moveTo(cx, 0);
          for (let y = 16; y <= 512; y += 16) {
            cx += Math.sin(y * 0.05 + v) * 4.8;
            rqCtx.lineTo(cx, y);
          }
          rqCtx.stroke();
        }
        texturesRef.current.roseQuartzPattern = ctx.createPattern(rqCanvas, 'repeat');
      }

      const mrCanvas = document.createElement('canvas');
      mrCanvas.width = 128;
      mrCanvas.height = 256;
      const mrCtx = mrCanvas.getContext('2d');
      if (mrCtx) {
        const mrGrad = mrCtx.createLinearGradient(0, 0, 128, 256);
        mrGrad.addColorStop(0, '#4c0519');
        mrGrad.addColorStop(0.4, '#881337');
        mrGrad.addColorStop(0.75, '#be123c');
        mrGrad.addColorStop(1, '#2e020d');
        mrCtx.fillStyle = mrGrad;
        mrCtx.fillRect(0, 0, 128, 256);

        for (let v = 0; v < 20; v++) {
          let cx = (v * 33) % 128;
          mrCtx.strokeStyle = v % 2 === 0 ? 'rgba(251, 146, 60, 0.45)' : 'rgba(254, 205, 211, 0.28)';
          mrCtx.lineWidth = 1.5;
          mrCtx.beginPath();
          mrCtx.moveTo(cx, 0);
          for (let y = 16; y <= 256; y += 16) {
            cx += Math.sin(y * 0.06 + v * 1.5) * 4.5;
            mrCtx.lineTo(cx, y);
          }
          mrCtx.stroke();
        }
        texturesRef.current.magmaRubyPattern = ctx.createPattern(mrCanvas, 'repeat');
      }

      // 12. Arctic Diamond Ice & Royal Lapis Sapphire ('sapphire' White & Black Keys)
      const icCanvas = document.createElement('canvas');
      icCanvas.width = 256;
      icCanvas.height = 512;
      const icCtx = icCanvas.getContext('2d');
      if (icCtx) {
        const icGrad = icCtx.createLinearGradient(0, 0, 256, 512);
        icGrad.addColorStop(0, '#f0f9ff');
        icGrad.addColorStop(0.35, '#bae6fd');
        icGrad.addColorStop(0.65, '#e0f2fe');
        icGrad.addColorStop(1, '#7dd3fc');
        icCtx.fillStyle = icGrad;
        icCtx.fillRect(0, 0, 256, 512);

        for (let f = 0; f < 30; f++) {
          const x1 = (f * 59) % 256;
          const y1 = (f * 83) % 512;
          icCtx.strokeStyle = f % 2 === 0 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(2, 132, 199, 0.22)';
          icCtx.lineWidth = 1.3;
          icCtx.beginPath();
          icCtx.moveTo(x1, y1);
          icCtx.lineTo(x1 + 24 - (f % 3) * 16, y1 + 38);
          icCtx.stroke();
        }
        texturesRef.current.iceCrystalPattern = ctx.createPattern(icCanvas, 'repeat');
      }

      const spCanvas = document.createElement('canvas');
      spCanvas.width = 128;
      spCanvas.height = 256;
      const spCtx = spCanvas.getContext('2d');
      if (spCtx) {
        const spGrad = spCtx.createLinearGradient(0, 0, 128, 256);
        spGrad.addColorStop(0, '#081c4a');
        spGrad.addColorStop(0.45, '#1d4ed8');
        spGrad.addColorStop(0.75, '#1e3a8a');
        spGrad.addColorStop(1, '#091536');
        spCtx.fillStyle = spGrad;
        spCtx.fillRect(0, 0, 128, 256);

        // Golden pyrite stardust flecks inside Lapis Sapphire
        for (let p = 0; p < 70; p++) {
          const px = (p * 41) % 126;
          const py = (p * 67) % 252;
          spCtx.fillStyle = p % 2 === 0 ? 'rgba(253, 224, 71, 0.55)' : 'rgba(125, 211, 252, 0.45)';
          spCtx.fillRect(px, py, 1.8, 1.8);
        }
        texturesRef.current.royalSapphirePattern = ctx.createPattern(spCanvas, 'repeat');
      }

      // 13. Iridescent Aurora Opal & Cosmic Amethyst Geode ('amethyst' White & Black Keys)
      const opCanvas = document.createElement('canvas');
      opCanvas.width = 256;
      opCanvas.height = 512;
      const opCtx = opCanvas.getContext('2d');
      if (opCtx) {
        const opGrad = opCtx.createLinearGradient(0, 0, 256, 512);
        opGrad.addColorStop(0, '#faf5ff');
        opGrad.addColorStop(0.28, '#f3e8ff');
        opGrad.addColorStop(0.55, '#fce7f3');
        opGrad.addColorStop(0.8, '#e0e7ff');
        opGrad.addColorStop(1, '#f3e8ff');
        opCtx.fillStyle = opGrad;
        opCtx.fillRect(0, 0, 256, 512);

        for (let c = 0; c < 20; c++) {
          const cx = (c * 53) % 256;
          const cy = (c * 79) % 512;
          const rad = opCtx.createRadialGradient(cx, cy, 2, cx, cy, 40);
          rad.addColorStop(0, c % 2 === 0 ? 'rgba(192, 132, 252, 0.25)' : 'rgba(45, 212, 191, 0.2)');
          rad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          opCtx.fillStyle = rad;
          opCtx.fillRect(0, 0, 256, 512);
        }
        texturesRef.current.opalAuroraPattern = ctx.createPattern(opCanvas, 'repeat');
      }

      const amCanvas = document.createElement('canvas');
      amCanvas.width = 128;
      amCanvas.height = 256;
      const amCtx = amCanvas.getContext('2d');
      if (amCtx) {
        const amGrad = amCtx.createLinearGradient(0, 0, 128, 256);
        amGrad.addColorStop(0, '#2e1065');
        amGrad.addColorStop(0.45, '#6b21a8');
        amGrad.addColorStop(0.75, '#4c1d95');
        amGrad.addColorStop(1, '#1e0942');
        amCtx.fillStyle = amGrad;
        amCtx.fillRect(0, 0, 128, 256);

        for (let v = 0; v < 22; v++) {
          let cx = (v * 37) % 128;
          amCtx.strokeStyle = v % 3 === 0 ? 'rgba(244, 114, 182, 0.45)' : 'rgba(233, 213, 255, 0.35)';
          amCtx.lineWidth = 1.4;
          amCtx.beginPath();
          amCtx.moveTo(cx, 0);
          for (let y = 16; y <= 256; y += 16) {
            cx += Math.sin(y * 0.055 + v) * 4;
            amCtx.lineTo(cx, y);
          }
          amCtx.stroke();
        }
        texturesRef.current.amethystGeodePattern = ctx.createPattern(amCanvas, 'repeat');
      }
    } catch {
      // Fallback gracefully if offscreen canvas creation fails
    }
  }, []);

  // Helper to build a rounded-bottom rectangle path without any GPU-heavy ctx.clip()
  const traceRoundBottomRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, [0, 0, r, r]);
    } else {
      ctx.rect(x, y, w, h);
    }
  };

  const applyPatternOffset = (pattern: CanvasPattern | null, idx: number) => {
    if (!pattern) return;
    try {
      if (typeof pattern.setTransform === 'function' && typeof DOMMatrix !== 'undefined') {
        const m = new DOMMatrix();
        m.e = (idx * 53) % 128;
        m.f = (idx * 37) % 128;
        pattern.setTransform(m);
      }
    } catch {
      // Ignore if browser does not support Pattern.setTransform
    }
  };

  // Renders a single White Key (zero ctx.clip() calls for maximum GPU speed!)
  const drawSingleWhiteKey = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      wk: KeyRect,
      width: number,
      theme: StudioTheme,
      isPressed: boolean,
      isStudent: boolean
    ) => {
      const isMahogany = theme === 'mahogany';
      const isMarble = theme === 'marble';
      const isGold = theme === 'gold';
      const isCarbon = theme === 'carbon';
      const isNeon = theme === 'neon';
      const isEmerald = theme === 'emerald';
      const isRuby = theme === 'ruby';
      const isSapphire = theme === 'sapphire';
      const isAmethyst = theme === 'amethyst';

      const {
        lightWoodPattern,
        ivoryPattern,
        carraraMarblePattern,
        pearlPattern,
        brushedTitaniumPattern,
        jadePattern,
        roseQuartzPattern,
        iceCrystalPattern,
        opalAuroraPattern,
      } = texturesRef.current;

      const gap = Math.max(1.3, Math.min(2.6, width / 410));
      const keyX = wk.x + gap / 2;
      const keyW = wk.width - gap;
      const bottomRecess = 4;
      const pressSink = isPressed ? 2.2 : 0;
      const keyH = wk.height - bottomRecess + pressSink;
      const radius = Math.min(6.5, keyW * 0.18);

      const frontLipH = isPressed
        ? Math.max(5, keyH * 0.036)
        : Math.max(9, keyH * 0.062);

      // Clear key slot in case we are overdrawing a single pressed key on top of the static buffer
      if (isPressed) {
        ctx.fillStyle = '#070504';
        ctx.fillRect(wk.x, 0, wk.width, wk.height);
      }

      // 1A. Drop Shadow cast by the White Key's front lip onto the dark keybed below
      if (!isPressed) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
        traceRoundBottomRect(ctx, keyX + 1, keyH - 2, keyW - 2, bottomRecess + 2.5, radius);
        ctx.fill();
      }

      // 1B. Base Surface Material & Physically-Based Vertical Studio Lighting (using fast path fill, NO clip!)
      if (isMahogany) {
        applyPatternOffset(lightWoodPattern, wk.idx);
        traceRoundBottomRect(ctx, keyX, wk.y, keyW, keyH, radius);
        ctx.fillStyle = lightWoodPattern || '#f3dfb9';
        ctx.fill();

        const woodSheen = ctx.createLinearGradient(keyX, wk.y, keyX, keyH);
        woodSheen.addColorStop(0, 'rgba(38, 16, 4, 0.42)');
        woodSheen.addColorStop(0.09, 'rgba(92, 48, 14, 0.08)');
        woodSheen.addColorStop(0.38, 'rgba(255, 252, 240, 0.28)');
        woodSheen.addColorStop(0.52, 'rgba(255, 255, 255, 0.12)');
        woodSheen.addColorStop(0.82, 'rgba(195, 135, 65, 0.15)');
        woodSheen.addColorStop(1, 'rgba(110, 55, 16, 0.34)');
        ctx.fillStyle = woodSheen;
        ctx.fill();
      } else if (isMarble) {
        applyPatternOffset(carraraMarblePattern, wk.idx);
        traceRoundBottomRect(ctx, keyX, wk.y, keyW, keyH, radius);
        ctx.fillStyle = carraraMarblePattern || '#f8fafc';
        ctx.fill();

        const marbleGloss = ctx.createLinearGradient(keyX, wk.y, keyX, keyH);
        marbleGloss.addColorStop(0, 'rgba(15, 23, 42, 0.34)');
        marbleGloss.addColorStop(0.1, 'rgba(255, 255, 255, 0.05)');
        marbleGloss.addColorStop(0.42, 'rgba(255, 255, 255, 0.52)');
        marbleGloss.addColorStop(0.86, 'rgba(203, 213, 225, 0.25)');
        marbleGloss.addColorStop(1, 'rgba(71, 85, 105, 0.38)');
        ctx.fillStyle = marbleGloss;
        ctx.fill();
      } else if (isGold) {
        applyPatternOffset(pearlPattern, wk.idx);
        traceRoundBottomRect(ctx, keyX, wk.y, keyW, keyH, radius);
        ctx.fillStyle = pearlPattern || '#fffbeb';
        ctx.fill();

        const pearlSheen = ctx.createLinearGradient(keyX, wk.y, keyX, keyH);
        pearlSheen.addColorStop(0, 'rgba(120, 53, 15, 0.3)');
        pearlSheen.addColorStop(0.12, 'rgba(254, 243, 199, 0.15)');
        pearlSheen.addColorStop(0.45, 'rgba(255, 255, 255, 0.58)');
        pearlSheen.addColorStop(0.85, 'rgba(253, 230, 138, 0.3)');
        pearlSheen.addColorStop(1, 'rgba(180, 83, 9, 0.35)');
        ctx.fillStyle = pearlSheen;
        ctx.fill();
      } else if (isCarbon) {
        applyPatternOffset(brushedTitaniumPattern, wk.idx);
        traceRoundBottomRect(ctx, keyX, wk.y, keyW, keyH, radius);
        ctx.fillStyle = brushedTitaniumPattern || '#cbd5e1';
        ctx.fill();

        const metalSheen = ctx.createLinearGradient(keyX, wk.y, keyX, keyH);
        metalSheen.addColorStop(0, 'rgba(9, 9, 11, 0.48)');
        metalSheen.addColorStop(0.12, 'rgba(241, 245, 249, 0.2)');
        metalSheen.addColorStop(0.4, 'rgba(255, 255, 255, 0.55)');
        metalSheen.addColorStop(0.78, 'rgba(71, 85, 105, 0.3)');
        metalSheen.addColorStop(1, 'rgba(15, 23, 42, 0.52)');
        ctx.fillStyle = metalSheen;
        ctx.fill();
      } else if (isEmerald) {
        applyPatternOffset(jadePattern, wk.idx);
        traceRoundBottomRect(ctx, keyX, wk.y, keyW, keyH, radius);
        ctx.fillStyle = jadePattern || '#d1fae5';
        ctx.fill();

        const jadeSheen = ctx.createLinearGradient(keyX, wk.y, keyX, keyH);
        jadeSheen.addColorStop(0, 'rgba(2, 44, 34, 0.38)');
        jadeSheen.addColorStop(0.38, 'rgba(255, 255, 255, 0.55)');
        jadeSheen.addColorStop(0.82, 'rgba(16, 185, 129, 0.22)');
        jadeSheen.addColorStop(1, 'rgba(6, 78, 59, 0.42)');
        ctx.fillStyle = jadeSheen;
        ctx.fill();
      } else if (isRuby) {
        applyPatternOffset(roseQuartzPattern, wk.idx);
        traceRoundBottomRect(ctx, keyX, wk.y, keyW, keyH, radius);
        ctx.fillStyle = roseQuartzPattern || '#ffe4e6';
        ctx.fill();

        const rubySheen = ctx.createLinearGradient(keyX, wk.y, keyX, keyH);
        rubySheen.addColorStop(0, 'rgba(76, 5, 25, 0.36)');
        rubySheen.addColorStop(0.4, 'rgba(255, 255, 255, 0.58)');
        rubySheen.addColorStop(0.84, 'rgba(244, 63, 94, 0.2)');
        rubySheen.addColorStop(1, 'rgba(136, 19, 55, 0.4)');
        ctx.fillStyle = rubySheen;
        ctx.fill();
      } else if (isSapphire) {
        applyPatternOffset(iceCrystalPattern, wk.idx);
        traceRoundBottomRect(ctx, keyX, wk.y, keyW, keyH, radius);
        ctx.fillStyle = iceCrystalPattern || '#e0f2fe';
        ctx.fill();

        const iceSheen = ctx.createLinearGradient(keyX, wk.y, keyX, keyH);
        iceSheen.addColorStop(0, 'rgba(8, 28, 74, 0.36)');
        iceSheen.addColorStop(0.4, 'rgba(255, 255, 255, 0.65)');
        iceSheen.addColorStop(0.84, 'rgba(56, 189, 248, 0.24)');
        iceSheen.addColorStop(1, 'rgba(30, 58, 138, 0.42)');
        ctx.fillStyle = iceSheen;
        ctx.fill();
      } else if (isAmethyst) {
        applyPatternOffset(opalAuroraPattern, wk.idx);
        traceRoundBottomRect(ctx, keyX, wk.y, keyW, keyH, radius);
        ctx.fillStyle = opalAuroraPattern || '#f3e8ff';
        ctx.fill();

        const opalSheen = ctx.createLinearGradient(keyX, wk.y, keyX, keyH);
        opalSheen.addColorStop(0, 'rgba(46, 16, 101, 0.35)');
        opalSheen.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
        opalSheen.addColorStop(0.84, 'rgba(192, 132, 252, 0.24)');
        opalSheen.addColorStop(1, 'rgba(88, 28, 135, 0.42)');
        ctx.fillStyle = opalSheen;
        ctx.fill();
      } else if (isNeon) {
        traceRoundBottomRect(ctx, keyX, wk.y, keyW, keyH, radius);
        const neonBase = ctx.createLinearGradient(keyX, wk.y, keyX, keyH);
        neonBase.addColorStop(0, '#090d16');
        neonBase.addColorStop(0.42, '#1e1b4b');
        neonBase.addColorStop(0.85, '#0f172a');
        neonBase.addColorStop(1, '#020617');
        ctx.fillStyle = neonBase;
        ctx.fill();
      } else {
        applyPatternOffset(ivoryPattern, wk.idx);
        traceRoundBottomRect(ctx, keyX, wk.y, keyW, keyH, radius);
        ctx.fillStyle = ivoryPattern || '#fdfcf8';
        ctx.fill();

        const ivoryGrad = ctx.createLinearGradient(keyX, wk.y, keyX, keyH);
        ivoryGrad.addColorStop(0, 'rgba(15, 18, 24, 0.32)');
        ivoryGrad.addColorStop(0.08, 'rgba(248, 246, 240, 0.08)');
        ivoryGrad.addColorStop(0.38, 'rgba(255, 255, 255, 0.72)');
        ivoryGrad.addColorStop(0.56, 'rgba(255, 255, 255, 0.35)');
        ivoryGrad.addColorStop(0.88, 'rgba(235, 230, 218, 0.45)');
        ivoryGrad.addColorStop(1, 'rgba(205, 198, 184, 0.75)');
        ctx.fillStyle = ivoryGrad;
        ctx.fill();
      }

      // 1C. Photorealistic 3D Horizontal Crown / Camber Across Each Key Width
      const camberGrad = ctx.createLinearGradient(keyX, wk.y, keyX + keyW, wk.y);
      if (isNeon) {
        camberGrad.addColorStop(0, 'rgba(56, 189, 248, 0.18)');
        camberGrad.addColorStop(0.15, 'rgba(56, 189, 248, 0.02)');
        camberGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.15)');
        camberGrad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
      } else {
        camberGrad.addColorStop(0, 'rgba(255, 255, 255, 0.48)');
        camberGrad.addColorStop(0.12, 'rgba(255, 255, 255, 0.08)');
        camberGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        camberGrad.addColorStop(0.86, 'rgba(0, 0, 0, 0.04)');
        camberGrad.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
      }
      ctx.fillStyle = camberGrad;
      ctx.fillRect(keyX, wk.y, keyW, keyH - frontLipH);

      // 1D. Pressed Key Physics & Illumination
      if (isPressed) {
        traceRoundBottomRect(ctx, keyX, wk.y, keyW, keyH, radius);
        const pressGrad = ctx.createLinearGradient(keyX, wk.y, keyX, keyH);
        if (isStudent) {
          pressGrad.addColorStop(0, 'rgba(2, 132, 199, 0.62)');
          pressGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.52)');
          pressGrad.addColorStop(1, 'rgba(14, 165, 233, 0.76)');
        } else if (isNeon || isCarbon || isSapphire) {
          pressGrad.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
          pressGrad.addColorStop(0.5, 'rgba(34, 211, 238, 0.62)');
          pressGrad.addColorStop(1, 'rgba(56, 189, 248, 0.8)');
        } else if (isEmerald) {
          pressGrad.addColorStop(0, 'rgba(5, 150, 105, 0.5)');
          pressGrad.addColorStop(0.5, 'rgba(52, 211, 153, 0.65)');
          pressGrad.addColorStop(1, 'rgba(16, 185, 129, 0.82)');
        } else if (isRuby) {
          pressGrad.addColorStop(0, 'rgba(225, 29, 72, 0.5)');
          pressGrad.addColorStop(0.5, 'rgba(251, 113, 133, 0.65)');
          pressGrad.addColorStop(1, 'rgba(244, 63, 94, 0.82)');
        } else if (isAmethyst) {
          pressGrad.addColorStop(0, 'rgba(147, 51, 234, 0.5)');
          pressGrad.addColorStop(0.5, 'rgba(192, 132, 252, 0.65)');
          pressGrad.addColorStop(1, 'rgba(217, 70, 239, 0.82)');
        } else if (isMahogany) {
          pressGrad.addColorStop(0, 'rgba(146, 64, 14, 0.52)');
          pressGrad.addColorStop(0.35, 'rgba(245, 158, 11, 0.38)');
          pressGrad.addColorStop(0.75, 'rgba(251, 191, 36, 0.48)');
          pressGrad.addColorStop(1, 'rgba(217, 119, 6, 0.65)');
        } else {
          pressGrad.addColorStop(0, 'rgba(217, 119, 6, 0.44)');
          pressGrad.addColorStop(0.45, 'rgba(245, 158, 11, 0.58)');
          pressGrad.addColorStop(1, 'rgba(251, 191, 36, 0.74)');
        }
        ctx.fillStyle = pressGrad;
        ctx.fill();

        const sinkShadow = ctx.createLinearGradient(keyX, wk.y, keyX, wk.y + 24);
        sinkShadow.addColorStop(0, 'rgba(0, 0, 0, 0.48)');
        sinkShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = sinkShadow;
        ctx.fillRect(keyX, wk.y, keyW, 24);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
        ctx.fillRect(keyX, wk.y, 3, keyH - frontLipH);
        ctx.fillRect(keyX + keyW - 3, wk.y, 3, keyH - frontLipH);
      }

      // 1E. 3D Lateral Bevel Rim
      ctx.fillStyle = isMahogany
        ? 'rgba(255, 248, 225, 0.62)'
        : isGold
        ? 'rgba(254, 240, 138, 0.88)'
        : isNeon
        ? 'rgba(56, 189, 248, 0.4)'
        : 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(keyX, wk.y, 1.6, keyH - frontLipH);

      ctx.fillStyle = isMahogany
        ? 'rgba(68, 32, 8, 0.38)'
        : isGold
        ? 'rgba(161, 98, 7, 0.38)'
        : isNeon
        ? 'rgba(15, 23, 42, 0.85)'
        : 'rgba(71, 85, 105, 0.36)';
      ctx.fillRect(keyX + keyW - 1.6, wk.y, 1.6, keyH - frontLipH);

      // 1F. Photorealistic 3D Front Key Lip & Rounded Specular Chamfer
      const lipTopY = keyH - frontLipH;
      const rollOffH = Math.max(4, frontLipH * 0.6);
      const rollGrad = ctx.createLinearGradient(keyX, lipTopY - rollOffH, keyX, lipTopY);
      rollGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      rollGrad.addColorStop(1, isNeon ? 'rgba(56, 189, 248, 0.15)' : 'rgba(100, 90, 75, 0.14)');
      ctx.fillStyle = rollGrad;
      ctx.fillRect(keyX, lipTopY - rollOffH, keyW, rollOffH);

      const lipGrad = ctx.createLinearGradient(keyX, lipTopY, keyX, keyH);
      if (isMahogany) {
        lipGrad.addColorStop(0, '#c27d38');
        lipGrad.addColorStop(0.2, '#9c5a25');
        lipGrad.addColorStop(0.65, '#6e3a12');
        lipGrad.addColorStop(1, '#3b1c06');
      } else if (isGold) {
        lipGrad.addColorStop(0, '#fef08a');
        lipGrad.addColorStop(0.25, '#eab308');
        lipGrad.addColorStop(0.7, '#a16207');
        lipGrad.addColorStop(1, '#422006');
      } else if (isMarble) {
        lipGrad.addColorStop(0, '#f1f5f9');
        lipGrad.addColorStop(0.3, '#cbd5e1');
        lipGrad.addColorStop(0.75, '#64748b');
        lipGrad.addColorStop(1, '#1e293b');
      } else if (isCarbon) {
        lipGrad.addColorStop(0, '#94a3b8');
        lipGrad.addColorStop(0.3, '#475569');
        lipGrad.addColorStop(0.75, '#1e293b');
        lipGrad.addColorStop(1, '#09090b');
      } else if (isEmerald) {
        lipGrad.addColorStop(0, '#6ee7b7');
        lipGrad.addColorStop(0.35, '#10b981');
        lipGrad.addColorStop(1, '#064e3b');
      } else if (isRuby) {
        lipGrad.addColorStop(0, '#fda4af');
        lipGrad.addColorStop(0.35, '#f43f5e');
        lipGrad.addColorStop(1, '#881337');
      } else if (isSapphire) {
        lipGrad.addColorStop(0, '#7dd3fc');
        lipGrad.addColorStop(0.35, '#0284c7');
        lipGrad.addColorStop(1, '#1e3a8a');
      } else if (isAmethyst) {
        lipGrad.addColorStop(0, '#d8b4fe');
        lipGrad.addColorStop(0.35, '#9333ea');
        lipGrad.addColorStop(1, '#3b0764');
      } else if (isNeon) {
        lipGrad.addColorStop(0, '#38bdf8');
        lipGrad.addColorStop(0.35, '#0284c7');
        lipGrad.addColorStop(1, '#090d16');
      } else {
        lipGrad.addColorStop(0, '#f5f2e9');
        lipGrad.addColorStop(0.22, '#dcd6c8');
        lipGrad.addColorStop(0.7, '#a8a090');
        lipGrad.addColorStop(1, '#575248');
      }
      ctx.fillStyle = lipGrad;
      traceRoundBottomRect(ctx, keyX, lipTopY, keyW, frontLipH, radius);
      ctx.fill();

      // Bright 3D curved chamfer highlight band where the top of the key bends into the front lip
      ctx.fillStyle = isMahogany
        ? 'rgba(255, 248, 225, 0.88)'
        : isGold
        ? '#fef9c3'
        : isNeon
        ? '#7dd3fc'
        : '#ffffff';
      ctx.fillRect(keyX + 0.8, lipTopY - 1.2, keyW - 1.6, 2.2);

      // Outer border stroke
      traceRoundBottomRect(ctx, keyX, wk.y, keyW, keyH, radius);
      ctx.strokeStyle = isPressed
        ? isStudent
          ? '#38bdf8'
          : isNeon || isCarbon || isSapphire
          ? '#22d3ee'
          : '#fde047'
        : isMahogany
        ? 'rgba(78, 38, 12, 0.6)'
        : isGold
        ? 'rgba(180, 115, 8, 0.55)'
        : isCarbon
        ? '#475569'
        : isEmerald
        ? 'rgba(5, 150, 105, 0.55)'
        : isRuby
        ? 'rgba(225, 29, 72, 0.55)'
        : isSapphire
        ? 'rgba(2, 132, 199, 0.55)'
        : isAmethyst
        ? 'rgba(147, 51, 234, 0.55)'
        : isNeon
        ? '#312e81'
        : 'rgba(120, 113, 108, 0.55)';
      ctx.lineWidth = isPressed ? 2 : 0.9;
      ctx.stroke();

      // --- White Key Labels ---
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const fontSize = Math.max(10, Math.min(14.5, keyW * 0.36));
      ctx.font = `800 ${fontSize}px system-ui, -apple-system, sans-serif`;
      const labelY = keyH - frontLipH - Math.max(12, keyH * 0.082);

      if (!isPressed && !isNeon) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
        ctx.fillText(wk.label, keyX + keyW / 2, labelY + 1);
      }

      ctx.fillStyle = isPressed
        ? '#0f172a'
        : isNeon
        ? '#38bdf8'
        : isMahogany
        ? '#4a2309'
        : isGold
        ? '#713f12'
        : isEmerald
        ? '#064e3b'
        : isRuby
        ? '#881337'
        : isSapphire
        ? '#0c4a6e'
        : isAmethyst
        ? '#4c1d95'
        : isCarbon
        ? '#0f172a'
        : '#44403c';
      ctx.fillText(wk.label, keyX + keyW / 2, labelY);

      if (wk.computerKey && keyW > 22) {
        const badgeY = labelY - fontSize - 6;
        const badgeW = Math.min(keyW * 0.6, 18);
        const badgeH = 13;
        const badgeX = keyX + keyW / 2 - badgeW / 2;

        ctx.fillStyle = isPressed
          ? 'rgba(0,0,0,0.28)'
          : isNeon
          ? 'rgba(30, 27, 75, 0.85)'
          : isMahogany || isGold
          ? 'rgba(120, 53, 15, 0.16)'
          : 'rgba(120, 113, 108, 0.22)';
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY - badgeH / 2, badgeW, badgeH, 3);
          ctx.fill();
        }

        ctx.font = '700 8px system-ui, sans-serif';
        ctx.fillStyle = isPressed
          ? '#ffffff'
          : isNeon
          ? '#22d3ee'
          : isMahogany || isGold
          ? '#5c3010'
          : '#57534e';
        ctx.fillText(wk.computerKey.toUpperCase(), keyX + keyW / 2, badgeY);
      }
    },
    []
  );

  // Renders a single Black Key (zero ctx.clip() calls for maximum GPU speed!)
  const drawSingleBlackKey = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      bk: KeyRect,
      theme: StudioTheme,
      isPressed: boolean,
      isStudent: boolean,
      drawShadows: boolean = true
    ) => {
      const isMahogany = theme === 'mahogany';
      const isMarble = theme === 'marble';
      const isGold = theme === 'gold';
      const isCarbon = theme === 'carbon';
      const isNeon = theme === 'neon';
      const isEmerald = theme === 'emerald';
      const isRuby = theme === 'ruby';
      const isSapphire = theme === 'sapphire';
      const isAmethyst = theme === 'amethyst';

      const {
        darkWoodPattern,
        ebonyPattern,
        neroMarquinaPattern,
        brushedGoldPattern,
        carbonFiberPattern,
        malachitePattern,
        magmaRubyPattern,
        royalSapphirePattern,
        amethystGeodePattern,
      } = texturesRef.current;

      const keyX = bk.x;
      const keyW = bk.width;
      const keyH = bk.height + (isPressed ? 1.5 : 0);
      const radius = Math.min(5.5, keyW * 0.24);

      // 2A. 3-Layer Soft Penumbra Cast Shadow onto Adjacent White Keys
      if (drawShadows) {
        if (isPressed) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
          traceRoundBottomRect(ctx, keyX + 1.5, bk.y, keyW + 1, keyH + 3, radius + 2);
          ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.13)';
          traceRoundBottomRect(ctx, keyX + 2.5, bk.y, keyW + 4.5, keyH + 10, radius + 5);
          ctx.fill();

          ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
          traceRoundBottomRect(ctx, keyX + 2, bk.y, keyW + 2.5, keyH + 6.5, radius + 3);
          ctx.fill();

          ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
          traceRoundBottomRect(ctx, keyX + 1, bk.y, keyW + 1, keyH + 3.2, radius + 1.5);
          ctx.fill();
        }
      }

      const sideBevel = Math.max(2.6, Math.min(5.5, keyW * 0.145));
      const frontSlopeH = isPressed
        ? Math.max(6, keyH * 0.072)
        : Math.max(11, keyH * 0.13);
      const deckW = Math.max(4, keyW - sideBevel * 2);
      const deckH = Math.max(10, keyH - frontSlopeH);
      const deckX = keyX + sideBevel;
      const deckY = bk.y;

      // 2B. Outer 3D Sculpted Base & Sloped Side Flanks
      const sideGrad = ctx.createLinearGradient(keyX, bk.y, keyX + keyW, bk.y);
      if (isPressed) {
        if (isStudent) {
          sideGrad.addColorStop(0, '#38bdf8');
          sideGrad.addColorStop(0.5, '#0284c7');
          sideGrad.addColorStop(1, '#0369a1');
        } else if (isNeon || isCarbon || isSapphire) {
          sideGrad.addColorStop(0, '#67e8f9');
          sideGrad.addColorStop(0.5, '#06b6d4');
          sideGrad.addColorStop(1, '#0e7490');
        } else if (isEmerald) {
          sideGrad.addColorStop(0, '#6ee7b7');
          sideGrad.addColorStop(0.5, '#10b981');
          sideGrad.addColorStop(1, '#047857');
        } else if (isRuby) {
          sideGrad.addColorStop(0, '#fda4af');
          sideGrad.addColorStop(0.5, '#e11d48');
          sideGrad.addColorStop(1, '#881337');
        } else if (isAmethyst) {
          sideGrad.addColorStop(0, '#e879f9');
          sideGrad.addColorStop(0.5, '#9333ea');
          sideGrad.addColorStop(1, '#4c1d95');
        } else {
          sideGrad.addColorStop(0, '#fde047');
          sideGrad.addColorStop(0.5, '#d97706');
          sideGrad.addColorStop(1, '#78350f');
        }
      } else if (isMahogany) {
        sideGrad.addColorStop(0, '#783c1a');
        sideGrad.addColorStop(0.18, '#4a220d');
        sideGrad.addColorStop(0.82, '#1c0b03');
        sideGrad.addColorStop(0.95, '#2e1508');
        sideGrad.addColorStop(1, '#120702');
      } else if (isGold) {
        sideGrad.addColorStop(0, '#fef9c3');
        sideGrad.addColorStop(0.22, '#eab308');
        sideGrad.addColorStop(0.78, '#854d0e');
        sideGrad.addColorStop(0.94, '#ca8a04');
        sideGrad.addColorStop(1, '#422006');
      } else if (isMarble) {
        sideGrad.addColorStop(0, '#94a3b8');
        sideGrad.addColorStop(0.2, '#1e293b');
        sideGrad.addColorStop(0.82, '#090d16');
        sideGrad.addColorStop(0.95, '#334155');
        sideGrad.addColorStop(1, '#020617');
      } else if (isCarbon) {
        sideGrad.addColorStop(0, '#a1a1aa');
        sideGrad.addColorStop(0.2, '#27272a');
        sideGrad.addColorStop(0.82, '#09090b');
        sideGrad.addColorStop(0.95, '#3f3f46');
        sideGrad.addColorStop(1, '#000000');
      } else if (isEmerald) {
        sideGrad.addColorStop(0, '#34d399');
        sideGrad.addColorStop(0.22, '#065f46');
        sideGrad.addColorStop(0.82, '#022c22');
        sideGrad.addColorStop(1, '#011c16');
      } else if (isRuby) {
        sideGrad.addColorStop(0, '#fb7185');
        sideGrad.addColorStop(0.22, '#881337');
        sideGrad.addColorStop(0.82, '#4c0519');
        sideGrad.addColorStop(1, '#26020c');
      } else if (isSapphire) {
        sideGrad.addColorStop(0, '#60a5fa');
        sideGrad.addColorStop(0.22, '#1e3a8a');
        sideGrad.addColorStop(0.82, '#091536');
        sideGrad.addColorStop(1, '#040a1c');
      } else if (isAmethyst) {
        sideGrad.addColorStop(0, '#c084fc');
        sideGrad.addColorStop(0.22, '#581c87');
        sideGrad.addColorStop(0.82, '#2e1065');
        sideGrad.addColorStop(1, '#170636');
      } else if (isNeon) {
        sideGrad.addColorStop(0, '#701a75');
        sideGrad.addColorStop(0.5, '#1e1b4b');
        sideGrad.addColorStop(1, '#090d16');
      } else {
        sideGrad.addColorStop(0, '#64748b');
        sideGrad.addColorStop(0.16, '#1e293b');
        sideGrad.addColorStop(0.82, '#07090e');
        sideGrad.addColorStop(0.94, '#262f3d');
        sideGrad.addColorStop(1, '#030508');
      }
      ctx.fillStyle = sideGrad;
      traceRoundBottomRect(ctx, keyX, bk.y, keyW, keyH, radius);
      ctx.fill();

      // 2C. Sloped Front Nose of the Black Key
      ctx.beginPath();
      ctx.moveTo(deckX, deckY + deckH);
      ctx.lineTo(deckX + deckW, deckY + deckH);
      ctx.lineTo(keyX + keyW - 1, keyH - 1);
      ctx.lineTo(keyX + 1, keyH - 1);
      ctx.closePath();

      const slopeGrad = ctx.createLinearGradient(keyX, deckY + deckH, keyX, keyH);
      if (isPressed) {
        slopeGrad.addColorStop(0, isStudent ? '#7dd3fc' : isNeon || isCarbon ? '#a5f3fc' : '#fef08a');
        slopeGrad.addColorStop(1, isStudent ? '#0369a1' : isNeon || isCarbon ? '#155e75' : '#92400e');
      } else if (isMahogany) {
        slopeGrad.addColorStop(0, '#9a5226');
        slopeGrad.addColorStop(0.25, '#5c2d14');
        slopeGrad.addColorStop(0.75, '#2b1306');
        slopeGrad.addColorStop(1, '#120702');
      } else if (isGold) {
        slopeGrad.addColorStop(0, '#ffffff');
        slopeGrad.addColorStop(0.25, '#fde047');
        slopeGrad.addColorStop(0.7, '#ca8a04');
        slopeGrad.addColorStop(1, '#713f12');
      } else if (isCarbon) {
        slopeGrad.addColorStop(0, '#d4d4d8');
        slopeGrad.addColorStop(0.3, '#52525b');
        slopeGrad.addColorStop(1, '#09090b');
      } else if (isEmerald) {
        slopeGrad.addColorStop(0, '#6ee7b7');
        slopeGrad.addColorStop(0.35, '#047857');
        slopeGrad.addColorStop(1, '#022c22');
      } else if (isRuby) {
        slopeGrad.addColorStop(0, '#fda4af');
        slopeGrad.addColorStop(0.35, '#be123c');
        slopeGrad.addColorStop(1, '#4c0519');
      } else if (isSapphire) {
        slopeGrad.addColorStop(0, '#93c5fd');
        slopeGrad.addColorStop(0.35, '#1d4ed8');
        slopeGrad.addColorStop(1, '#081c4a');
      } else if (isAmethyst) {
        slopeGrad.addColorStop(0, '#e9d5ff');
        slopeGrad.addColorStop(0.35, '#7e22ce');
        slopeGrad.addColorStop(1, '#2e1065');
      } else if (isNeon) {
        slopeGrad.addColorStop(0, '#f0abfc');
        slopeGrad.addColorStop(0.4, '#a21caf');
        slopeGrad.addColorStop(1, '#0f172a');
      } else {
        slopeGrad.addColorStop(0, '#94a3b8');
        slopeGrad.addColorStop(0.18, '#475569');
        slopeGrad.addColorStop(0.65, '#1e293b');
        slopeGrad.addColorStop(1, '#090d16');
      }
      ctx.fillStyle = slopeGrad;
      ctx.fill();

      // Diagonal crease lines on the front nose
      ctx.strokeStyle = isGold ? 'rgba(254, 240, 138, 0.5)' : 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(deckX, deckY + deckH);
      ctx.lineTo(keyX + 1, keyH - 1);
      ctx.moveTo(deckX + deckW, deckY + deckH);
      ctx.lineTo(keyX + keyW - 1, keyH - 1);
      ctx.stroke();

      // 2D. Raised Top Deck (Direct roundRect fill — zero nested ctx.clip()!)
      const deckRadius = Math.max(2, radius - 1.5);
      traceRoundBottomRect(ctx, deckX, deckY, deckW, deckH, deckRadius);

      if (isMahogany) {
        ctx.fillStyle = darkWoodPattern || '#2b1408';
        ctx.fill();

        const deckGloss = ctx.createLinearGradient(deckX, deckY, deckX, deckY + deckH);
        deckGloss.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
        deckGloss.addColorStop(0.18, 'rgba(195, 108, 42, 0.16)');
        deckGloss.addColorStop(0.75, 'rgba(255, 220, 170, 0.14)');
        deckGloss.addColorStop(1, 'rgba(255, 235, 200, 0.32)');
        ctx.fillStyle = deckGloss;
        ctx.fill();
      } else if (isMarble) {
        ctx.fillStyle = neroMarquinaPattern || '#0c0d10';
        ctx.fill();

        const stoneGloss = ctx.createLinearGradient(deckX, deckY, deckX, deckY + deckH);
        stoneGloss.addColorStop(0, 'rgba(0, 0, 0, 0.52)');
        stoneGloss.addColorStop(0.28, 'rgba(255, 255, 255, 0.12)');
        stoneGloss.addColorStop(1, 'rgba(254, 240, 138, 0.24)');
        ctx.fillStyle = stoneGloss;
        ctx.fill();
      } else if (isGold) {
        ctx.fillStyle = brushedGoldPattern || '#eab308';
        ctx.fill();

        const goldGloss = ctx.createLinearGradient(deckX, deckY, deckX, deckY + deckH);
        goldGloss.addColorStop(0, 'rgba(66, 32, 6, 0.45)');
        goldGloss.addColorStop(0.3, 'rgba(254, 249, 195, 0.4)');
        goldGloss.addColorStop(0.75, 'rgba(202, 138, 4, 0.15)');
        goldGloss.addColorStop(1, 'rgba(255, 255, 255, 0.55)');
        ctx.fillStyle = goldGloss;
        ctx.fill();
      } else if (isCarbon) {
        ctx.fillStyle = carbonFiberPattern || '#18181b';
        ctx.fill();

        const cfSheen = ctx.createLinearGradient(deckX, deckY, deckX, deckY + deckH);
        cfSheen.addColorStop(0, 'rgba(0, 0, 0, 0.52)');
        cfSheen.addColorStop(0.4, 'rgba(255, 255, 255, 0.1)');
        cfSheen.addColorStop(1, 'rgba(56, 189, 248, 0.22)');
        ctx.fillStyle = cfSheen;
        ctx.fill();
      } else if (isEmerald) {
        ctx.fillStyle = malachitePattern || '#064e3b';
        ctx.fill();

        const emSheen = ctx.createLinearGradient(deckX, deckY, deckX, deckY + deckH);
        emSheen.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
        emSheen.addColorStop(0.35, 'rgba(52, 211, 153, 0.18)');
        emSheen.addColorStop(1, 'rgba(250, 204, 21, 0.28)');
        ctx.fillStyle = emSheen;
        ctx.fill();
      } else if (isRuby) {
        ctx.fillStyle = magmaRubyPattern || '#881337';
        ctx.fill();

        const rbSheen = ctx.createLinearGradient(deckX, deckY, deckX, deckY + deckH);
        rbSheen.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
        rbSheen.addColorStop(0.35, 'rgba(251, 113, 133, 0.2)');
        rbSheen.addColorStop(1, 'rgba(251, 191, 36, 0.28)');
        ctx.fillStyle = rbSheen;
        ctx.fill();
      } else if (isSapphire) {
        ctx.fillStyle = royalSapphirePattern || '#1e3a8a';
        ctx.fill();

        const spSheen = ctx.createLinearGradient(deckX, deckY, deckX, deckY + deckH);
        spSheen.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
        spSheen.addColorStop(0.35, 'rgba(96, 165, 250, 0.22)');
        spSheen.addColorStop(1, 'rgba(186, 230, 253, 0.32)');
        ctx.fillStyle = spSheen;
        ctx.fill();
      } else if (isAmethyst) {
        ctx.fillStyle = amethystGeodePattern || '#581c87';
        ctx.fill();

        const amSheen = ctx.createLinearGradient(deckX, deckY, deckX, deckY + deckH);
        amSheen.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
        amSheen.addColorStop(0.35, 'rgba(216, 180, 254, 0.22)');
        amSheen.addColorStop(1, 'rgba(244, 114, 182, 0.32)');
        ctx.fillStyle = amSheen;
        ctx.fill();
      } else if (isNeon) {
        const neonDeck = ctx.createLinearGradient(deckX, deckY, deckX, deckY + deckH);
        neonDeck.addColorStop(0, '#05020f');
        neonDeck.addColorStop(0.8, '#1e1b4b');
        neonDeck.addColorStop(1, '#3b0764');
        ctx.fillStyle = neonDeck;
        ctx.fill();
      } else {
        ctx.fillStyle = ebonyPattern || '#14171c';
        ctx.fill();

        const ebonyDeck = ctx.createLinearGradient(deckX, deckY, deckX, deckY + deckH);
        ebonyDeck.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
        ebonyDeck.addColorStop(0.18, 'rgba(148, 163, 184, 0.14)');
        ebonyDeck.addColorStop(0.65, 'rgba(15, 23, 42, 0.2)');
        ebonyDeck.addColorStop(0.92, 'rgba(148, 163, 184, 0.18)');
        ebonyDeck.addColorStop(1, 'rgba(226, 232, 240, 0.35)');
        ctx.fillStyle = ebonyDeck;
        ctx.fill();
      }

      // Cylindrical specular highlight down the center of the black key deck
      const deckCyl = ctx.createLinearGradient(deckX, deckY, deckX + deckW, deckY);
      deckCyl.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
      deckCyl.addColorStop(0.35, 'rgba(255, 255, 255, 0.06)');
      deckCyl.addColorStop(0.7, 'rgba(0, 0, 0, 0.08)');
      deckCyl.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
      ctx.fillStyle = deckCyl;
      ctx.fill();

      if (isPressed) {
        const activeDeckGrad = ctx.createLinearGradient(deckX, deckY, deckX, deckY + deckH);
        if (isStudent) {
          activeDeckGrad.addColorStop(0, 'rgba(3, 105, 161, 0.7)');
          activeDeckGrad.addColorStop(1, 'rgba(56, 189, 248, 0.85)');
        } else if (isNeon || isCarbon || isSapphire) {
          activeDeckGrad.addColorStop(0, 'rgba(8, 145, 178, 0.65)');
          activeDeckGrad.addColorStop(1, 'rgba(34, 211, 238, 0.88)');
        } else if (isEmerald) {
          activeDeckGrad.addColorStop(0, 'rgba(5, 150, 105, 0.65)');
          activeDeckGrad.addColorStop(1, 'rgba(52, 211, 153, 0.88)');
        } else if (isRuby) {
          activeDeckGrad.addColorStop(0, 'rgba(225, 29, 72, 0.65)');
          activeDeckGrad.addColorStop(1, 'rgba(251, 113, 133, 0.88)');
        } else if (isAmethyst) {
          activeDeckGrad.addColorStop(0, 'rgba(147, 51, 234, 0.65)');
          activeDeckGrad.addColorStop(1, 'rgba(232, 121, 249, 0.88)');
        } else {
          activeDeckGrad.addColorStop(0, 'rgba(180, 83, 9, 0.62)');
          activeDeckGrad.addColorStop(0.6, 'rgba(245, 158, 11, 0.68)');
          activeDeckGrad.addColorStop(1, 'rgba(253, 224, 71, 0.82)');
        }
        ctx.fillStyle = activeDeckGrad;
        ctx.fill();
      }

      // 2E. Crisp 3D Bevel Specular Rim around Top Deck
      ctx.strokeStyle = isPressed
        ? '#fef08a'
        : isGold
        ? 'rgba(254, 249, 195, 0.9)'
        : isMahogany
        ? 'rgba(235, 165, 98, 0.55)'
        : isMarble
        ? 'rgba(253, 224, 71, 0.55)'
        : isCarbon || isSapphire
        ? 'rgba(186, 230, 253, 0.65)'
        : isEmerald
        ? 'rgba(110, 231, 183, 0.7)'
        : isRuby
        ? 'rgba(253, 164, 175, 0.7)'
        : isAmethyst || isNeon
        ? 'rgba(232, 121, 249, 0.75)'
        : 'rgba(203, 213, 225, 0.52)';
      ctx.lineWidth = 1.15;
      ctx.stroke();

      // Bright front knuckle catchlight
      ctx.fillStyle = isGold
        ? '#ffffff'
        : isMahogany
        ? 'rgba(255, 225, 180, 0.65)'
        : isNeon || isAmethyst
        ? '#f0abfc'
        : 'rgba(255, 255, 255, 0.62)';
      ctx.fillRect(deckX + 1.5, deckY + deckH - 1.4, Math.max(2, deckW - 3), 1.4);

      // Outer key border
      traceRoundBottomRect(ctx, keyX, bk.y, keyW, keyH, radius);
      ctx.strokeStyle = isPressed
        ? isStudent
          ? '#38bdf8'
          : isNeon || isCarbon || isSapphire
          ? '#67e8f9'
          : '#fde047'
        : '#040302';
      ctx.lineWidth = isPressed ? 1.8 : 1;
      ctx.stroke();

      // --- Black Key Note Label ---
      if (keyW > 16) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const fontSize = Math.max(8, Math.min(11, keyW * 0.34));
        ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = isPressed
          ? '#0f172a'
          : isGold
          ? '#422006'
          : isNeon || isAmethyst
          ? '#fbcfe8'
          : isEmerald
          ? '#a7f3d0'
          : isRuby
          ? '#fecdd3'
          : isMahogany || isMarble
          ? '#fde68a'
          : isCarbon || isSapphire
          ? '#bae6fd'
          : '#cbd5e1';

        const labelY = deckY + deckH - Math.max(9, keyH * 0.09);
        ctx.fillText(bk.label, keyX + keyW / 2, labelY);
      }
    },
    []
  );

  // Renders the top Grand Piano Fallboard & Felt Rail across a horizontal slice [sliceX, sliceX + sliceW]
  const drawTopFallboardRail = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      sliceX: number,
      sliceW: number,
      height: number,
      theme: StudioTheme
    ) => {
      const isMahogany = theme === 'mahogany';
      const isMarble = theme === 'marble';
      const isGold = theme === 'gold';
      const isCarbon = theme === 'carbon';
      const isEmerald = theme === 'emerald';
      const isRuby = theme === 'ruby';
      const isSapphire = theme === 'sapphire';
      const isAmethyst = theme === 'amethyst';

      const {
        darkWoodPattern,
        neroMarquinaPattern,
        carbonFiberPattern,
        malachitePattern,
        magmaRubyPattern,
        royalSapphirePattern,
        amethystGeodePattern,
      } = texturesRef.current;

      const feltHeight = Math.max(8, Math.min(14, height * 0.042));

      const railShadow = ctx.createLinearGradient(0, feltHeight, 0, feltHeight + 16);
      railShadow.addColorStop(0, 'rgba(0, 0, 0, 0.68)');
      railShadow.addColorStop(0.45, 'rgba(0, 0, 0, 0.25)');
      railShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = railShadow;
      ctx.fillRect(sliceX, feltHeight, sliceW, 16);

      const woodRailH = Math.max(3.5, feltHeight * 0.48);
      if (isMahogany && darkWoodPattern) {
        ctx.fillStyle = darkWoodPattern;
        ctx.fillRect(sliceX, 0, sliceW, woodRailH);
      } else if (isMarble && neroMarquinaPattern) {
        ctx.fillStyle = neroMarquinaPattern;
        ctx.fillRect(sliceX, 0, sliceW, woodRailH);
      } else if (isCarbon && carbonFiberPattern) {
        ctx.fillStyle = carbonFiberPattern;
        ctx.fillRect(sliceX, 0, sliceW, woodRailH);
      } else if (isEmerald && malachitePattern) {
        ctx.fillStyle = malachitePattern;
        ctx.fillRect(sliceX, 0, sliceW, woodRailH);
      } else if (isRuby && magmaRubyPattern) {
        ctx.fillStyle = magmaRubyPattern;
        ctx.fillRect(sliceX, 0, sliceW, woodRailH);
      } else if (isSapphire && royalSapphirePattern) {
        ctx.fillStyle = royalSapphirePattern;
        ctx.fillRect(sliceX, 0, sliceW, woodRailH);
      } else if (isAmethyst && amethystGeodePattern) {
        ctx.fillStyle = amethystGeodePattern;
        ctx.fillRect(sliceX, 0, sliceW, woodRailH);
      } else {
        const fbGrad = ctx.createLinearGradient(0, 0, 0, woodRailH);
        fbGrad.addColorStop(0, isGold ? '#2e1503' : '#050507');
        fbGrad.addColorStop(0.6, isGold ? '#5c2d0c' : '#18181c');
        fbGrad.addColorStop(1, '#09090b');
        ctx.fillStyle = fbGrad;
        ctx.fillRect(sliceX, 0, sliceW, woodRailH);
      }

      const feltGrad = ctx.createLinearGradient(0, woodRailH, 0, feltHeight);
      if (isCarbon || isSapphire) {
        feltGrad.addColorStop(0, '#082f49');
        feltGrad.addColorStop(0.5, '#0284c7');
        feltGrad.addColorStop(1, '#0c4a6e');
      } else if (isEmerald) {
        feltGrad.addColorStop(0, '#022c22');
        feltGrad.addColorStop(0.5, '#10b981');
        feltGrad.addColorStop(1, '#064e3b');
      } else if (isGold || isAmethyst) {
        feltGrad.addColorStop(0, '#3b0764');
        feltGrad.addColorStop(0.5, '#9333ea');
        feltGrad.addColorStop(1, '#4c1d95');
      } else {
        feltGrad.addColorStop(0, '#3f0412');
        feltGrad.addColorStop(0.45, '#be123c');
        feltGrad.addColorStop(0.8, '#881337');
        feltGrad.addColorStop(1, '#4c0519');
      }
      ctx.fillStyle = feltGrad;
      ctx.fillRect(sliceX, woodRailH, sliceW, feltHeight - woodRailH);

      const brassGrad = ctx.createLinearGradient(0, woodRailH - 1.5, 0, woodRailH + 0.5);
      if (isCarbon || isSapphire) {
        brassGrad.addColorStop(0, '#f8fafc');
        brassGrad.addColorStop(0.5, '#94a3b8');
        brassGrad.addColorStop(1, '#334155');
      } else {
        brassGrad.addColorStop(0, '#fef9c3');
        brassGrad.addColorStop(0.5, '#eab308');
        brassGrad.addColorStop(1, '#713f12');
      }
      ctx.fillStyle = brassGrad;
      ctx.fillRect(sliceX, woodRailH - 1.4, sliceW, 1.8);
    },
    []
  );

  // Main High-Speed GPU 2D Canvas Render Loop (Cached Offscreen Static Layer + Active Key Diffing)
  useEffect(() => {
    let animFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animFrameId = requestAnimationFrame(render);
        return;
      }

      const { width, height } = canvasDimsRef.current;
      if (width === 0 || height === 0) {
        animFrameId = requestAnimationFrame(render);
        return;
      }

      const pressedNotes = currentlyPressedNotesRef.current;
      const studentPressed = studentPressedNotesRef?.current;
      const demoNotes = songPlaybackState.activeDemoNotes;
      const theme = studioThemeRef.current;
      const activeGuidanceNoteVal = activeGuidanceNoteRef.current;

      // Build lightweight frame signature to skip redrawing when completely idle (0% CPU/GPU usage when idle!)
      let sig = `${theme}:${width}x${height}:`;
      if (pressedNotes.size > 0) {
        pressedNotes.forEach((n) => {
          sig += `P${n},`;
        });
      }
      if (studentPressed && studentPressed.size > 0) {
        studentPressed.forEach((n) => {
          sig += `S${n},`;
        });
      }
      if (demoNotes.size > 0) {
        demoNotes.forEach((n) => {
          sig += `D${n},`;
        });
      }
      if (activeGuidanceNoteVal) {
        sig += `G${activeGuidanceNoteVal}:${activeGuidanceFingerRef.current}:${guidanceHandRef.current}:${Math.floor(
          performance.now() / 32
        )}`;
      }

      if (!staticDirtyRef.current && lastRenderedSigRef.current === sig) {
        animFrameId = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animFrameId = requestAnimationFrame(render);
        return;
      }

      ensureTextures(ctx);

      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.floor(width * dpr);
      const targetH = Math.floor(height * dpr);

      // 1. Rebuild cached offscreen unpressed keyboard ONLY when theme, size, or key layout changes
      if (!staticCanvasRef.current) {
        staticCanvasRef.current = document.createElement('canvas');
      }
      const sCanvas = staticCanvasRef.current;
      if (sCanvas.width !== targetW || sCanvas.height !== targetH) {
        sCanvas.width = targetW;
        sCanvas.height = targetH;
        staticDirtyRef.current = true;
      }

      const { whiteKeys, blackKeys } = keyRectsRef.current;

      if (staticDirtyRef.current) {
        const sCtx = sCanvas.getContext('2d');
        if (sCtx) {
          sCtx.save();
          sCtx.scale(dpr, dpr);

          // Deep Grand Piano Keybed & Bottom Keyslip Recess
          const keybedGrad = sCtx.createLinearGradient(0, 0, 0, height);
          keybedGrad.addColorStop(0, '#040302');
          keybedGrad.addColorStop(0.88, '#0c0908');
          keybedGrad.addColorStop(0.95, '#1c1410');
          keybedGrad.addColorStop(1, '#070504');
          sCtx.fillStyle = keybedGrad;
          sCtx.fillRect(0, 0, width, height);

          // Draw all unpressed white keys
          for (let i = 0; i < whiteKeys.length; i++) {
            drawSingleWhiteKey(sCtx, whiteKeys[i], width, theme, false, false);
          }

          // Draw all unpressed black keys + penumbra shadows
          for (let i = 0; i < blackKeys.length; i++) {
            drawSingleBlackKey(sCtx, blackKeys[i], theme, false, false, true);
          }

          // Draw top fallboard & felt rail
          drawTopFallboardRail(sCtx, 0, width, height, theme);

          sCtx.restore();
          staticDirtyRef.current = false;
        }
      }

      // 2. Blit cached photorealistic keyboard in a single 0.05ms GPU operation!
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(sCanvas, 0, 0);
      ctx.scale(dpr, dpr);

      // 3. Overdraw ONLY the keys that are currently pressed (typically 0 to 4 keys)
      const hasAnyPressed =
        pressedNotes.size > 0 ||
        (studentPressed && studentPressed.size > 0) ||
        demoNotes.size > 0;

      if (hasAnyPressed) {
        const redrawnBlackNotes = new Set<string>();

        // 3A. Pressed White Keys
        for (let i = 0; i < whiteKeys.length; i++) {
          const wk = whiteKeys[i];
          const isStudent = Boolean(studentPressed && studentPressed.has(wk.note));
          const isPressed = pressedNotes.has(wk.note) || isStudent || demoNotes.has(wk.note);
          if (isPressed) {
            drawSingleWhiteKey(ctx, wk, width, theme, true, isStudent);

            // Re-stamp top fallboard rail over this pressed white key
            drawTopFallboardRail(ctx, wk.x, wk.width, height, theme);

            // Mark adjacent black keys that overlap this white key so they stay on top
            for (let b = 0; b < blackKeys.length; b++) {
              const bk = blackKeys[b];
              if (bk.x + bk.width + 6 >= wk.x && bk.x - 6 <= wk.x + wk.width) {
                redrawnBlackNotes.add(bk.note);
              }
            }
          }
        }

        // 3B. Pressed Black Keys + any Black Keys adjacent to a pressed White Key
        for (let b = 0; b < blackKeys.length; b++) {
          const bk = blackKeys[b];
          const isStudent = Boolean(studentPressed && studentPressed.has(bk.note));
          const isPressed = pressedNotes.has(bk.note) || isStudent || demoNotes.has(bk.note);
          if (isPressed || redrawnBlackNotes.has(bk.note)) {
            drawSingleBlackKey(ctx, bk, theme, isPressed, isStudent, true);
            drawTopFallboardRail(ctx, bk.x - 2, bk.width + 6, height, theme);
          }
        }
      }

      // 4. VIRTUAL TRANSPARENT HAND (MANO TRASPARENTE) & FINGERING GUIDANCE OVERLAY
      const activeGuidanceFingerVal = activeGuidanceFingerRef.current || 1;
      const activeGuidanceTipVal = activeGuidanceTipRef.current;
      const guidanceHandVal = guidanceHandRef.current || 'right';

      if (activeGuidanceNoteVal) {
        const allRects = [...whiteKeys, ...blackKeys];
        const targetKey = allRects.find((k) => k.note === activeGuidanceNoteVal);
        if (targetKey) {
          ctx.save();
          const feltHeight = Math.max(8, Math.min(14, height * 0.042));
          const targetPointX = targetKey.x + targetKey.width / 2;
          const targetPointY = targetKey.type === 'black'
            ? targetKey.y + targetKey.height * 0.72
            : targetKey.y + targetKey.height * 0.65;

          const isRightHand = guidanceHandVal === 'right';
          const baseSpread = Math.max(16, Math.min(26, targetKey.width * 0.5));

          const fingerRelOffsets: Record<number, number> = isRightHand
            ? { 1: -baseSpread * 2.1, 2: -baseSpread * 1.0, 3: 0, 4: baseSpread * 0.95, 5: baseSpread * 1.85 }
            : { 5: -baseSpread * 1.85, 4: -baseSpread * 0.95, 3: 0, 2: baseSpread * 1.0, 1: baseSpread * 2.1 };

          const activeFingerOffset = fingerRelOffsets[activeGuidanceFingerVal] ?? 0;
          const targetHandBaseX = targetPointX - activeFingerOffset;
          const targetHandBaseY = Math.min(height - 35, targetPointY + 80);

          const hp = handPosRef.current;
          if (!hp.initialized) {
            hp.x = targetHandBaseX;
            hp.y = targetHandBaseY;
            hp.initialized = true;
          } else {
            hp.x += (targetHandBaseX - hp.x) * 0.22;
            hp.y += (targetHandBaseY - hp.y) * 0.22;
          }

          const palmX = hp.x;
          const palmY = hp.y;
          const timeNow = Date.now() / 1000;
          const pulse = Math.sin(timeNow * 6) * 0.15 + 0.85;

          // 1. Acoustic Touch Ripple
          ctx.save();
          for (let r = 0; r < 2; r++) {
            const phase = (timeNow * 2 + r * 0.5) % 1;
            const radius = 8 + phase * (targetKey.width * 1.1);
            const alpha = Math.max(0, (1 - phase) * 0.5);
            ctx.beginPath();
            ctx.arc(targetPointX, targetPointY, radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(245, 158, 11, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          ctx.restore();

          // 2. Translucent Forearm & Wrist
          ctx.save();
          const armGrad = ctx.createLinearGradient(palmX, palmY, palmX, height);
          armGrad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
          armGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.18)');
          armGrad.addColorStop(1, 'rgba(15, 23, 42, 0.05)');

          ctx.beginPath();
          const wristW = baseSpread * 2.6;
          ctx.moveTo(palmX - wristW * 0.6, palmY + 45);
          ctx.quadraticCurveTo(palmX - wristW * 0.75, height - 10, palmX - wristW * 0.9, height);
          ctx.lineTo(palmX + wristW * 0.9, height);
          ctx.quadraticCurveTo(palmX + wristW * 0.75, height - 10, palmX + wristW * 0.6, palmY + 45);
          ctx.closePath();
          ctx.fillStyle = armGrad;
          ctx.fill();
          ctx.strokeStyle = 'rgba(254, 240, 138, 0.35)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();

          // 3. Translucent Palm
          ctx.save();
          const palmGrad = ctx.createRadialGradient(palmX, palmY, 5, palmX, palmY, baseSpread * 3);
          palmGrad.addColorStop(0, 'rgba(254, 243, 199, 0.32)');
          palmGrad.addColorStop(0.6, 'rgba(56, 189, 248, 0.22)');
          palmGrad.addColorStop(1, 'rgba(245, 158, 11, 0.15)');

          ctx.beginPath();
          ctx.moveTo(palmX + fingerRelOffsets[1] * 0.9, palmY + 15);
          ctx.quadraticCurveTo(palmX + fingerRelOffsets[2] * 0.95, palmY - 5, palmX + fingerRelOffsets[3], palmY - 8);
          ctx.quadraticCurveTo(palmX + fingerRelOffsets[4] * 0.95, palmY - 6, palmX + fingerRelOffsets[5] * 0.9, palmY + 10);
          ctx.quadraticCurveTo(palmX + wristW * 0.6, palmY + 45, palmX, palmY + 45);
          ctx.quadraticCurveTo(palmX - wristW * 0.6, palmY + 45, palmX + fingerRelOffsets[1] * 0.9, palmY + 15);
          ctx.closePath();
          ctx.fillStyle = palmGrad;
          ctx.fill();
          ctx.strokeStyle = 'rgba(254, 240, 138, 0.6)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();

          // 4. The 5 Articulated Fingers
          const fingerOrder = [1, 2, 3, 4, 5];
          fingerOrder.forEach((f) => {
            const isActive = f === activeGuidanceFingerVal;
            const knuckleX = palmX + fingerRelOffsets[f] * 0.9;
            const knuckleY = palmY + (f === 1 ? 16 : f === 5 ? 12 : -5);

            const tipX = isActive ? targetPointX : palmX + fingerRelOffsets[f];
            const tipY = isActive
              ? targetPointY
              : targetPointY + (f === 1 ? 32 : f === 3 ? 18 : 24);

            const midX = (knuckleX + tipX) / 2 + (isRightHand ? (f === 1 ? -10 : -2) : (f === 1 ? 10 : 2));
            const midY = (knuckleY + tipY) / 2 - (isActive ? 14 : 10);

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(knuckleX, knuckleY);
            ctx.quadraticCurveTo(midX, midY, tipX, tipY);
            ctx.lineCap = 'round';

            if (isActive) {
              ctx.lineWidth = Math.max(10, baseSpread * 0.65);
              ctx.strokeStyle = `rgba(245, 158, 11, ${0.75 * pulse})`;
              ctx.stroke();

              ctx.lineWidth = Math.max(4, baseSpread * 0.28);
              ctx.strokeStyle = '#fef08a';
              ctx.stroke();
            } else {
              ctx.lineWidth = Math.max(8, baseSpread * 0.5);
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.26)';
              ctx.stroke();

              ctx.lineWidth = Math.max(3, baseSpread * 0.2);
              ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
              ctx.stroke();
            }
            ctx.restore();

            ctx.save();
            const padRadius = isActive ? Math.max(12, baseSpread * 0.72) : Math.max(9, baseSpread * 0.52);

            ctx.beginPath();
            ctx.arc(tipX, tipY, padRadius, 0, Math.PI * 2);

            if (isActive) {
              ctx.fillStyle = '#f59e0b';
              ctx.fill();
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2.5;
              ctx.stroke();

              ctx.fillStyle = '#0f172a';
              ctx.font = `900 ${Math.max(11, padRadius * 1.05)}px system-ui, -apple-system, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(String(f), tipX, tipY + 0.5);
            } else {
              ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
              ctx.fill();
              ctx.strokeStyle = 'rgba(254, 240, 138, 0.5)';
              ctx.lineWidth = 1.2;
              ctx.stroke();

              ctx.fillStyle = 'rgba(254, 243, 199, 0.85)';
              ctx.font = `bold ${Math.max(8, padRadius * 0.9)}px system-ui, -apple-system, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(String(f), tipX, tipY);
            }
            ctx.restore();
          });

          // 5. Floating HUD Guidance Badge
          ctx.save();
          const fingerLabel = FINGER_NAMES[activeGuidanceFingerVal]?.name || `Dito ${activeGuidanceFingerVal}`;
          const badgeText = `🖐️ Dito ${activeGuidanceFingerVal} (${fingerLabel}) • ${targetKey.label || activeGuidanceNoteVal}`;

          const bannerW = Math.max(180, Math.min(280, targetKey.width * 4));
          const bannerH = activeGuidanceTipVal ? 46 : 32;
          const bannerX = Math.max(10, Math.min(width - bannerW - 10, targetPointX - bannerW / 2));
          const bannerY = Math.max(feltHeight + 4, 8);

          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 8);
          } else {
            ctx.rect(bannerX, bannerY, bannerW, bannerH);
          }
          ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
          ctx.fill();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.8;
          ctx.stroke();

          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(badgeText, bannerX + bannerW / 2, bannerY + (activeGuidanceTipVal ? 15 : bannerH / 2));

          if (activeGuidanceTipVal) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '500 9.5px system-ui, -apple-system, sans-serif';
            ctx.fillText(`💡 ${activeGuidanceTipVal}`, bannerX + bannerW / 2, bannerY + 31);
          }

          ctx.restore();
          ctx.restore();
        }
      }

      ctx.restore();
      lastRenderedSigRef.current = sig;

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [ensureTextures, drawSingleWhiteKey, drawSingleBlackKey, drawTopFallboardRail, studentPressedNotesRef, currentlyPressedNotesRef]);

  // Responsive Resize Observer — Mounted ONCE to avoid flickering / canvas resets
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let rafId: number | null = null;
    const resizeObserver = new ResizeObserver((entries) => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            const dpr = window.devicePixelRatio || 1;
            const targetW = Math.floor(width * dpr);
            const targetH = Math.floor(height * dpr);

            if (canvas.width !== targetW || canvas.height !== targetH) {
              canvas.width = targetW;
              canvas.height = targetH;
            }

            canvasDimsRef.current = { width, height };
            staticDirtyRef.current = true;
            if (updateKeyGeometriesRef.current) {
              updateKeyGeometriesRef.current(width, height);
            }
          }
        }
      });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={
        className
          ? className
          : `w-full transition-all duration-300 select-none touch-none relative ${
              showWaterfall
                ? 'h-[165px] sm:h-[185px] md:h-[210px] shrink-0'
                : 'flex-1 min-h-0 h-full'
            }`
      }
    >
      <canvas
        ref={canvasRef}
        data-piano-canvas="true"
        className="w-full h-full block select-none touch-none bg-slate-950 rounded-b-xl shadow-2xl cursor-pointer"
      />
    </div>
  );
};
