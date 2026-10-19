import React, { useEffect, useRef, useCallback } from 'react';
import { NoteNotationFormat, StudioTheme } from '../types';
import { formatNoteLabel } from '../utils/noteFormatting';
import { FINGER_NAMES } from '../data/scaleExercises';

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
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Ultra-fast instant touch detection (Priority: Black Keys -> White Keys)
  const getNoteAtCoords = useCallback((clientX: number, clientY: number): string | null => {
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

    // 1. Check Black Keys FIRST (highest z-index layer)
    for (let i = 0; i < blackKeys.length; i++) {
      const bk = blackKeys[i];
      if (x >= bk.x - 2 && x <= bk.x + bk.width + 2 && y >= bk.y && y <= bk.height + 15) {
        return bk.note;
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

    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i];
      const note = getNoteAtCoords(touch.clientX, touch.clientY);
      if (note) {
        nextTouchedNotes.add(note);
      }
    }

    const currentNotes = currentlyPressedNotesRef.current;

    // Turn off un-touched notes
    currentNotes.forEach((note) => {
      if (!nextTouchedNotes.has(note)) {
        if (!sustainRef.current) {
          onNoteUpRef.current(note);
        }
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

  // Mouse Mouse-Drag Glissando Support
  const isMouseDownRef = useRef<boolean>(false);

  // Native Non-Passive Touch & Pointer Listeners for True 0ms Response
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      processTouches(e.touches);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      processTouches(e.touches);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 0) {
        currentlyPressedNotesRef.current.forEach((note) => {
          if (!sustainRef.current) onNoteUpRef.current(note);
        });
        currentlyPressedNotesRef.current.clear();
      } else {
        processTouches(e.touches);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      isMouseDownRef.current = true;
      const note = getNoteAtCoords(e.clientX, e.clientY);
      if (note) {
        currentlyPressedNotesRef.current.add(note);
        onNoteDownRef.current(note);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDownRef.current) return;
      e.preventDefault();
      const note = getNoteAtCoords(e.clientX, e.clientY);
      if (note) {
        const currentNotes = currentlyPressedNotesRef.current;
        if (!currentNotes.has(note)) {
          currentNotes.forEach((n) => {
            if (!sustainRef.current) onNoteUpRef.current(n);
          });
          currentNotes.clear();
          currentNotes.add(note);
          onNoteDownRef.current(note);
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      isMouseDownRef.current = false;
      currentlyPressedNotesRef.current.forEach((note) => {
        if (!sustainRef.current) onNoteUpRef.current(note);
      });
      currentlyPressedNotesRef.current.clear();
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);

      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [getNoteAtCoords, processTouches, currentlyPressedNotesRef]);

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

      const dpr = window.devicePixelRatio || 1;

      ctx.save();
      ctx.scale(dpr, dpr);

      // Clear frame cleanly
      ctx.clearRect(0, 0, width, height);

      const { whiteKeys, blackKeys } = keyRectsRef.current;
      const pressedNotes = currentlyPressedNotesRef.current;

      // --- ACOUSTIC PIANO FELT STRIP (Panno rosso tradizionale) ---
      ctx.save();
      const feltGrad = ctx.createLinearGradient(0, 0, 0, 6);
      feltGrad.addColorStop(0, '#7f1d1d');
      feltGrad.addColorStop(0.5, '#991b1b');
      feltGrad.addColorStop(1, '#450a0a');
      ctx.fillStyle = feltGrad;
      ctx.fillRect(0, 0, width, 6);
      ctx.restore();

      const isMahogany = studioTheme === 'mahogany';
      const isNeon = studioTheme === 'neon';

      // --- 1. DRAW WHITE KEYS ---
      whiteKeys.forEach((wk) => {
        const isPressed = pressedNotes.has(wk.note);

        ctx.save();

        // Key gap spacing
        const gap = Math.max(1, Math.min(3, width / 400));
        const keyX = wk.x + gap / 2;
        const keyW = wk.width - gap;
        const keyH = wk.height - 3; // Leave 3px safety margin at bottom of canvas so borders and letters are 100% visible
        const radius = Math.min(8, keyW * 0.22);

        // Draw key body
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(keyX, wk.y, keyW, keyH, [0, 0, radius, radius]);
        } else {
          ctx.rect(keyX, wk.y, keyW, keyH);
        }

        if (isPressed) {
          const gradient = ctx.createLinearGradient(keyX, 0, keyX, keyH);
          if (isNeon) {
            gradient.addColorStop(0, '#06b6d4');
            gradient.addColorStop(0.5, '#3b82f6');
            gradient.addColorStop(1, '#38bdf8');
          } else if (isMahogany) {
            gradient.addColorStop(0, '#bc6c25');
            gradient.addColorStop(0.5, '#dda15e');
            gradient.addColorStop(1, '#fef08a');
          } else {
            gradient.addColorStop(0, '#d97706');
            gradient.addColorStop(0.2, '#f59e0b');
            gradient.addColorStop(0.7, '#fbbf24');
            gradient.addColorStop(1, '#fef08a');
          }
          ctx.fillStyle = gradient;
          ctx.fill();

          ctx.shadowColor = isNeon ? 'rgba(34, 211, 238, 0.95)' : isMahogany ? 'rgba(221, 161, 94, 0.9)' : 'rgba(245, 158, 11, 0.9)';
          ctx.shadowBlur = 18;
          ctx.strokeStyle = isNeon ? '#22d3ee' : '#fef08a';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        } else {
          const gradient = ctx.createLinearGradient(keyX, 0, keyX, keyH);
          if (isNeon) {
            gradient.addColorStop(0, '#1e1b4b');
            gradient.addColorStop(0.15, '#2e1065');
            gradient.addColorStop(0.85, '#172554');
            gradient.addColorStop(1, '#0f172a');
          } else if (isMahogany) {
            gradient.addColorStop(0, '#fefae0');
            gradient.addColorStop(0.12, '#faedcd');
            gradient.addColorStop(0.85, '#e9d8a6');
            gradient.addColorStop(1, '#d4a373');
          } else {
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.1, '#fdfbf7');
            gradient.addColorStop(0.85, '#f1f5f9');
            gradient.addColorStop(1, '#cbd5e1');
          }
          ctx.fillStyle = gradient;
          ctx.fill();

          // Procedural Wood Grain / Neon Details for White Keys
          if (isMahogany) {
            ctx.save();
            ctx.strokeStyle = 'rgba(92, 58, 33, 0.22)';
            ctx.lineWidth = 1;
            for (let wx = keyX + 4; wx < keyX + keyW - 2; wx += Math.max(5, keyW / 4)) {
              ctx.beginPath();
              ctx.moveTo(wx, wk.y + 12);
              ctx.lineTo(wx, wk.y + keyH - 15);
              ctx.stroke();
            }
            ctx.restore();
          } else if (isNeon) {
            ctx.save();
            ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(keyX + keyW / 2, wk.y + 10);
            ctx.lineTo(keyX + keyW / 2, wk.y + keyH - 20);
            ctx.stroke();
            ctx.restore();
          }

          ctx.fillStyle = isNeon ? '#1e293b' : isMahogany ? '#b08968' : '#94a3b8';
          ctx.fillRect(keyX, keyH - Math.max(7, keyH * 0.045), keyW, Math.max(7, keyH * 0.045));

          ctx.fillStyle = isNeon ? '#38bdf8' : isMahogany ? '#fefae0' : '#f8fafc';
          ctx.fillRect(keyX + 1, keyH - Math.max(7, keyH * 0.045) - 2, keyW - 2, 2);

          ctx.strokeStyle = isNeon ? '#312e81' : isMahogany ? '#ccd5ae' : '#cbd5e1';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.restore();

        // --- White Key Labels ---
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const fontSize = Math.max(10, Math.min(15, keyW * 0.38));
        ctx.font = `800 ${fontSize}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = isPressed ? '#0f172a' : isNeon ? '#38bdf8' : '#334155';

        const labelY = keyH - Math.max(18, keyH * 0.13);
        ctx.fillText(wk.label, keyX + keyW / 2, labelY);

        if (wk.computerKey && keyW > 22) {
          const badgeY = labelY - fontSize - 6;
          const badgeW = Math.min(keyW * 0.6, 18);
          const badgeH = 13;
          const badgeX = keyX + keyW / 2 - badgeW / 2;

          ctx.fillStyle = isPressed ? 'rgba(0,0,0,0.25)' : isNeon ? 'rgba(30, 27, 75, 0.85)' : 'rgba(203, 213, 225, 0.7)';
          if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY - badgeH / 2, badgeW, badgeH, 3);
            ctx.fill();
          }

          ctx.font = '700 8px system-ui, sans-serif';
          ctx.fillStyle = isPressed ? '#ffffff' : isNeon ? '#22d3ee' : '#475569';
          ctx.fillText(wk.computerKey.toUpperCase(), keyX + keyW / 2, badgeY);
        }

        ctx.restore();
      });

      // --- 2. DRAW BLACK KEYS ---
      blackKeys.forEach((bk) => {
        const isPressed = pressedNotes.has(bk.note);

        ctx.save();

        const keyX = bk.x;
        const keyW = bk.width;
        const keyH = bk.height;
        const radius = Math.min(6, keyW * 0.28);

        ctx.shadowColor = isNeon ? 'rgba(217, 70, 239, 0.6)' : 'rgba(0, 0, 0, 0.55)';
        ctx.shadowBlur = isPressed ? 4 : 8;
        ctx.shadowOffsetY = isPressed ? 1.5 : 4;

        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(keyX, bk.y, keyW, keyH, [0, 0, radius, radius]);
        } else {
          ctx.rect(keyX, bk.y, keyW, keyH);
        }

        if (isPressed) {
          const gradient = ctx.createLinearGradient(keyX, 0, keyX, keyH);
          if (isNeon) {
            gradient.addColorStop(0, '#10b981');
            gradient.addColorStop(0.5, '#06b6d4');
            gradient.addColorStop(1, '#34d399');
          } else if (isMahogany) {
            gradient.addColorStop(0, '#ffd166');
            gradient.addColorStop(0.5, '#f4a261');
            gradient.addColorStop(1, '#fef08a');
          } else {
            gradient.addColorStop(0, '#b45309');
            gradient.addColorStop(0.3, '#d97706');
            gradient.addColorStop(0.8, '#f59e0b');
            gradient.addColorStop(1, '#fef08a');
          }
          ctx.fillStyle = gradient;
          ctx.fill();

          ctx.strokeStyle = isNeon ? '#fbcfe8' : '#fef08a';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        } else {
          const gradient = ctx.createLinearGradient(keyX, 0, keyX, keyH);
          if (isNeon) {
            gradient.addColorStop(0, '#0f0728');
            gradient.addColorStop(0.12, '#090514');
            gradient.addColorStop(0.85, '#05020f');
            gradient.addColorStop(1, '#020108');
          } else if (isMahogany) {
            gradient.addColorStop(0, '#5c3a21');
            gradient.addColorStop(0.15, '#4a2e1b');
            gradient.addColorStop(0.85, '#301c0f');
            gradient.addColorStop(1, '#221208');
          } else {
            gradient.addColorStop(0, '#475569');
            gradient.addColorStop(0.12, '#334155');
            gradient.addColorStop(0.3, '#1e293b');
            gradient.addColorStop(0.85, '#0f172a');
            gradient.addColorStop(1, '#020617');
          }
          ctx.fillStyle = gradient;
          ctx.fill();

          // Procedural Wood Grain / Neon Details for Black Keys
          if (isMahogany) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 209, 102, 0.22)';
            ctx.lineWidth = 1;
            for (let bx = keyX + 3; bx < keyX + keyW - 2; bx += Math.max(3, keyW / 3)) {
              ctx.beginPath();
              ctx.moveTo(bx, bk.y + 6);
              ctx.lineTo(bx, bk.y + keyH - 10);
              ctx.stroke();
            }
            ctx.restore();
          } else if (isNeon) {
            ctx.save();
            ctx.strokeStyle = 'rgba(217, 70, 239, 0.4)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(keyX + keyW / 2, bk.y + 4);
            ctx.lineTo(keyX + keyW / 2, bk.y + keyH - 10);
            ctx.stroke();
            ctx.restore();
          }

          ctx.fillStyle = isNeon ? '#d946ef' : isMahogany ? '#7f4f24' : '#64748b';
          ctx.fillRect(keyX + 1, 0, keyW - 2, Math.max(3.5, keyH * 0.055));

          ctx.strokeStyle = isNeon ? '#d946ef' : isMahogany ? '#221208' : '#020617';
          ctx.lineWidth = isNeon ? 1.5 : 1;
          ctx.stroke();
        }

        ctx.restore();

        // --- Black Key Note Label ---
        if (keyW > 16) {
          ctx.save();
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const fontSize = Math.max(8, Math.min(11, keyW * 0.35));
          ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
          ctx.fillStyle = isPressed ? '#0f172a' : isNeon ? '#fbcfe8' : '#f1f5f9';

          const labelY = keyH - Math.max(12, keyH * 0.15);
          ctx.fillText(bk.label, keyX + keyW / 2, labelY);

          ctx.restore();
        }
      });

      // --- 3. DRAW TOP GRAND PIANO MAHOGANY & CRIMSON FELT RAIL ---
      ctx.save();
      const feltHeight = Math.max(6, Math.min(10, height * 0.03));

      // Crimson Felt Strip
      const feltGradient = ctx.createLinearGradient(0, 0, 0, feltHeight);
      feltGradient.addColorStop(0, '#701a24');
      feltGradient.addColorStop(0.5, '#9f1239');
      feltGradient.addColorStop(1, '#881337');
      ctx.fillStyle = feltGradient;
      ctx.fillRect(0, 0, width, feltHeight);

      // Polished Brass Gold Accent Inlay Line
      const brassGradient = ctx.createLinearGradient(0, 0, width, 0);
      brassGradient.addColorStop(0, '#ca8a04');
      brassGradient.addColorStop(0.2, '#fef08a');
      brassGradient.addColorStop(0.5, '#eab308');
      brassGradient.addColorStop(0.8, '#fef08a');
      brassGradient.addColorStop(1, '#ca8a04');
      ctx.fillStyle = brassGradient;
      ctx.fillRect(0, feltHeight - 1.5, width, 1.5);

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
