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

  // Pre-rendered Offscreen Procedural Textures for 0ms Photorealistic Wood & Ivory Rendering
  const texturesRef = useRef<{
    lightWoodPattern: CanvasPattern | null;
    darkWoodPattern: CanvasPattern | null;
    ivoryPattern: CanvasPattern | null;
    initialized: boolean;
  }>({
    lightWoodPattern: null,
    darkWoodPattern: null,
    ivoryPattern: null,
    initialized: false,
  });

  const ensureTextures = useCallback((ctx: CanvasRenderingContext2D) => {
    if (texturesRef.current.initialized) return;
    texturesRef.current.initialized = true;

    try {
      // 1. Photorealistic Honey Maple / Boxwood Texture for White Keys ('mahogany' / Wood theme)
      const lwCanvas = document.createElement('canvas');
      lwCanvas.width = 256;
      lwCanvas.height = 512;
      const lwCtx = lwCanvas.getContext('2d');
      if (lwCtx) {
        const baseGrad = lwCtx.createLinearGradient(0, 0, 256, 0);
        baseGrad.addColorStop(0, '#f3dfb9');
        baseGrad.addColorStop(0.25, '#faecd2');
        baseGrad.addColorStop(0.5, '#ebd0a2');
        baseGrad.addColorStop(0.78, '#f7e6c4');
        baseGrad.addColorStop(1, '#f3dfb9');
        lwCtx.fillStyle = baseGrad;
        lwCtx.fillRect(0, 0, 256, 512);

        // Organic wood grain fibers & subtle cathedral rings
        for (let i = 0; i < 140; i++) {
          const xBase = (i / 140) * 256;
          const isDarkFiber = i % 3 === 0;
          const alpha = isDarkFiber
            ? 0.06 + ((i * 17) % 10) * 0.008
            : 0.08 + ((i * 13) % 10) * 0.007;
          lwCtx.strokeStyle = isDarkFiber
            ? `rgba(115, 62, 20, ${alpha})`
            : `rgba(255, 250, 240, ${alpha})`;
          lwCtx.lineWidth = isDarkFiber ? 0.9 + (i % 2) * 0.6 : 1.1;

          const waveAmp = 2.5 + (i % 5) * 1.4;
          const waveFreq = 0.012 + (i % 4) * 0.004;
          const phase = (i * 1.37) % (Math.PI * 2);

          lwCtx.beginPath();
          for (let y = 0; y <= 512; y += 16) {
            const xOffset =
              Math.sin(y * waveFreq + phase) * waveAmp +
              Math.cos(y * 0.031 - phase) * (waveAmp * 0.4);
            const px = xBase + xOffset;
            if (y === 0) lwCtx.moveTo(px, y);
            else lwCtx.lineTo(px, y);
          }
          lwCtx.stroke();
        }

        // Fine wood pores (medullary rays)
        for (let p = 0; p < 220; p++) {
          const px = (p * 73) % 256;
          const py = (p * 131) % 500;
          const len = 6 + (p % 14);
          lwCtx.fillStyle = p % 2 === 0 ? 'rgba(102, 51, 15, 0.075)' : 'rgba(140, 82, 30, 0.05)';
          lwCtx.fillRect(px, py, 1, len);
        }

        texturesRef.current.lightWoodPattern = ctx.createPattern(lwCanvas, 'repeat');
      }

      // 2. Photorealistic Rosewood / Makassar Ebony Texture for Black Keys ('mahogany' / Wood theme)
      const dwCanvas = document.createElement('canvas');
      dwCanvas.width = 192;
      dwCanvas.height = 384;
      const dwCtx = dwCanvas.getContext('2d');
      if (dwCtx) {
        const baseGrad = dwCtx.createLinearGradient(0, 0, 192, 0);
        baseGrad.addColorStop(0, '#241107');
        baseGrad.addColorStop(0.3, '#381b0c');
        baseGrad.addColorStop(0.55, '#1b0c04');
        baseGrad.addColorStop(0.82, '#33180a');
        baseGrad.addColorStop(1, '#241107');
        dwCtx.fillStyle = baseGrad;
        dwCtx.fillRect(0, 0, 192, 384);

        for (let i = 0; i < 95; i++) {
          const xBase = (i / 95) * 192;
          const isWarmStreak = i % 4 === 0;
          dwCtx.strokeStyle = isWarmStreak
            ? `rgba(186, 104, 44, ${0.14 + (i % 5) * 0.025})`
            : `rgba(10, 4, 1, ${0.22 + (i % 4) * 0.04})`;
          dwCtx.lineWidth = isWarmStreak ? 1.4 : 1.0;

          const waveAmp = 1.8 + (i % 4) * 1.1;
          const waveFreq = 0.016 + (i % 3) * 0.005;
          const phase = i * 0.91;

          dwCtx.beginPath();
          for (let y = 0; y <= 384; y += 16) {
            const px = xBase + Math.sin(y * waveFreq + phase) * waveAmp;
            if (y === 0) dwCtx.moveTo(px, y);
            else dwCtx.lineTo(px, y);
          }
          dwCtx.stroke();
        }

        texturesRef.current.darkWoodPattern = ctx.createPattern(dwCanvas, 'repeat');
      }

      // 3. Subtle Polished Concert Ivory Texture for Classic White Keys ('midnight' theme)
      const ivCanvas = document.createElement('canvas');
      ivCanvas.width = 128;
      ivCanvas.height = 256;
      const ivCtx = ivCanvas.getContext('2d');
      if (ivCtx) {
        ivCtx.fillStyle = '#fcfcfc';
        ivCtx.fillRect(0, 0, 128, 256);
        for (let i = 0; i < 64; i++) {
          const x = i * 2;
          ivCtx.fillStyle = i % 2 === 0 ? 'rgba(241, 245, 249, 0.35)' : 'rgba(255, 255, 255, 0.5)';
          ivCtx.fillRect(x, 0, 1, 256);
        }
        texturesRef.current.ivoryPattern = ctx.createPattern(ivCanvas, 'repeat');
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

      // Dark keybed background (visible in gaps between keys)
      ctx.fillStyle = '#090706';
      ctx.fillRect(0, 0, width, height);

      const { whiteKeys, blackKeys } = keyRectsRef.current;
      const pressedNotes = currentlyPressedNotesRef.current;
      const studentPressed = studentPressedNotesRef?.current || new Set();

      const isMahogany = studioThemeRef.current === 'mahogany';
      const isNeon = studioThemeRef.current === 'neon';
      const { lightWoodPattern, darkWoodPattern, ivoryPattern } = texturesRef.current;

      // --- 1. DRAW WHITE KEYS (3D SCULPTED) ---
      whiteKeys.forEach((wk, idx) => {
        const isDemo = songPlaybackState.activeDemoNotes.has(wk.note);
        const isPressed = pressedNotes.has(wk.note) || studentPressed.has(wk.note) || isDemo;
        const isStudent = studentPressed.has(wk.note);

        ctx.save();

        // Key gap spacing
        const gap = Math.max(1.2, Math.min(2.6, width / 420));
        const keyX = wk.x + gap / 2;
        const keyW = wk.width - gap;
        // When pressed, key physically depresses slightly at the bottom edge
        const pressSink = isPressed ? 1.5 : 0;
        const keyH = wk.height - 2 + pressSink;
        const radius = Math.min(7, keyW * 0.2);

        const frontLipH = isPressed
          ? Math.max(4, keyH * 0.028)
          : Math.max(8, keyH * 0.052);

        // Clip to rounded key silhouette
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(keyX, wk.y, keyW, keyH, [0, 0, radius, radius]);
        } else {
          ctx.rect(keyX, wk.y, keyW, keyH);
        }
        ctx.clip();

        // A. Base Surface Texture (Wood Grain / Concert Ivory / Cyber Anodized)
        if (isMahogany) {
          if (lightWoodPattern) {
            ctx.save();
            // Unique grain offset per key so adjacent keys look like distinct timber cuts
            const grainShiftX = (idx * 53) % 200;
            const grainShiftY = (idx * 29) % 120;
            ctx.translate(keyX - grainShiftX, wk.y - grainShiftY);
            ctx.fillStyle = lightWoodPattern;
            ctx.fillRect(grainShiftX, grainShiftY, keyW + 2, keyH + 2);
            ctx.restore();
          } else {
            ctx.fillStyle = '#f3dfb9';
            ctx.fillRect(keyX, wk.y, keyW, keyH);
          }

          // 3D Cylindrical Key-Top Gloss & Warm Satin Varnish
          const woodSheen = ctx.createLinearGradient(keyX, wk.y, keyX, keyH);
          woodSheen.addColorStop(0, 'rgba(45, 20, 5, 0.34)');
          woodSheen.addColorStop(0.08, 'rgba(92, 48, 14, 0.08)');
          woodSheen.addColorStop(0.45, 'rgba(255, 250, 235, 0.22)');
          woodSheen.addColorStop(0.82, 'rgba(210, 155, 85, 0.12)');
          woodSheen.addColorStop(1, 'rgba(120, 65, 20, 0.28)');
          ctx.fillStyle = woodSheen;
          ctx.fillRect(keyX, wk.y, keyW, keyH);
        } else if (isNeon) {
          const neonBase = ctx.createLinearGradient(keyX, wk.y, keyX, keyH);
          neonBase.addColorStop(0, '#0f172a');
          neonBase.addColorStop(0.5, '#1e1b4b');
          neonBase.addColorStop(1, '#090d16');
          ctx.fillStyle = neonBase;
          ctx.fillRect(keyX, wk.y, keyW, keyH);
        } else {
          // Classic Concert Grand Ivory
          if (ivoryPattern) {
            ctx.fillStyle = ivoryPattern;
            ctx.fillRect(keyX, wk.y, keyW, keyH);
          } else {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(keyX, wk.y, keyW, keyH);
          }
          const ivoryGrad = ctx.createLinearGradient(keyX, wk.y, keyX, keyH);
          ivoryGrad.addColorStop(0, 'rgba(15, 23, 42, 0.22)');
          ivoryGrad.addColorStop(0.07, 'rgba(255, 255, 255, 0.0)');
          ivoryGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.65)');
          ivoryGrad.addColorStop(0.92, 'rgba(241, 245, 249, 0.45)');
          ivoryGrad.addColorStop(1, 'rgba(203, 213, 225, 0.85)');
          ctx.fillStyle = ivoryGrad;
          ctx.fillRect(keyX, wk.y, keyW, keyH);
        }

        // B. Pressed Illumination Overlay (Preserves underlying Wood/Ivory texture!)
        if (isPressed) {
          const pressGrad = ctx.createLinearGradient(keyX, wk.y, keyX, keyH);
          if (isStudent) {
            pressGrad.addColorStop(0, 'rgba(2, 132, 199, 0.65)');
            pressGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.55)');
            pressGrad.addColorStop(1, 'rgba(14, 165, 233, 0.78)');
          } else if (isNeon) {
            pressGrad.addColorStop(0, 'rgba(6, 182, 212, 0.55)');
            pressGrad.addColorStop(0.5, 'rgba(34, 211, 238, 0.75)');
            pressGrad.addColorStop(1, 'rgba(56, 189, 248, 0.9)');
          } else if (isMahogany) {
            // Warm glowing amber varnish that lets the wood grain shine through
            pressGrad.addColorStop(0, 'rgba(146, 64, 14, 0.55)');
            pressGrad.addColorStop(0.35, 'rgba(245, 158, 11, 0.42)');
            pressGrad.addColorStop(0.75, 'rgba(251, 191, 36, 0.52)');
            pressGrad.addColorStop(1, 'rgba(217, 119, 6, 0.68)');
          } else {
            pressGrad.addColorStop(0, 'rgba(217, 119, 6, 0.55)');
            pressGrad.addColorStop(0.45, 'rgba(245, 158, 11, 0.68)');
            pressGrad.addColorStop(1, 'rgba(251, 191, 36, 0.85)');
          }
          ctx.fillStyle = pressGrad;
          ctx.fillRect(keyX, wk.y, keyW, keyH);

          // Top depression shadow (key sinks below neighbor keys)
          const sinkShadow = ctx.createLinearGradient(keyX, wk.y, keyX, wk.y + 18);
          sinkShadow.addColorStop(0, 'rgba(0, 0, 0, 0.42)');
          sinkShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = sinkShadow;
          ctx.fillRect(keyX, wk.y, keyW, 18);
        }

        // C. 3D Lateral Bevel Highlights (Left light edge, Right shadow edge)
        ctx.fillStyle = isMahogany
          ? 'rgba(255, 248, 225, 0.55)'
          : isNeon
          ? 'rgba(56, 189, 248, 0.35)'
          : 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(keyX, wk.y, 1.5, keyH - frontLipH);

        ctx.fillStyle = isMahogany
          ? 'rgba(82, 41, 12, 0.32)'
          : isNeon
          ? 'rgba(15, 23, 42, 0.8)'
          : 'rgba(100, 116, 139, 0.3)';
        ctx.fillRect(keyX + keyW - 1.5, wk.y, 1.5, keyH - frontLipH);

        // D. 3D Sculpted Front Key Lip (Spessore frontale del tasto)
        const lipTopY = keyH - frontLipH;
        const lipGrad = ctx.createLinearGradient(keyX, lipTopY, keyX, keyH);
        if (isMahogany) {
          lipGrad.addColorStop(0, '#9c5a25');
          lipGrad.addColorStop(0.35, '#7c4318');
          lipGrad.addColorStop(1, '#4a250a');
        } else if (isNeon) {
          lipGrad.addColorStop(0, '#0284c7');
          lipGrad.addColorStop(1, '#0f172a');
        } else {
          lipGrad.addColorStop(0, '#cbd5e1');
          lipGrad.addColorStop(0.4, '#94a3b8');
          lipGrad.addColorStop(1, '#475569');
        }
        ctx.fillStyle = lipGrad;
        ctx.fillRect(keyX, lipTopY, keyW, frontLipH);

        // Crisp front chamfer specular highlight line right above the lip
        ctx.fillStyle = isMahogany
          ? 'rgba(255, 243, 210, 0.78)'
          : isNeon
          ? '#38bdf8'
          : '#ffffff';
        ctx.fillRect(keyX + 1, lipTopY - 1.8, keyW - 2, 1.8);

        // Outer border stroke
        ctx.strokeStyle = isPressed
          ? isStudent
            ? '#38bdf8'
            : isNeon
            ? '#22d3ee'
            : '#fde047'
          : isMahogany
          ? 'rgba(92, 48, 16, 0.55)'
          : isNeon
          ? '#312e81'
          : '#94a3b8';
        ctx.lineWidth = isPressed ? 2 : 1;
        ctx.stroke();

        ctx.restore();

        // --- White Key Labels ---
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const fontSize = Math.max(10, Math.min(15, keyW * 0.38));
        ctx.font = `800 ${fontSize}px system-ui, -apple-system, sans-serif`;
        const labelY = keyH - frontLipH - Math.max(11, keyH * 0.085);

        // Subtle embossed text shadow for readability on wood grain
        if (isMahogany && !isPressed) {
          ctx.fillStyle = 'rgba(255, 248, 231, 0.75)';
          ctx.fillText(wk.label, keyX + keyW / 2, labelY + 1);
        }

        ctx.fillStyle = isPressed
          ? '#0f172a'
          : isNeon
          ? '#38bdf8'
          : isMahogany
          ? '#432008'
          : '#334155';
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
            : isMahogany
            ? 'rgba(92, 48, 16, 0.18)'
            : 'rgba(203, 213, 225, 0.7)';
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
            : isMahogany
            ? '#5c3010'
            : '#475569';
          ctx.fillText(wk.computerKey.toUpperCase(), keyX + keyW / 2, badgeY);
        }

        ctx.restore();
      });

      // --- 2. DRAW BLACK KEYS (TRUE 3D BEVELED EBONY / ROSEWOOD PRISMS) ---
      blackKeys.forEach((bk, idx) => {
        const isDemo = songPlaybackState.activeDemoNotes.has(bk.note);
        const isPressed = pressedNotes.has(bk.note) || studentPressed.has(bk.note) || isDemo;
        const isStudent = studentPressed.has(bk.note);

        const keyX = bk.x;
        const keyW = bk.width;
        const keyH = bk.height;
        const radius = Math.min(5, keyW * 0.24);

        // 2A. Fast Realistic Cast Shadow onto Adjacent White Keys (Zero shadowBlur lag!)
        ctx.save();
        const shadowOffsetX = isPressed ? 1.5 : 3.5;
        const shadowOffsetY = isPressed ? 2.5 : 6;
        ctx.fillStyle = isPressed ? 'rgba(0, 0, 0, 0.24)' : 'rgba(0, 0, 0, 0.38)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(
            keyX + shadowOffsetX,
            bk.y,
            keyW,
            keyH + shadowOffsetY,
            [0, 0, radius + 2, radius + 2]
          );
        } else {
          ctx.rect(keyX + shadowOffsetX, bk.y, keyW, keyH + shadowOffsetY);
        }
        ctx.fill();
        ctx.restore();

        // 2B. Outer 3D Base & Sloped Side Walls of the Black Key
        ctx.save();
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(keyX, bk.y, keyW, keyH, [0, 0, radius, radius]);
        } else {
          ctx.rect(keyX, bk.y, keyW, keyH);
        }
        ctx.clip();

        // Side bevel widths & bottom front slope height
        const sideBevel = Math.max(2.2, Math.min(5, keyW * 0.13));
        const frontSlopeH = isPressed
          ? Math.max(5, keyH * 0.065)
          : Math.max(9, keyH * 0.115);
        const deckW = Math.max(4, keyW - sideBevel * 2);
        const deckH = Math.max(10, keyH - frontSlopeH);
        const deckX = keyX + sideBevel;
        const deckY = bk.y;

        // Fill outer body (side walls & bottom slope base)
        const sideGrad = ctx.createLinearGradient(keyX, bk.y, keyX + keyW, bk.y);
        if (isPressed) {
          if (isStudent) {
            sideGrad.addColorStop(0, '#38bdf8');
            sideGrad.addColorStop(0.5, '#0284c7');
            sideGrad.addColorStop(1, '#0369a1');
          } else if (isNeon) {
            sideGrad.addColorStop(0, '#6ee7b7');
            sideGrad.addColorStop(0.5, '#10b981');
            sideGrad.addColorStop(1, '#047857');
          } else {
            sideGrad.addColorStop(0, '#fde047');
            sideGrad.addColorStop(0.5, '#d97706');
            sideGrad.addColorStop(1, '#78350f');
          }
        } else if (isMahogany) {
          // Left wall catches studio light, right wall in deep rosewood shadow
          sideGrad.addColorStop(0, '#5c2d14');
          sideGrad.addColorStop(0.25, '#3b1c0b');
          sideGrad.addColorStop(0.75, '#1f0d04');
          sideGrad.addColorStop(1, '#120702');
        } else if (isNeon) {
          sideGrad.addColorStop(0, '#4a044e');
          sideGrad.addColorStop(0.5, '#1e1b4b');
          sideGrad.addColorStop(1, '#090d16');
        } else {
          // Classic Ebony 3D flanks
          sideGrad.addColorStop(0, '#475569');
          sideGrad.addColorStop(0.22, '#1e293b');
          sideGrad.addColorStop(0.8, '#090d16');
          sideGrad.addColorStop(1, '#020617');
        }
        ctx.fillStyle = sideGrad;
        ctx.fillRect(keyX, bk.y, keyW, keyH);

        // 2C. Sloped Front Chamfer (Trapezoid connecting top deck bottom to outer bottom corners)
        ctx.beginPath();
        ctx.moveTo(deckX, deckY + deckH);
        ctx.lineTo(deckX + deckW, deckY + deckH);
        ctx.lineTo(keyX + keyW, keyH);
        ctx.lineTo(keyX, keyH);
        ctx.closePath();

        const slopeGrad = ctx.createLinearGradient(keyX, deckY + deckH, keyX, keyH);
        if (isPressed) {
          slopeGrad.addColorStop(0, isStudent ? '#7dd3fc' : isNeon ? '#a7f3d0' : '#fef08a');
          slopeGrad.addColorStop(1, isStudent ? '#0369a1' : isNeon ? '#065f46' : '#92400e');
        } else if (isMahogany) {
          slopeGrad.addColorStop(0, '#783c1a');
          slopeGrad.addColorStop(0.35, '#47220d');
          slopeGrad.addColorStop(1, '#1c0b03');
        } else if (isNeon) {
          slopeGrad.addColorStop(0, '#e879f9');
          slopeGrad.addColorStop(1, '#1e1b4b');
        } else {
          slopeGrad.addColorStop(0, '#64748b');
          slopeGrad.addColorStop(0.3, '#334155');
          slopeGrad.addColorStop(1, '#0f172a');
        }
        ctx.fillStyle = slopeGrad;
        ctx.fill();

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

        if (isMahogany) {
          if (darkWoodPattern) {
            ctx.save();
            const shiftX = (idx * 37) % 140;
            const shiftY = (idx * 41) % 100;
            ctx.translate(deckX - shiftX, deckY - shiftY);
            ctx.fillStyle = darkWoodPattern;
            ctx.fillRect(shiftX, shiftY, deckW + 2, deckH + 2);
            ctx.restore();
          } else {
            ctx.fillStyle = '#2b1408';
            ctx.fillRect(deckX, deckY, deckW, deckH);
          }

          // Polished Rosewood / Ebony Lacquer Gradient
          const deckGloss = ctx.createLinearGradient(deckX, deckY, deckX, deckY + deckH);
          deckGloss.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
          deckGloss.addColorStop(0.15, 'rgba(180, 95, 35, 0.14)');
          deckGloss.addColorStop(0.75, 'rgba(255, 215, 160, 0.12)');
          deckGloss.addColorStop(1, 'rgba(255, 225, 180, 0.24)');
          ctx.fillStyle = deckGloss;
          ctx.fillRect(deckX, deckY, deckW, deckH);
        } else if (isNeon) {
          const neonDeck = ctx.createLinearGradient(deckX, deckY, deckX, deckY + deckH);
          neonDeck.addColorStop(0, '#05020f');
          neonDeck.addColorStop(0.8, '#1e1b4b');
          neonDeck.addColorStop(1, '#3b0764');
          ctx.fillStyle = neonDeck;
          ctx.fillRect(deckX, deckY, deckW, deckH);
        } else {
          // Classic Satin Ebony Top Deck
          const ebonyDeck = ctx.createLinearGradient(deckX, deckY, deckX, deckY + deckH);
          ebonyDeck.addColorStop(0, '#090d16');
          ebonyDeck.addColorStop(0.2, '#1e293b');
          ebonyDeck.addColorStop(0.85, '#0f172a');
          ebonyDeck.addColorStop(1, '#334155');
          ctx.fillStyle = ebonyDeck;
          ctx.fillRect(deckX, deckY, deckW, deckH);
        }

        // Overlay warm glow on top deck when pressed (keeping wood/ebony grain visible!)
        if (isPressed) {
          const activeDeckGrad = ctx.createLinearGradient(deckX, deckY, deckX, deckY + deckH);
          if (isStudent) {
            activeDeckGrad.addColorStop(0, 'rgba(3, 105, 161, 0.7)');
            activeDeckGrad.addColorStop(1, 'rgba(56, 189, 248, 0.85)');
          } else if (isNeon) {
            activeDeckGrad.addColorStop(0, 'rgba(16, 185, 129, 0.65)');
            activeDeckGrad.addColorStop(1, 'rgba(52, 211, 153, 0.88)');
          } else {
            activeDeckGrad.addColorStop(0, 'rgba(180, 83, 9, 0.62)');
            activeDeckGrad.addColorStop(0.6, 'rgba(245, 158, 11, 0.68)');
            activeDeckGrad.addColorStop(1, 'rgba(253, 224, 71, 0.82)');
          }
          ctx.fillStyle = activeDeckGrad;
          ctx.fillRect(deckX, deckY, deckW, deckH);
        }

        ctx.restore();

        // 2E. Crisp 3D Bevel Specular Rim around the Top Deck
        ctx.strokeStyle = isPressed
          ? '#fef08a'
          : isMahogany
          ? 'rgba(225, 150, 85, 0.48)'
          : isNeon
          ? 'rgba(232, 121, 249, 0.7)'
          : 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(deckX, deckY - 1, deckW, deckH + 1, [0, 0, deckRadius, deckRadius]);
        } else {
          ctx.rect(deckX, deckY, deckW, deckH);
        }
        ctx.stroke();

        // Outer key border
        ctx.strokeStyle = isPressed
          ? isStudent
            ? '#38bdf8'
            : isNeon
            ? '#6ee7b7'
            : '#fde047'
          : '#050302';
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
            : isNeon
            ? '#fbcfe8'
            : isMahogany
            ? '#fde68a'
            : '#e2e8f0';

          const labelY = deckY + deckH - Math.max(9, keyH * 0.09);
          ctx.fillText(bk.label, keyX + keyW / 2, labelY);

          ctx.restore();
        }
      });

      // --- 3. DRAW TOP GRAND PIANO MAHOGANY FALLBOARD & CRIMSON FELT RAIL ---
      ctx.save();
      const feltHeight = Math.max(7, Math.min(12, height * 0.038));

      // Cast shadow from the top rail onto the upper keys
      const railShadow = ctx.createLinearGradient(0, feltHeight, 0, feltHeight + 10);
      railShadow.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
      railShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = railShadow;
      ctx.fillRect(0, feltHeight, width, 10);

      // Upper Mahogany Wood Strip
      const woodRailH = Math.max(3, feltHeight * 0.45);
      if (isMahogany && darkWoodPattern) {
        ctx.fillStyle = darkWoodPattern;
        ctx.fillRect(0, 0, width, woodRailH);
      } else {
        ctx.fillStyle = isMahogany ? '#3b1808' : '#1e100d';
        ctx.fillRect(0, 0, width, woodRailH);
      }

      // Plush Crimson Velvet Felt Strip
      const feltGrad = ctx.createLinearGradient(0, woodRailH, 0, feltHeight);
      feltGrad.addColorStop(0, '#4c0519');
      feltGrad.addColorStop(0.5, '#9f1239');
      feltGrad.addColorStop(1, '#881337');
      ctx.fillStyle = feltGrad;
      ctx.fillRect(0, woodRailH, width, feltHeight - woodRailH);

      // 3D Metallic Brass Inlay Bar
      const brassGrad = ctx.createLinearGradient(0, feltHeight - 2, 0, feltHeight);
      brassGrad.addColorStop(0, '#fef08a');
      brassGrad.addColorStop(0.5, '#eab308');
      brassGrad.addColorStop(1, '#854d0e');
      ctx.fillStyle = brassGrad;
      ctx.fillRect(0, feltHeight - 1.8, width, 1.8);

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
