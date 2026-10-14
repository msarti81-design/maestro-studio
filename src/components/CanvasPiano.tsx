import React, { useEffect, useRef, useCallback } from 'react';

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
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
      whiteKeys.push({
        note: k.note,
        type: 'white',
        x: idx * whiteWidth,
        y: 0,
        width: whiteWidth,
        height: height,
        label: getTransposedNote(k.note),
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
        // Proportionally capped black key height maintaining classic piano key ratio (never stretches over white key labels)
        const blackHeight = Math.min(height * 0.58, Math.min(whiteWidth * 3.2, Math.max(55, blackWidth * 5.5)));
        const x = whiteCountBefore * whiteWidth - blackWidth / 2;

        blackKeys.push({
          note: k.note,
          type: 'black',
          x,
          y: 0,
          width: blackWidth,
          height: blackHeight,
          label: getTransposedNote(k.note),
          computerKey: k.computerKey,
        });
      }
    });

    keyRectsRef.current = { whiteKeys, blackKeys };
  }, [keys, whiteKeysList, numWhiteKeys, getTransposedNote]);

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
        if (!sustain) {
          onNoteUp(note);
        }
      }
    });

    // Turn on newly touched notes
    nextTouchedNotes.forEach((note) => {
      if (!currentNotes.has(note)) {
        onNoteDown(note);
      }
    });

    currentlyPressedNotesRef.current = nextTouchedNotes;
  }, [getNoteAtCoords, currentlyPressedNotesRef, sustain, onNoteDown, onNoteUp]);

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
          if (!sustain) onNoteUp(note);
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
        onNoteDown(note);
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
            if (!sustain) onNoteUp(n);
          });
          currentNotes.clear();
          currentNotes.add(note);
          onNoteDown(note);
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      isMouseDownRef.current = false;
      currentlyPressedNotesRef.current.forEach((note) => {
        if (!sustain) onNoteUp(note);
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
  }, [getNoteAtCoords, processTouches, currentlyPressedNotesRef, sustain, onNoteDown, onNoteUp]);

  // Main High-Speed GPU 2D Canvas Render Loop (60-120 FPS)
  useEffect(() => {
    let animFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { width, height } = canvasDimsRef.current;
      if (width === 0 || height === 0) return;

      const dpr = window.devicePixelRatio || 1;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      const { whiteKeys, blackKeys } = keyRectsRef.current;
      const pressedNotes = currentlyPressedNotesRef.current;

      // --- 1. DRAW WHITE KEYS ---
      whiteKeys.forEach((wk) => {
        const isPressed = pressedNotes.has(wk.note);

        ctx.save();

        // Key gap spacing
        const gap = Math.max(1, Math.min(3, width / 400));
        const keyX = wk.x + gap / 2;
        const keyW = wk.width - gap;
        const keyH = wk.height;
        const radius = Math.min(8, keyW * 0.2);

        // Draw key body
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(keyX, wk.y, keyW, keyH, [0, 0, radius, radius]);
        } else {
          ctx.rect(keyX, wk.y, keyW, keyH);
        }

        if (isPressed) {
          // Vibrant Gold / Amber Pressed Fill
          const gradient = ctx.createLinearGradient(keyX, 0, keyX, keyH);
          gradient.addColorStop(0, '#f59e0b');
          gradient.addColorStop(0.5, '#fbbf24');
          gradient.addColorStop(1, '#d97706');
          ctx.fillStyle = gradient;
          ctx.fill();

          // Golden glow outline
          ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
          ctx.shadowBlur = 12;
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          // Clean Ivory White Key Fill
          const gradient = ctx.createLinearGradient(keyX, 0, keyX, keyH);
          gradient.addColorStop(0, '#ffffff');
          gradient.addColorStop(0.85, '#f8fafc');
          gradient.addColorStop(1, '#e2e8f0');
          ctx.fillStyle = gradient;
          ctx.fill();

          // Subtle bottom bevel shadow
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(keyX, keyH - Math.max(6, keyH * 0.04), keyW, Math.max(6, keyH * 0.04));

          // Border stroke
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.restore();

        // --- White Key Labels ---
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Note Name Label
        const fontSize = Math.max(10, Math.min(15, keyW * 0.38));
        ctx.font = `800 ${fontSize}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = isPressed ? '#0f172a' : '#334155';

        const labelY = keyH - Math.max(16, keyH * 0.12);
        ctx.fillText(wk.label, keyX + keyW / 2, labelY);

        // Computer Key Badge (if present)
        if (wk.computerKey && keyW > 22) {
          const badgeY = labelY - fontSize - 6;
          const badgeW = Math.min(keyW * 0.6, 18);
          const badgeH = 13;
          const badgeX = keyX + keyW / 2 - badgeW / 2;

          ctx.fillStyle = isPressed ? 'rgba(0,0,0,0.2)' : 'rgba(203, 213, 225, 0.6)';
          if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY - badgeH / 2, badgeW, badgeH, 3);
            ctx.fill();
          }

          ctx.font = '700 8px system-ui, sans-serif';
          ctx.fillStyle = isPressed ? '#ffffff' : '#64748b';
          ctx.fillText(wk.computerKey.toUpperCase(), keyX + keyW / 2, badgeY);
        }

        ctx.restore();
      });

      // --- 2. DRAW BLACK KEYS (Layered on top of white keys) ---
      blackKeys.forEach((bk) => {
        const isPressed = pressedNotes.has(bk.note);

        ctx.save();

        const keyX = bk.x;
        const keyW = bk.width;
        const keyH = bk.height;
        const radius = Math.min(5, keyW * 0.25);

        // Drop shadow for 3D depth
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = isPressed ? 4 : 8;
        ctx.shadowOffsetY = isPressed ? 2 : 4;

        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(keyX, bk.y, keyW, keyH, [0, 0, radius, radius]);
        } else {
          ctx.rect(keyX, bk.y, keyW, keyH);
        }

        if (isPressed) {
          // Glowing Gold / Orange Black Key Press
          const gradient = ctx.createLinearGradient(keyX, 0, keyX, keyH);
          gradient.addColorStop(0, '#d97706');
          gradient.addColorStop(0.7, '#f59e0b');
          gradient.addColorStop(1, '#fbbf24');
          ctx.fillStyle = gradient;
          ctx.fill();

          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          // Sleek Obsidian Black Key Gradient
          const gradient = ctx.createLinearGradient(keyX, 0, keyX, keyH);
          gradient.addColorStop(0, '#334155');
          gradient.addColorStop(0.15, '#1e293b');
          gradient.addColorStop(0.85, '#0f172a');
          gradient.addColorStop(1, '#020617');
          ctx.fillStyle = gradient;
          ctx.fill();

          // 3D Top Bevel Highlight
          ctx.fillStyle = '#475569';
          ctx.fillRect(keyX + 1, 0, keyW - 2, Math.max(3, keyH * 0.05));

          ctx.strokeStyle = '#020617';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.restore();

        // --- Black Key Note Label ---
        if (keyW > 16) {
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const fontSize = Math.max(8, Math.min(11, keyW * 0.35));
          ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
          ctx.fillStyle = isPressed ? '#0f172a' : '#e2e8f0';

          const labelY = keyH - Math.max(12, keyH * 0.15);
          ctx.fillText(bk.label, keyX + keyW / 2, labelY);

          ctx.restore();
        }
      });

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  // Responsive Resize Observer
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          const dpr = window.devicePixelRatio || 1;
          canvas.width = Math.floor(width * dpr);
          canvas.height = Math.floor(height * dpr);

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(dpr, dpr);
          }

          canvasDimsRef.current = { width, height };
          updateKeyGeometries(width, height);
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateKeyGeometries]);

  return (
    <div
      ref={containerRef}
      className={`w-full transition-all duration-300 select-none touch-none relative ${
        showWaterfall
          ? 'h-[200px] sm:h-[230px] md:h-[260px] shrink-0'
          : 'flex-1 min-h-[320px] sm:min-h-[400px] md:min-h-[480px] h-full'
      }`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block select-none touch-none bg-slate-950 rounded-b-xl shadow-2xl cursor-pointer"
      />
    </div>
  );
};
