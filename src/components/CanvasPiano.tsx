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

  const studioThemeRef = useRef<StudioTheme>(studioTheme);
  studioThemeRef.current = studioTheme;

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
      });
    });

    // Build black keys (sit on top of white keys)
    keys.forEach((k, idx) => {
      if (k.type === 'black') {
        let whiteCountBefore = 0;
        for (let i = 0; i < idx; i++) {
          if (keys[i].type === 'white') whiteCountBefore++;
        }
        const blackWidth = whiteWidth * 0.62;
        // Balanced height proportion relative to white keys: 50% when notes are OFF, 54% when notes are ON
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
        });
      }
    });

    keyRectsRef.current = { whiteKeys, blackKeys };
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
    // The entire lower 52% of the keyboard is guaranteed 100% white keys.
    if (!forceWhite && blackKeys.length > 0) {
      const blackH = blackKeys[0].height;
      if (y <= blackH * 0.88) {
        for (let i = 0; i < blackKeys.length; i++) {
          const bk = blackKeys[i];
          // 2px horizontal inset prevents accidentally grazing black keys when pressing adjacent white keys
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
        // New touch! Determine initial mode based on touch landing point:
        // If touch starts in lower portion or on a white key, lock this touch to white glissando!
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

  // Mouse Mouse-Drag Glissando Support
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
      // Ignore simulated mouse events fired after touches on mobile devices
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

    const handleMouseUp = (e: MouseEvent) => {
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

    // Window-level touch/pointer listeners prevent stuck notes when dragging fingers off the canvas edge
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

        // Cathedral wood grain rings & organic fibers
        for (let i = 0; i < 165; i++) {
          const xBase = (i / 165) * 256;
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
          for (let y = 0; y <= 512; y += 12) {
            const xOffset =
              Math.sin(y * waveFreq + phase) * waveAmp +
              Math.cos(y * 0.029 - phase) * (waveAmp * 0.45);
            const px = xBase + xOffset;
            if (y === 0) lwCtx.moveTo(px, y);
            else lwCtx.lineTo(px, y);
          }
          lwCtx.stroke();
        }

        // Fine medullary rays & wood pores
        for (let p = 0; p < 280; p++) {
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
      dwCanvas.width = 192;
      dwCanvas.height = 384;
      const dwCtx = dwCanvas.getContext('2d');
      if (dwCtx) {
        const baseGrad = dwCtx.createLinearGradient(0, 0, 192, 0);
        baseGrad.addColorStop(0, '#1e0d05');
        baseGrad.addColorStop(0.28, '#36190b');
        baseGrad.addColorStop(0.55, '#160903');
        baseGrad.addColorStop(0.82, '#2e1508');
        baseGrad.addColorStop(1, '#1e0d05');
        dwCtx.fillStyle = baseGrad;
        dwCtx.fillRect(0, 0, 192, 384);

        for (let i = 0; i < 110; i++) {
          const xBase = (i / 110) * 192;
          const isWarmStreak = i % 4 === 0;
          dwCtx.strokeStyle = isWarmStreak
            ? `rgba(196, 110, 46, ${0.16 + (i % 5) * 0.025})`
            : `rgba(8, 3, 1, ${0.25 + (i % 4) * 0.04})`;
          dwCtx.lineWidth = isWarmStreak ? 1.35 : 1.0;

          const waveAmp = 1.6 + (i % 4) * 1.1;
          const waveFreq = 0.016 + (i % 3) * 0.005;
          const phase = i * 0.91;

          dwCtx.beginPath();
          for (let y = 0; y <= 384; y += 12) {
            const px = xBase + Math.sin(y * waveFreq + phase) * waveAmp;
            if (y === 0) dwCtx.moveTo(px, y);
            else dwCtx.lineTo(px, y);
          }
          dwCtx.stroke();
        }

        texturesRef.current.darkWoodPattern = ctx.createPattern(dwCanvas, 'repeat');
      }

      // 3. Steinway Concert Ivory Texture ('midnight' White Keys - Warm Natural Ivory Micro-Grain)
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

        // Subtle organic ivory Schreger lines & satin finish micro-veins
        for (let i = 0; i < 90; i++) {
          const xBase = (i / 90) * 256;
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

      // 3B. Genuine Satin Gaboon Ebony Texture ('midnight' Black Keys - Fine Open Pore Satin Ebony)
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

        // Micro satin ebony wood grain & open pores
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
        for (let p = 0; p < 160; p++) {
          const px = (p * 53) % 128;
          const py = (p * 89) % 248;
          ebCtx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ebCtx.fillRect(px, py, 1, 4 + (p % 7));
        }
        texturesRef.current.ebonyPattern = ctx.createPattern(ebCanvas, 'repeat');
      }

      // 4. Carrara White Marble Texture with Silver-Grey & Gold Veins ('marble' White Keys)
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

        // Soft mineral clouds
        for (let c = 0; c < 18; c++) {
          const cx = (c * 67) % 256;
          const cy = (c * 97) % 512;
          const r = 35 + (c % 4) * 20;
          const rad = cmCtx.createRadialGradient(cx, cy, 2, cx, cy, r);
          rad.addColorStop(0, 'rgba(148, 163, 184, 0.14)');
          rad.addColorStop(1, 'rgba(148, 163, 184, 0)');
          cmCtx.fillStyle = rad;
          cmCtx.fillRect(0, 0, 256, 512);
        }

        // Organic branching marble veins (Grey + subtle Gold Calacatta veins)
        for (let v = 0; v < 28; v++) {
          const isGoldVein = v % 6 === 0;
          const startX = (v * 43) % 256;
          cmCtx.strokeStyle = isGoldVein
            ? 'rgba(217, 159, 38, 0.24)'
            : `rgba(100, 116, 139, ${0.14 + (v % 4) * 0.045})`;
          cmCtx.lineWidth = isGoldVein ? 1.15 : 0.75 + (v % 3) * 0.65;

          let currX = startX;
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

      // 5. Nero Portoro / Black Marquina Marble with Gold Veins ('marble' Black Keys)
      const nmCanvas = document.createElement('canvas');
      nmCanvas.width = 192;
      nmCanvas.height = 384;
      const nmCtx = nmCanvas.getContext('2d');
      if (nmCtx) {
        nmCtx.fillStyle = '#0c0d10';
        nmCtx.fillRect(0, 0, 192, 384);

        for (let v = 0; v < 22; v++) {
          const isGold = v % 2 === 0;
          let currX = (v * 39) % 192;
          nmCtx.strokeStyle = isGold
            ? `rgba(234, 179, 8, ${0.26 + (v % 3) * 0.08})`
            : 'rgba(226, 232, 240, 0.18)';
          nmCtx.lineWidth = isGold ? 1.35 : 0.85;
          nmCtx.beginPath();
          nmCtx.moveTo(currX, 0);
          for (let y = 16; y <= 384; y += 16) {
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

        for (let i = 0; i < 45; i++) {
          const yBase = (i / 45) * 512;
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

        // Fine vertical brushed metal micro-lines
        for (let i = 0; i < 128; i++) {
          btCtx.fillStyle =
            i % 2 === 0 ? 'rgba(255, 255, 255, 0.24)' : 'rgba(51, 65, 85, 0.14)';
          btCtx.fillRect(i, 0, 1, 256);
        }
        texturesRef.current.brushedTitaniumPattern = ctx.createPattern(btCanvas, 'repeat');
      }

      // 9. True 3D Woven 2x2 Twill Carbon Fiber Texture ('carbon' Black Keys)
      const cfCanvas = document.createElement('canvas');
      cfCanvas.width = 16;
      cfCanvas.height = 16;
      const cfCtx = cfCanvas.getContext('2d');
      if (cfCtx) {
        cfCtx.fillStyle = '#09090b';
        cfCtx.fillRect(0, 0, 16, 16);

        // Diagonal woven carbon bundles with specular sheen
        const drawBundle = (x: number, y: number, w: number, h: number, bright: boolean) => {
          const g = cfCtx.createLinearGradient(x, y, x + w, y + h);
          if (bright) {
            g.addColorStop(0, '#27272a');
            g.addColorStop(0.5, '#52525b');
            g.addColorStop(1, '#18181b');
          } else {
            g.addColorStop(0, '#09090b');
            g.addColorStop(0.5, '#27272a');
            g.addColorStop(1, '#09090b');
          }
          cfCtx.fillStyle = g;
          cfCtx.fillRect(x, y, w, h);
        };

        drawBundle(0, 0, 8, 8, true);
        drawBundle(8, 8, 8, 8, true);
        drawBundle(8, 0, 8, 8, false);
        drawBundle(0, 8, 8, 8, false);

        // Micro weave step highlight
        cfCtx.strokeStyle = 'rgba(161, 161, 170, 0.24)';
        cfCtx.lineWidth = 1;
        cfCtx.beginPath();
        cfCtx.moveTo(0, 8);
        cfCtx.lineTo(8, 0);
        cfCtx.moveTo(8, 16);
        cfCtx.lineTo(16, 8);
        cfCtx.stroke();

        texturesRef.current.carbonFiberPattern = ctx.createPattern(cfCanvas, 'repeat');
      }
    } catch {
      // Fallback gracefully if offscreen canvas creation fails
    }
  }, []);

  // Main High-Speed GPU 2D Canvas Render Loop (60-120 FPS)
  useEffect(() => {
    let animFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animFrameId = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animFrameId = requestAnimationFrame(render);
        return;
      }

      const { width, height } = canvasDimsRef.current;
      if (width === 0 || height === 0) {
        animFrameId = requestAnimationFrame(render);
        return;
      }

      ensureTextures(ctx);

      const dpr = window.devicePixelRatio || 1;

      ctx.save();
      ctx.scale(dpr, dpr);

      // Deep Grand Piano Keybed & Bottom Keyslip Recess (visible between keys and beneath front lips)
      const keybedGrad = ctx.createLinearGradient(0, 0, 0, height);
      keybedGrad.addColorStop(0, '#040302');
      keybedGrad.addColorStop(0.88, '#0c0908');
      keybedGrad.addColorStop(0.95, '#1c1410');
      keybedGrad.addColorStop(1, '#070504');
      ctx.fillStyle = keybedGrad;
      ctx.fillRect(0, 0, width, height);

      const { whiteKeys, blackKeys } = keyRectsRef.current;
      const pressedNotes = currentlyPressedNotesRef.current;
      const studentPressed = studentPressedNotesRef?.current || new Set();

      const theme = studioThemeRef.current;
      const isMahogany = theme === 'mahogany';
      const isMarble = theme === 'marble';
      const isGold = theme === 'gold';
      const isCarbon = theme === 'carbon';
      const isNeon = theme === 'neon';

      const {
        lightWoodPattern,
        darkWoodPattern,
        ivoryPattern,
        ebonyPattern,
        carraraMarblePattern,
        neroMarquinaPattern,
        pearlPattern,
        brushedGoldPattern,
        brushedTitaniumPattern,
        carbonFiberPattern,
      } = texturesRef.current;

      // --- 1. DRAW WHITE KEYS (PHOTOREALISTIC 3D SCULPTED KEYS WITH CAMBER & FRONT CHAMFER) ---
      whiteKeys.forEach((wk, idx) => {
        const isDemo = songPlaybackState.activeDemoNotes.has(wk.note);
        const isPressed = pressedNotes.has(wk.note) || studentPressed.has(wk.note) || isDemo;
        const isStudent = studentPressed.has(wk.note);

        // Key gap spacing (crisp dark mechanical gap between keys)
        const gap = Math.max(1.3, Math.min(2.6, width / 410));
        const keyX = wk.x + gap / 2;
        const keyW = wk.width - gap;
        const bottomRecess = 4; // Space at bottom showing 3D drop shadow onto piano keybed
        const pressSink = isPressed ? 2.2 : 0;
        const keyH = wk.height - bottomRecess + pressSink;
        const radius = Math.min(6.5, keyW * 0.18);

        // Realistic 3D Front Key-Lip (Spessore frontale del tasto)
        const frontLipH = isPressed
          ? Math.max(5, keyH * 0.036)
          : Math.max(9, keyH * 0.062);

        // 1A. Drop Shadow cast by the White Key's front lip onto the dark keybed below
        if (!isPressed) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(keyX + 1, keyH - 2, keyW - 2, bottomRecess + 2.5, [0, 0, radius, radius]);
          } else {
            ctx.rect(keyX + 1, keyH - 2, keyW - 2, bottomRecess + 2.5);
          }
          ctx.fill();
        }

        ctx.save();

        // Clip to rounded key silhouette
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(keyX, wk.y, keyW, keyH, [0, 0, radius, radius]);
        } else {
          ctx.rect(keyX, wk.y, keyW, keyH);
        }
        ctx.clip();

        const shiftX = (idx * 53) % 200;
        const shiftY = (idx * 29) % 120;

        // 1B. Base Surface Material & Physically-Based Vertical Studio Lighting
        if (isMahogany) {
          if (lightWoodPattern) {
            ctx.save();
            ctx.translate(keyX - shiftX, wk.y - shiftY);
            ctx.fillStyle = lightWoodPattern;
            ctx.fillRect(shiftX, shiftY, keyW + 2, keyH + 2);
            ctx.restore();
          } else {
            ctx.fillStyle = '#f3dfb9';
            ctx.fillRect(keyX, wk.y, keyW, keyH);
          }
          // Satin French-polish wood lacquer reflection
          const woodSheen = ctx.createLinearGradient(keyX, wk.y, keyX, keyH);
          woodSheen.addColorStop(0, 'rgba(38, 16, 4, 0.42)');
          woodSheen.addColorStop(0.09, 'rgba(92, 48, 14, 0.08)');
          woodSheen.addColorStop(0.38, 'rgba(255, 252, 240, 0.28)');
          woodSheen.addColorStop(0.52, 'rgba(255, 255, 255, 0.12)');
          woodSheen.addColorStop(0.82, 'rgba(195, 135, 65, 0.15)');
          woodSheen.addColorStop(1, 'rgba(110, 55, 16, 0.34)');
          ctx.fillStyle = woodSheen;
          ctx.fillRect(keyX, wk.y, keyW, keyH);
        } else if (isMarble) {
          if (carraraMarblePattern) {
            ctx.save();
            ctx.translate(keyX - shiftX, wk.y - shiftY);
            ctx.fillStyle = carraraMarblePattern;
            ctx.fillRect(shiftX, shiftY, keyW + 2, keyH + 2);
            ctx.restore();
          } else {
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(keyX, wk.y, keyW, keyH);
          }
          // Mirror-polished Italian marble reflection
          const marbleGloss = ctx.createLinearGradient(keyX, wk.y, keyX, keyH);
          marbleGloss.addColorStop(0, 'rgba(15, 23, 42, 0.34)');
          marbleGloss.addColorStop(0.1, 'rgba(255, 255, 255, 0.05)');
          marbleGloss.addColorStop(0.42, 'rgba(255, 255, 255, 0.52)');
          marbleGloss.addColorStop(0.86, 'rgba(203, 213, 225, 0.25)');
          marbleGloss.addColorStop(1, 'rgba(71, 85, 105, 0.38)');
          ctx.fillStyle = marbleGloss;
          ctx.fillRect(keyX, wk.y, keyW, keyH);
        } else if (isGold) {
          if (pearlPattern) {
            ctx.save();
            ctx.translate(keyX - shiftX, wk.y - shiftY);
            ctx.fillStyle = pearlPattern;
            ctx.fillRect(shiftX, shiftY, keyW + 2, keyH + 2);
            ctx.restore();
          } else {
            ctx.fillStyle = '#fffbeb';
            ctx.fillRect(keyX, wk.y, keyW, keyH);
          }
          // Warm Imperial Mother-of-Pearl & Champagne Gold Lustre
          const pearlSheen = ctx.createLinearGradient(keyX, wk.y, keyX, keyH);
          pearlSheen.addColorStop(0, 'rgba(120, 53, 15, 0.3)');
          pearlSheen.addColorStop(0.12, 'rgba(254, 243, 199, 0.15)');
          pearlSheen.addColorStop(0.45, 'rgba(255, 255, 255, 0.58)');
          pearlSheen.addColorStop(0.85, 'rgba(253, 230, 138, 0.3)');
          pearlSheen.addColorStop(1, 'rgba(180, 83, 9, 0.35)');
          ctx.fillStyle = pearlSheen;
          ctx.fillRect(keyX, wk.y, keyW, keyH);
        } else if (isCarbon) {
          if (brushedTitaniumPattern) {
            ctx.save();
            ctx.translate(keyX - (shiftX % 64), 0);
            ctx.fillStyle = brushedTitaniumPattern;
            ctx.fillRect(shiftX % 64, wk.y, keyW + 2, keyH + 2);
            ctx.restore();
          } else {
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(keyX, wk.y, keyW, keyH);
          }
          // Anisotropic Brushed Titanium Specular Reflection
          const metalSheen = ctx.createLinearGradient(keyX, wk.y, keyX, keyH);
          metalSheen.addColorStop(0, 'rgba(9, 9, 11, 0.48)');
          metalSheen.addColorStop(0.12, 'rgba(241, 245, 249, 0.2)');
          metalSheen.addColorStop(0.4, 'rgba(255, 255, 255, 0.55)');
          metalSheen.addColorStop(0.78, 'rgba(71, 85, 105, 0.3)');
          metalSheen.addColorStop(1, 'rgba(15, 23, 42, 0.52)');
          ctx.fillStyle = metalSheen;
          ctx.fillRect(keyX, wk.y, keyW, keyH);
        } else if (isNeon) {
          const neonBase = ctx.createLinearGradient(keyX, wk.y, keyX, keyH);
          neonBase.addColorStop(0, '#090d16');
          neonBase.addColorStop(0.42, '#1e1b4b');
          neonBase.addColorStop(0.85, '#0f172a');
          neonBase.addColorStop(1, '#020617');
          ctx.fillStyle = neonBase;
          ctx.fillRect(keyX, wk.y, keyW, keyH);
        } else {
          // Photorealistic Steinway Concert Grand Ivory ('midnight')
          if (ivoryPattern) {
            ctx.save();
            ctx.translate(keyX - shiftX, wk.y - shiftY);
            ctx.fillStyle = ivoryPattern;
            ctx.fillRect(shiftX, shiftY, keyW + 2, keyH + 2);
            ctx.restore();
          } else {
            ctx.fillStyle = '#fdfcf8';
            ctx.fillRect(keyX, wk.y, keyW, keyH);
          }
          // Studio softbox reflection & fallboard ambient shading on polished ivory
          const ivoryGrad = ctx.createLinearGradient(keyX, wk.y, keyX, keyH);
          ivoryGrad.addColorStop(0, 'rgba(15, 18, 24, 0.32)');
          ivoryGrad.addColorStop(0.08, 'rgba(248, 246, 240, 0.08)');
          ivoryGrad.addColorStop(0.38, 'rgba(255, 255, 255, 0.72)');
          ivoryGrad.addColorStop(0.56, 'rgba(255, 255, 255, 0.35)');
          ivoryGrad.addColorStop(0.88, 'rgba(235, 230, 218, 0.45)');
          ivoryGrad.addColorStop(1, 'rgba(205, 198, 184, 0.75)');
          ctx.fillStyle = ivoryGrad;
          ctx.fillRect(keyX, wk.y, keyW, keyH);
        }

        // 1C. Photorealistic 3D Horizontal Crown / Camber Across Each Key Width
        // Gives each key a subtle 3D pillowed surface rather than looking like flat paper
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

        // 1D. Pressed Key Physics & Illumination (Key tilts down, adjacent keys cast lateral shadows onto it)
        if (isPressed) {
          const pressGrad = ctx.createLinearGradient(keyX, wk.y, keyX, keyH);
          if (isStudent) {
            pressGrad.addColorStop(0, 'rgba(2, 132, 199, 0.62)');
            pressGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.52)');
            pressGrad.addColorStop(1, 'rgba(14, 165, 233, 0.76)');
          } else if (isNeon || isCarbon) {
            pressGrad.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
            pressGrad.addColorStop(0.5, 'rgba(34, 211, 238, 0.62)');
            pressGrad.addColorStop(1, 'rgba(56, 189, 248, 0.8)');
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
          ctx.fillRect(keyX, wk.y, keyW, keyH);

          // Top depression shadow + lateral neighbour key shadows (physical key sink effect)
          const sinkShadow = ctx.createLinearGradient(keyX, wk.y, keyX, wk.y + 24);
          sinkShadow.addColorStop(0, 'rgba(0, 0, 0, 0.48)');
          sinkShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = sinkShadow;
          ctx.fillRect(keyX, wk.y, keyW, 24);

          ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
          ctx.fillRect(keyX, wk.y, 3, keyH);
          ctx.fillRect(keyX + keyW - 3, wk.y, 3, keyH);
        }

        // 1E. 3D Lateral Bevel Rim (Left specular catchlight, Right micro-shadow)
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

        // 1F. Photorealistic 3D Front Key Lip & Rounded Specular Chamfer (Il frontale del tasto)
        const lipTopY = keyH - frontLipH;

        // Soft pre-chamfer roll-off shadow just before the bright front knuckle
        const rollOffH = Math.max(4, frontLipH * 0.6);
        const rollGrad = ctx.createLinearGradient(keyX, lipTopY - rollOffH, keyX, lipTopY);
        rollGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        rollGrad.addColorStop(1, isNeon ? 'rgba(56, 189, 248, 0.15)' : 'rgba(100, 90, 75, 0.14)');
        ctx.fillStyle = rollGrad;
        ctx.fillRect(keyX, lipTopY - rollOffH, keyW, rollOffH);

        // Vertical front face of the white key
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
        } else if (isNeon) {
          lipGrad.addColorStop(0, '#38bdf8');
          lipGrad.addColorStop(0.35, '#0284c7');
          lipGrad.addColorStop(1, '#090d16');
        } else {
          // Authentic Steinway Ivory Front Key-Lip with warm subsurface shading
          lipGrad.addColorStop(0, '#f5f2e9');
          lipGrad.addColorStop(0.22, '#dcd6c8');
          lipGrad.addColorStop(0.7, '#a8a090');
          lipGrad.addColorStop(1, '#575248');
        }
        ctx.fillStyle = lipGrad;
        ctx.fillRect(keyX, lipTopY, keyW, frontLipH);

        // Bright 3D curved chamfer highlight band where the top of the key bends into the front lip
        const chamferGrad = ctx.createLinearGradient(keyX, lipTopY - 2.2, keyX, lipTopY + 1.5);
        chamferGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        chamferGrad.addColorStop(
          0.5,
          isMahogany
            ? 'rgba(255, 248, 225, 0.92)'
            : isGold
            ? '#fef9c3'
            : isNeon
            ? '#7dd3fc'
            : '#ffffff'
        );
        chamferGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = chamferGrad;
        ctx.fillRect(keyX + 0.8, lipTopY - 2.2, keyW - 1.6, 3.7);

        // Outer border stroke
        ctx.strokeStyle = isPressed
          ? isStudent
            ? '#38bdf8'
            : isNeon || isCarbon
            ? '#22d3ee'
            : '#fde047'
          : isMahogany
          ? 'rgba(78, 38, 12, 0.6)'
          : isGold
          ? 'rgba(180, 115, 8, 0.55)'
          : isCarbon
          ? '#475569'
          : isNeon
          ? '#312e81'
          : 'rgba(120, 113, 108, 0.55)';
        ctx.lineWidth = isPressed ? 2 : 0.9;
        ctx.stroke();

        ctx.restore();

        // --- White Key Labels (Subtle Engraved / Inlaid Studio Typography) ---
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const fontSize = Math.max(10, Math.min(14.5, keyW * 0.36));
        ctx.font = `800 ${fontSize}px system-ui, -apple-system, sans-serif`;
        const labelY = keyH - frontLipH - Math.max(12, keyH * 0.082);

        if (!isPressed && !isNeon) {
          // Subtle 1px engraved light emboss below text
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

        ctx.restore();
      });

      // --- 2. DRAW BLACK KEYS (PHOTOREALISTIC 3D SCULPTED PRISMS WITH MULTI-LAYER PENUMBRA SHADOWS) ---
      blackKeys.forEach((bk, idx) => {
        const isDemo = songPlaybackState.activeDemoNotes.has(bk.note);
        const isPressed = pressedNotes.has(bk.note) || studentPressed.has(bk.note) || isDemo;
        const isStudent = studentPressed.has(bk.note);

        const keyX = bk.x;
        const keyW = bk.width;
        const keyH = bk.height + (isPressed ? 1.5 : 0);
        const radius = Math.min(5.5, keyW * 0.24);

        // 2A. 3-Layer Soft Penumbra Cast Shadow onto Adjacent White Keys (Zero shadowBlur lag!)
        ctx.save();
        if (isPressed) {
          // Tight contact shadow when black key is depressed
          ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(keyX + 1.5, bk.y, keyW + 1, keyH + 3, [0, 0, radius + 2, radius + 2]);
          } else {
            ctx.rect(keyX + 1.5, bk.y, keyW + 1, keyH + 3);
          }
          ctx.fill();
        } else {
          // Layer 1: Wide soft ambient penumbra
          ctx.fillStyle = 'rgba(0, 0, 0, 0.13)';
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(keyX + 2.5, bk.y, keyW + 4.5, keyH + 10, [0, 0, radius + 5, radius + 5]);
          } else {
            ctx.rect(keyX + 2.5, bk.y, keyW + 4.5, keyH + 10);
          }
          ctx.fill();

          // Layer 2: Mid directional studio shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(keyX + 2, bk.y, keyW + 2.5, keyH + 6.5, [0, 0, radius + 3, radius + 3]);
          } else {
            ctx.rect(keyX + 2, bk.y, keyW + 2.5, keyH + 6.5);
          }
          ctx.fill();

          // Layer 3: Crisp dark contact occlusion right under the black key base
          ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(keyX + 1, bk.y, keyW + 1, keyH + 3.2, [0, 0, radius + 1.5, radius + 1.5]);
          } else {
            ctx.rect(keyX + 1, bk.y, keyW + 1, keyH + 3.2);
          }
          ctx.fill();
        }
        ctx.restore();

        // 2B. Outer 3D Sculpted Base & Sloped Side Flanks of the Black Key
        ctx.save();
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(keyX, bk.y, keyW, keyH, [0, 0, radius, radius]);
        } else {
          ctx.rect(keyX, bk.y, keyW, keyH);
        }
        ctx.clip();

        const sideBevel = Math.max(2.6, Math.min(5.5, keyW * 0.145));
        const frontSlopeH = isPressed
          ? Math.max(6, keyH * 0.072)
          : Math.max(11, keyH * 0.13);
        const deckW = Math.max(4, keyW - sideBevel * 2);
        const deckH = Math.max(10, keyH - frontSlopeH);
        const deckX = keyX + sideBevel;
        const deckY = bk.y;

        // Fill 3D side flanks (Left flank catches studio light, Right flank in deep shadow with white-key bounce reflection)
        const sideGrad = ctx.createLinearGradient(keyX, bk.y, keyX + keyW, bk.y);
        if (isPressed) {
          if (isStudent) {
            sideGrad.addColorStop(0, '#38bdf8');
            sideGrad.addColorStop(0.5, '#0284c7');
            sideGrad.addColorStop(1, '#0369a1');
          } else if (isNeon || isCarbon) {
            sideGrad.addColorStop(0, '#67e8f9');
            sideGrad.addColorStop(0.5, '#06b6d4');
            sideGrad.addColorStop(1, '#0e7490');
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
        } else if (isNeon) {
          sideGrad.addColorStop(0, '#701a75');
          sideGrad.addColorStop(0.5, '#1e1b4b');
          sideGrad.addColorStop(1, '#090d16');
        } else {
          // Photorealistic Steinway Satin Ebony 3D Flanks (Left highlight + right white-key bounce light)
          sideGrad.addColorStop(0, '#64748b');
          sideGrad.addColorStop(0.16, '#1e293b');
          sideGrad.addColorStop(0.82, '#07090e');
          sideGrad.addColorStop(0.94, '#262f3d');
          sideGrad.addColorStop(1, '#030508');
        }
        ctx.fillStyle = sideGrad;
        ctx.fillRect(keyX, bk.y, keyW, keyH);

        // 2C. Sloped Front Nose of the Black Key (Lo smusso anteriore inclinato del tasto nero)
        ctx.beginPath();
        ctx.moveTo(deckX, deckY + deckH);
        ctx.lineTo(deckX + deckW, deckY + deckH);
        ctx.lineTo(keyX + keyW, keyH);
        ctx.lineTo(keyX, keyH);
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
        } else if (isNeon) {
          slopeGrad.addColorStop(0, '#f0abfc');
          slopeGrad.addColorStop(0.4, '#a21caf');
          slopeGrad.addColorStop(1, '#0f172a');
        } else {
          // Realistic Ebony/Portoro Curved Front Nose Reflection
          slopeGrad.addColorStop(0, '#94a3b8');
          slopeGrad.addColorStop(0.18, '#475569');
          slopeGrad.addColorStop(0.65, '#1e293b');
          slopeGrad.addColorStop(1, '#090d16');
        }
        ctx.fillStyle = slopeGrad;
        ctx.fill();

        // Diagonal crease lines connecting top deck corners to bottom outer corners
        ctx.strokeStyle = isGold ? 'rgba(254, 240, 138, 0.5)' : 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(deckX, deckY + deckH);
        ctx.lineTo(keyX, keyH);
        ctx.moveTo(deckX + deckW, deckY + deckH);
        ctx.lineTo(keyX + keyW, keyH);
        ctx.stroke();

        // 2D. Raised Top Deck (Piano superiore del tasto nero)
        ctx.save();
        ctx.beginPath();
        const deckRadius = Math.max(2, radius - 1.5);
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(deckX, deckY, deckW, deckH, [0, 0, deckRadius, deckRadius]);
        } else {
          ctx.rect(deckX, deckY, deckW, deckH);
        }
        ctx.clip();

        const bShiftX = (idx * 37) % 140;
        const bShiftY = (idx * 41) % 100;

        if (isMahogany) {
          if (darkWoodPattern) {
            ctx.save();
            ctx.translate(deckX - bShiftX, deckY - bShiftY);
            ctx.fillStyle = darkWoodPattern;
            ctx.fillRect(bShiftX, bShiftY, deckW + 2, deckH + 2);
            ctx.restore();
          } else {
            ctx.fillStyle = '#2b1408';
            ctx.fillRect(deckX, deckY, deckW, deckH);
          }
          const deckGloss = ctx.createLinearGradient(deckX, deckY, deckX, deckY + deckH);
          deckGloss.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
          deckGloss.addColorStop(0.18, 'rgba(195, 108, 42, 0.16)');
          deckGloss.addColorStop(0.75, 'rgba(255, 220, 170, 0.14)');
          deckGloss.addColorStop(1, 'rgba(255, 235, 200, 0.32)');
          ctx.fillStyle = deckGloss;
          ctx.fillRect(deckX, deckY, deckW, deckH);
        } else if (isMarble) {
          if (neroMarquinaPattern) {
            ctx.save();
            ctx.translate(deckX - bShiftX, deckY - bShiftY);
            ctx.fillStyle = neroMarquinaPattern;
            ctx.fillRect(bShiftX, bShiftY, deckW + 2, deckH + 2);
            ctx.restore();
          } else {
            ctx.fillStyle = '#0c0d10';
            ctx.fillRect(deckX, deckY, deckW, deckH);
          }
          const stoneGloss = ctx.createLinearGradient(deckX, deckY, deckX, deckY + deckH);
          stoneGloss.addColorStop(0, 'rgba(0, 0, 0, 0.52)');
          stoneGloss.addColorStop(0.28, 'rgba(255, 255, 255, 0.12)');
          stoneGloss.addColorStop(1, 'rgba(254, 240, 138, 0.24)');
          ctx.fillStyle = stoneGloss;
          ctx.fillRect(deckX, deckY, deckW, deckH);
        } else if (isGold) {
          if (brushedGoldPattern) {
            ctx.save();
            ctx.translate(deckX - (bShiftX % 64), 0);
            ctx.fillStyle = brushedGoldPattern;
            ctx.fillRect(bShiftX % 64, deckY, deckW + 2, deckH + 2);
            ctx.restore();
          } else {
            ctx.fillStyle = '#eab308';
            ctx.fillRect(deckX, deckY, deckW, deckH);
          }
          const goldGloss = ctx.createLinearGradient(deckX, deckY, deckX, deckY + deckH);
          goldGloss.addColorStop(0, 'rgba(66, 32, 6, 0.45)');
          goldGloss.addColorStop(0.3, 'rgba(254, 249, 195, 0.4)');
          goldGloss.addColorStop(0.75, 'rgba(202, 138, 4, 0.15)');
          goldGloss.addColorStop(1, 'rgba(255, 255, 255, 0.55)');
          ctx.fillStyle = goldGloss;
          ctx.fillRect(deckX, deckY, deckW, deckH);
        } else if (isCarbon) {
          if (carbonFiberPattern) {
            ctx.fillStyle = carbonFiberPattern;
            ctx.fillRect(deckX, deckY, deckW, deckH);
          } else {
            ctx.fillStyle = '#18181b';
            ctx.fillRect(deckX, deckY, deckW, deckH);
          }
          const cfSheen = ctx.createLinearGradient(deckX, deckY, deckX, deckY + deckH);
          cfSheen.addColorStop(0, 'rgba(0, 0, 0, 0.52)');
          cfSheen.addColorStop(0.4, 'rgba(255, 255, 255, 0.1)');
          cfSheen.addColorStop(1, 'rgba(56, 189, 248, 0.22)');
          ctx.fillStyle = cfSheen;
          ctx.fillRect(deckX, deckY, deckW, deckH);
        } else if (isNeon) {
          const neonDeck = ctx.createLinearGradient(deckX, deckY, deckX, deckY + deckH);
          neonDeck.addColorStop(0, '#05020f');
          neonDeck.addColorStop(0.8, '#1e1b4b');
          neonDeck.addColorStop(1, '#3b0764');
          ctx.fillStyle = neonDeck;
          ctx.fillRect(deckX, deckY, deckW, deckH);
        } else {
          // Authentic Steinway Satin Ebony Top Deck ('midnight')
          if (ebonyPattern) {
            ctx.save();
            ctx.translate(deckX - (bShiftX % 64), deckY - (bShiftY % 64));
            ctx.fillStyle = ebonyPattern;
            ctx.fillRect(bShiftX % 64, bShiftY % 64, deckW + 2, deckH + 2);
            ctx.restore();
          } else {
            ctx.fillStyle = '#14171c';
            ctx.fillRect(deckX, deckY, deckW, deckH);
          }
          const ebonyDeck = ctx.createLinearGradient(deckX, deckY, deckX, deckY + deckH);
          ebonyDeck.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
          ebonyDeck.addColorStop(0.18, 'rgba(148, 163, 184, 0.14)');
          ebonyDeck.addColorStop(0.65, 'rgba(15, 23, 42, 0.2)');
          ebonyDeck.addColorStop(0.92, 'rgba(148, 163, 184, 0.18)');
          ebonyDeck.addColorStop(1, 'rgba(226, 232, 240, 0.35)');
          ctx.fillStyle = ebonyDeck;
          ctx.fillRect(deckX, deckY, deckW, deckH);
        }

        // Cylindrical specular highlight down the center of the black key deck
        const deckCyl = ctx.createLinearGradient(deckX, deckY, deckX + deckW, deckY);
        deckCyl.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
        deckCyl.addColorStop(0.35, 'rgba(255, 255, 255, 0.06)');
        deckCyl.addColorStop(0.7, 'rgba(0, 0, 0, 0.08)');
        deckCyl.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
        ctx.fillStyle = deckCyl;
        ctx.fillRect(deckX, deckY, deckW, deckH);

        // Overlay warm/cool glow on top deck when pressed (keeping underlying material visible!)
        if (isPressed) {
          const activeDeckGrad = ctx.createLinearGradient(deckX, deckY, deckX, deckY + deckH);
          if (isStudent) {
            activeDeckGrad.addColorStop(0, 'rgba(3, 105, 161, 0.7)');
            activeDeckGrad.addColorStop(1, 'rgba(56, 189, 248, 0.85)');
          } else if (isNeon || isCarbon) {
            activeDeckGrad.addColorStop(0, 'rgba(8, 145, 178, 0.65)');
            activeDeckGrad.addColorStop(1, 'rgba(34, 211, 238, 0.88)');
          } else {
            activeDeckGrad.addColorStop(0, 'rgba(180, 83, 9, 0.62)');
            activeDeckGrad.addColorStop(0.6, 'rgba(245, 158, 11, 0.68)');
            activeDeckGrad.addColorStop(1, 'rgba(253, 224, 71, 0.82)');
          }
          ctx.fillStyle = activeDeckGrad;
          ctx.fillRect(deckX, deckY, deckW, deckH);
        }

        ctx.restore();

        // 2E. Crisp 3D Bevel Specular Rim & Bright Knuckle Catchlight around the Top Deck
        ctx.strokeStyle = isPressed
          ? '#fef08a'
          : isGold
          ? 'rgba(254, 249, 195, 0.9)'
          : isMahogany
          ? 'rgba(235, 165, 98, 0.55)'
          : isMarble
          ? 'rgba(253, 224, 71, 0.55)'
          : isCarbon
          ? 'rgba(186, 230, 253, 0.6)'
          : isNeon
          ? 'rgba(232, 121, 249, 0.75)'
          : 'rgba(203, 213, 225, 0.52)';
        ctx.lineWidth = 1.15;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(deckX, deckY - 1, deckW, deckH + 1, [0, 0, deckRadius, deckRadius]);
        } else {
          ctx.rect(deckX, deckY, deckW, deckH);
        }
        ctx.stroke();

        // Bright front knuckle catchlight right where the raised deck bends down into the front slope
        ctx.fillStyle = isGold
          ? '#ffffff'
          : isMahogany
          ? 'rgba(255, 225, 180, 0.65)'
          : isNeon
          ? '#f0abfc'
          : 'rgba(255, 255, 255, 0.62)';
        ctx.fillRect(deckX + 1.5, deckY + deckH - 1.4, Math.max(2, deckW - 3), 1.4);

        // Outer key border
        ctx.strokeStyle = isPressed
          ? isStudent
            ? '#38bdf8'
            : isNeon || isCarbon
            ? '#67e8f9'
            : '#fde047'
          : '#040302';
        ctx.lineWidth = isPressed ? 1.8 : 1;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(keyX, bk.y, keyW, keyH, [0, 0, radius, radius]);
        } else {
          ctx.rect(keyX, bk.y, keyW, keyH);
        }
        ctx.stroke();

        ctx.restore();

        // --- Black Key Note Label ---
        if (keyW > 16) {
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const fontSize = Math.max(8, Math.min(11, keyW * 0.34));
          ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
          ctx.fillStyle = isPressed
            ? '#0f172a'
            : isGold
            ? '#422006'
            : isNeon
            ? '#fbcfe8'
            : isMahogany || isMarble
            ? '#fde68a'
            : isCarbon
            ? '#bae6fd'
            : '#cbd5e1';

          const labelY = deckY + deckH - Math.max(9, keyH * 0.09);
          ctx.fillText(bk.label, keyX + keyW / 2, labelY);

          ctx.restore();
        }
      });

      // --- 3. DRAW TOP GRAND PIANO FALLBOARD & PLUSH BRAIDED FELT RAIL ---
      ctx.save();
      const feltHeight = Math.max(8, Math.min(14, height * 0.042));

      // Deep realistic cast shadow from the top fallboard & felt strip onto the upper keys
      const railShadow = ctx.createLinearGradient(0, feltHeight, 0, feltHeight + 16);
      railShadow.addColorStop(0, 'rgba(0, 0, 0, 0.68)');
      railShadow.addColorStop(0.45, 'rgba(0, 0, 0, 0.25)');
      railShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = railShadow;
      ctx.fillRect(0, feltHeight, width, 16);

      // Upper Lacquered Fallboard Rim (matches piano body material)
      const woodRailH = Math.max(3.5, feltHeight * 0.48);
      if (isMahogany && darkWoodPattern) {
        ctx.fillStyle = darkWoodPattern;
        ctx.fillRect(0, 0, width, woodRailH);
      } else if (isMarble && neroMarquinaPattern) {
        ctx.fillStyle = neroMarquinaPattern;
        ctx.fillRect(0, 0, width, woodRailH);
      } else if (isCarbon && carbonFiberPattern) {
        ctx.fillStyle = carbonFiberPattern;
        ctx.fillRect(0, 0, width, woodRailH);
      } else {
        const fbGrad = ctx.createLinearGradient(0, 0, 0, woodRailH);
        fbGrad.addColorStop(0, isGold ? '#2e1503' : '#050507');
        fbGrad.addColorStop(0.6, isGold ? '#5c2d0c' : '#18181c');
        fbGrad.addColorStop(1, '#09090b');
        ctx.fillStyle = fbGrad;
        ctx.fillRect(0, 0, width, woodRailH);
      }

      // Plush Scarlet / Royal Velvet Felt Strip (Il panno in feltro rosso sotto il cilindro)
      const feltGrad = ctx.createLinearGradient(0, woodRailH, 0, feltHeight);
      if (isCarbon) {
        feltGrad.addColorStop(0, '#082f49');
        feltGrad.addColorStop(0.5, '#0284c7');
        feltGrad.addColorStop(1, '#0c4a6e');
      } else if (isGold) {
        feltGrad.addColorStop(0, '#3b0764');
        feltGrad.addColorStop(0.5, '#7e22ce');
        feltGrad.addColorStop(1, '#4c1d95');
      } else {
        feltGrad.addColorStop(0, '#3f0412');
        feltGrad.addColorStop(0.45, '#be123c');
        feltGrad.addColorStop(0.8, '#881337');
        feltGrad.addColorStop(1, '#4c0519');
      }
      ctx.fillStyle = feltGrad;
      ctx.fillRect(0, woodRailH, width, feltHeight - woodRailH);

      // 3D Metallic Brass / Chrome Inlay Molding
      const brassGrad = ctx.createLinearGradient(0, woodRailH - 1.5, 0, woodRailH + 0.5);
      if (isCarbon) {
        brassGrad.addColorStop(0, '#f8fafc');
        brassGrad.addColorStop(0.5, '#94a3b8');
        brassGrad.addColorStop(1, '#334155');
      } else {
        brassGrad.addColorStop(0, '#fef9c3');
        brassGrad.addColorStop(0.5, '#eab308');
        brassGrad.addColorStop(1, '#713f12');
      }
      ctx.fillStyle = brassGrad;
      ctx.fillRect(0, woodRailH - 1.4, width, 1.8);

      ctx.restore();

      // --- VIRTUAL TRANSPARENT HAND (MANO TRASPARENTE) & FINGERING GUIDANCE OVERLAY ---
      const activeGuidanceNoteVal = activeGuidanceNoteRef.current;
      const activeGuidanceFingerVal = activeGuidanceFingerRef.current || 1;
      const activeGuidanceTipVal = activeGuidanceTipRef.current;
      const guidanceHandVal = guidanceHandRef.current || 'right';

      if (activeGuidanceNoteVal) {
        const allRects = [...whiteKeys, ...blackKeys];
        const targetKey = allRects.find((k) => k.note === activeGuidanceNoteVal);
        if (targetKey) {
          ctx.save();
          const targetPointX = targetKey.x + targetKey.width / 2;
          const targetPointY = targetKey.type === 'black'
            ? targetKey.y + targetKey.height * 0.72
            : targetKey.y + targetKey.height * 0.65;

          const isRightHand = guidanceHandVal === 'right';

          // Proportional finger horizontal offsets based on key width (clamped for comfortable hand posture)
          const baseSpread = Math.max(16, Math.min(26, targetKey.width * 0.5));

          // Offsets for fingers 1 to 5 relative to palm center:
          // Right Hand: 1 (Pollice) is left, 5 (Mignolo) is right
          // Left Hand: 5 (Mignolo) is left, 1 (Pollice) is right
          const fingerRelOffsets: Record<number, number> = isRightHand
            ? { 1: -baseSpread * 2.1, 2: -baseSpread * 1.0, 3: 0, 4: baseSpread * 0.95, 5: baseSpread * 1.85 }
            : { 5: -baseSpread * 1.85, 4: -baseSpread * 0.95, 3: 0, 2: baseSpread * 1.0, 1: baseSpread * 2.1 };

          const activeFingerOffset = fingerRelOffsets[activeGuidanceFingerVal] ?? 0;
          const targetHandBaseX = targetPointX - activeFingerOffset;
          // Position palm lower down towards the keys
          const targetHandBaseY = Math.min(height - 35, targetPointY + 80);

          // Smooth interpolation (lerp)
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

          // --- 1. ACOUSTIC TOUCH RIPPLE ON TARGET KEY ---
          ctx.save();
          const rippleCount = 2;
          for (let r = 0; r < rippleCount; r++) {
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

          // --- 2. TRANSLUCENT FOREARM & WRIST ---
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

          // --- 3. TRANSLUCENT PALM (METACARPUS) ---
          ctx.save();
          ctx.shadowColor = 'rgba(245, 158, 11, 0.4)';
          ctx.shadowBlur = 15;
          const palmGrad = ctx.createRadialGradient(palmX, palmY, 5, palmX, palmY, baseSpread * 3);
          palmGrad.addColorStop(0, 'rgba(254, 243, 199, 0.32)');
          palmGrad.addColorStop(0.6, 'rgba(56, 189, 248, 0.22)');
          palmGrad.addColorStop(1, 'rgba(245, 158, 11, 0.15)');

          ctx.beginPath();
          // Palm outline with natural curved contour
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

          // --- 4. THE 5 ARTICULATED FINGERS (DITA DELLA MANO TRASPARENTE) ---
          const fingerOrder = [1, 2, 3, 4, 5];
          fingerOrder.forEach((f) => {
            const isActive = f === activeGuidanceFingerVal;
            const knuckleX = palmX + fingerRelOffsets[f] * 0.9;
            const knuckleY = palmY + (f === 1 ? 16 : f === 5 ? 12 : -5);

            let tipX: number;
            let tipY: number;

            if (isActive) {
              tipX = targetPointX;
              tipY = targetPointY;
            } else {
              tipX = palmX + fingerRelOffsets[f];
              // Rest posture: fingers curved slightly above adjacent keys
              tipY = targetPointY + (f === 1 ? 32 : f === 3 ? 18 : 24);
            }

            // Intermediate joint (PIP)
            const midX = (knuckleX + tipX) / 2 + (isRightHand ? (f === 1 ? -10 : -2) : (f === 1 ? 10 : 2));
            const midY = (knuckleY + tipY) / 2 - (isActive ? 14 : 10);

            ctx.save();
            // Finger bone/segment path
            ctx.beginPath();
            ctx.moveTo(knuckleX, knuckleY);
            ctx.quadraticCurveTo(midX, midY, tipX, tipY);
            ctx.lineCap = 'round';

            if (isActive) {
              ctx.shadowColor = 'rgba(245, 158, 11, 0.9)';
              ctx.shadowBlur = 18;
              ctx.lineWidth = Math.max(10, baseSpread * 0.65);
              ctx.strokeStyle = `rgba(245, 158, 11, ${0.75 * pulse})`;
              ctx.stroke();

              // Inner core highlight
              ctx.lineWidth = Math.max(4, baseSpread * 0.28);
              ctx.strokeStyle = '#fef08a';
              ctx.stroke();
            } else {
              ctx.shadowBlur = 4;
              ctx.shadowColor = 'rgba(56, 189, 248, 0.2)';
              ctx.lineWidth = Math.max(8, baseSpread * 0.5);
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.26)';
              ctx.stroke();

              ctx.lineWidth = Math.max(3, baseSpread * 0.2);
              ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
              ctx.stroke();
            }
            ctx.restore();

            // Fingertip pad & Number Badge
            ctx.save();
            const padRadius = isActive ? Math.max(12, baseSpread * 0.72) : Math.max(9, baseSpread * 0.52);

            ctx.beginPath();
            ctx.arc(tipX, tipY, padRadius, 0, Math.PI * 2);

            if (isActive) {
              ctx.shadowColor = 'rgba(245, 158, 11, 0.95)';
              ctx.shadowBlur = 20;
              ctx.fillStyle = '#f59e0b';
              ctx.fill();
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2.5;
              ctx.stroke();

              // Finger number text
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

          // --- 5. FLOATING HUD GUIDANCE BADGE (Above target key) ---
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

          // Title & Note text
          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(badgeText, bannerX + bannerW / 2, bannerY + (activeGuidanceTipVal ? 15 : bannerH / 2));

          // Teacher tip subtitle if present
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

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, []);

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

            // ONLY re-allocate buffer if pixel dimensions changed to prevent canvas flicker
            if (canvas.width !== targetW || canvas.height !== targetH) {
              canvas.width = targetW;
              canvas.height = targetH;
            }

            canvasDimsRef.current = { width, height };
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
        className="w-full h-full block select-none touch-none bg-slate-950 rounded-b-xl shadow-2xl cursor-pointer"
      />
    </div>
  );
};
