import React, { useEffect, useRef, useCallback } from 'react';
import { songPlaybackState } from '../utils/songPlaybackState';

export interface KeyConfig {
  note: string;
  type: 'white' | 'black';
  octave: number;
}

interface MiniMapKeyboardProps {
  allWhiteKeys: KeyConfig[];
  allPianoKeys: KeyConfig[];
  startWhiteKeyIdx: number;
  windowSize: number;
  maxStartWhiteIdx: number;
  onSelectStartWhiteIdx: (idx: number) => void;
  currentlyPressedNotesRef: React.MutableRefObject<Set<string>>;
  showWaterfall?: boolean;
  studentPressedNotesRef?: React.MutableRefObject<Set<string>>;
}

export const MiniMapKeyboard: React.FC<MiniMapKeyboardProps> = ({
  allWhiteKeys,
  allPianoKeys,
  startWhiteKeyIdx,
  windowSize,
  maxStartWhiteIdx,
  onSelectStartWhiteIdx,
  currentlyPressedNotesRef,
  showWaterfall = true,
  studentPressedNotesRef,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);

  // Sync props to refs to prevent 60 FPS useEffect teardown & canvas context recreation
  const startWhiteKeyIdxRef = useRef<number>(startWhiteKeyIdx);
  startWhiteKeyIdxRef.current = startWhiteKeyIdx;

  const windowSizeRef = useRef<number>(windowSize);
  windowSizeRef.current = windowSize;

  const maxStartWhiteIdxRef = useRef<number>(maxStartWhiteIdx);
  maxStartWhiteIdxRef.current = maxStartWhiteIdx;

  const onSelectStartWhiteIdxRef = useRef(onSelectStartWhiteIdx);
  onSelectStartWhiteIdxRef.current = onSelectStartWhiteIdx;

  const allWhiteKeysRef = useRef(allWhiteKeys);
  allWhiteKeysRef.current = allWhiteKeys;

  const allPianoKeysRef = useRef(allPianoKeys);
  allPianoKeysRef.current = allPianoKeys;

  const showWaterfallRef = useRef(showWaterfall);
  showWaterfallRef.current = showWaterfall;

  // Cached note positions for 88 keys across canvas width
  const notePosCacheRef = useRef<Map<string, { x: number; width: number; isBlack: boolean; whiteIdx: number }>>(new Map());
  const canvasDimsRef = useRef<{ width: number; height: number }>({ width: 600, height: 56 });

  const numWhiteKeys = Math.max(1, allWhiteKeys.length); // 52 keys

  // Precompute physical X positions for all 88 keys whenever canvas width changes
  const updateKeyPositions = useCallback((width: number) => {
    const map = new Map<string, { x: number; width: number; isBlack: boolean; whiteIdx: number }>();
    const whiteWidth = width / numWhiteKeys;

    allWhiteKeysRef.current.forEach((k, idx) => {
      map.set(k.note, {
        x: idx * whiteWidth,
        width: whiteWidth,
        isBlack: false,
        whiteIdx: idx,
      });
    });

    allPianoKeysRef.current.forEach((k) => {
      if (k.type === 'black') {
        const allIdx = allPianoKeysRef.current.findIndex((x) => x.note === k.note);
        let whiteCountBefore = 0;
        for (let i = 0; i < allIdx; i++) {
          if (allPianoKeysRef.current[i].type === 'white') whiteCountBefore++;
        }
        const blackWidth = whiteWidth * 0.65;
        const x = whiteCountBefore * whiteWidth - blackWidth / 2;
        map.set(k.note, {
          x,
          width: blackWidth,
          isBlack: true,
          whiteIdx: Math.max(0, whiteCountBefore - 1),
        });
      }
    });

    notePosCacheRef.current = map;
  }, [numWhiteKeys]);

  const rafThrottledStateUpdateRef = useRef<number | null>(null);
  const pendingIdxRef = useRef<number | null>(null);

  const handlePointerInteraction = (clientX: number) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const relativeX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = relativeX / rect.width;
    const targetWhiteIdx = Math.round(ratio * (numWhiteKeys - 1));
    const centeredStart = Math.max(
      0,
      Math.min(maxStartWhiteIdxRef.current, targetWhiteIdx - Math.floor(windowSizeRef.current / 2))
    );

    // Update ref immediately for zero-latency 120 FPS visual feedback
    startWhiteKeyIdxRef.current = centeredStart;

    // Throttle React state setter via RAF so main thread isn't flooded with sync state updates
    pendingIdxRef.current = centeredStart;
    if (rafThrottledStateUpdateRef.current === null) {
      rafThrottledStateUpdateRef.current = requestAnimationFrame(() => {
        rafThrottledStateUpdateRef.current = null;
        if (pendingIdxRef.current !== null) {
          onSelectStartWhiteIdxRef.current(pendingIdxRef.current);
          pendingIdxRef.current = null;
        }
      });
    }
  };

  // Permanent 60/120 FPS Mini-Map Render Loop (Mounted ONCE with empty dependency array)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const resize = () => {
      if (containerRef.current && canvas) {
        const rect = containerRef.current.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        const cssWidth = Math.max(120, Math.floor(rect.width));
        const cssHeight = Math.max(34, Math.floor(rect.height));

        canvasDimsRef.current = { width: cssWidth, height: cssHeight };

        canvas.width = Math.floor(cssWidth * dpr);
        canvas.height = Math.floor(cssHeight * dpr);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        ctx.restore();
        ctx.save();
        ctx.scale(dpr, dpr);

        updateKeyPositions(cssWidth);
      }
    };

    resize();

    const onWinMouseUp = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener('mouseup', onWinMouseUp);
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);

    const render = () => {
      const { width, height } = canvasDimsRef.current;
      const keyPosMap = notePosCacheRef.current;
      const whiteWidth = width / numWhiteKeys;

      const currentStartWhiteIdx = startWhiteKeyIdxRef.current;
      const currentWindowSize = windowSizeRef.current;
      const isWaterfallOn = showWaterfallRef.current;

      // RADAR PREVIEW & FULL 88-KEY MINI PIANO
      const radarHeight = isWaterfallOn ? 12 : 0;
      const keysTopY = radarHeight;
      const keysHeight = Math.max(18, height - keysTopY);
      const blackKeyHeight = Math.round(keysHeight * 0.60);

      // 1. Dark background
      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, width, height);

      // 1b. Radar strip background
      if (isWaterfallOn) {
        ctx.fillStyle = '#080c14';
        ctx.fillRect(0, 0, width, radarHeight);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, radarHeight - 1, width, 1);
      }

      // 2. Draw 52 White Mini Keys
      const whiteKeys = allWhiteKeysRef.current;
      const studentPressedRef = studentPressedNotesRef;
      for (let i = 0; i < numWhiteKeys; i++) {
        const wk = whiteKeys[i];
        if (!wk) continue;
        const isStudent = studentPressedRef?.current?.has(wk.note) ?? false;
        const isPressed = currentlyPressedNotesRef.current.has(wk.note) || isStudent;
        const x = i * whiteWidth;
        const w = Math.max(1, whiteWidth - 1);

        if (isPressed) {
          ctx.fillStyle = isStudent ? '#38bdf8' : '#f59e0b'; // Cyan for student, gold for teacher
        } else {
          ctx.fillStyle = '#cbd5e1'; // Clean ivory white
        }

        ctx.fillRect(x, keysTopY, w, keysHeight);

        // Draw C octave label (C1...C8)
        if (wk.note.startsWith('C')) {
          ctx.fillStyle = isPressed ? '#000000' : '#475569';
          ctx.font = 'bold 8px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(wk.note, x + w / 2, height - 2);
        }
      }

      // 3. Draw 36 Black Mini Keys
      allPianoKeysRef.current.forEach((pk) => {
        if (pk.type === 'black') {
          const pos = keyPosMap.get(pk.note);
          if (!pos) return;
          const isStudent = studentPressedRef?.current?.has(pk.note) ?? false;
          const isPressed = currentlyPressedNotesRef.current.has(pk.note) || isStudent;

          if (isPressed) {
            ctx.fillStyle = isStudent ? '#0284c7' : '#fbbf24'; // Cyan for student black keys, bright yellow for teacher
          } else {
            ctx.fillStyle = '#0f172a'; // Deep black key
          }

          ctx.fillRect(pos.x, keysTopY, pos.width, blackKeyHeight);
        }
      });

      // 4. Highlight Upcoming Notes in the Radar Strip
      let offscreenLeftNote: string | null = null;
      let offscreenRightNote: string | null = null;

      if (isWaterfallOn) {
        const curSong = songPlaybackState.activeSong;
        const curTime = songPlaybackState.currentTime;

        if (curSong?.notes) {
          const visualLeadTime = curTime + 0.08;
          const nList = curSong.notes;
          const nLen = nList.length;

          for (let i = 0; i < nLen; i++) {
            const n = nList[i];
            const timeToHit = n.time - visualLeadTime;

            if (timeToHit < -0.2) continue;
            if (timeToHit > 2.0) break;

            const pos = keyPosMap.get(n.note);
            if (!pos) continue;

            const isOutside = pos.whiteIdx < currentStartWhiteIdx || pos.whiteIdx >= currentStartWhiteIdx + currentWindowSize;
            const noteW = Math.max(3, pos.width);

            const progress = Math.max(0, Math.min(1, 1 - (timeToHit / 2.0)));
            const noteY = Math.max(1, Math.min(radarHeight - 4, Math.floor(progress * (radarHeight - 4))));

            if (isOutside) {
              ctx.fillStyle = '#f59e0b';
              ctx.fillRect(pos.x, noteY, noteW, 3);

              if (timeToHit < 1.2) {
                if (pos.whiteIdx < currentStartWhiteIdx) {
                  offscreenLeftNote = n.note;
                } else {
                  offscreenRightNote = n.note;
                }
              }
            } else {
              ctx.fillStyle = pos.isBlack ? '#c084fc' : '#38bdf8';
              ctx.fillRect(pos.x, noteY, noteW, 3);
            }
          }
        }
      }

      // 5. Active Viewport Window Indicator
      const boxLeft = (currentStartWhiteIdx / numWhiteKeys) * width;
      const boxWidth = (Math.min(currentWindowSize, numWhiteKeys - currentStartWhiteIdx) / numWhiteKeys) * width;

      ctx.fillStyle = 'rgba(34, 211, 238, 0.16)';
      ctx.fillRect(boxLeft, keysTopY, boxWidth, keysHeight);

      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.strokeRect(boxLeft + 1, keysTopY + 1, boxWidth - 2, keysHeight - 2);

      // 6. Off-Screen Directional Alert Badges
      if (offscreenLeftNote) {
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`◀ ${offscreenLeftNote}`, Math.max(26, boxLeft - 4), Math.max(10, radarHeight - 5));
      }

      if (offscreenRightNote) {
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${offscreenRightNote} ▶`, Math.min(width - 28, boxLeft + boxWidth + 4), Math.max(10, radarHeight - 5));
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mouseup', onWinMouseUp);
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rafThrottledStateUpdateRef.current !== null) {
        cancelAnimationFrame(rafThrottledStateUpdateRef.current);
      }
    };
  }, [numWhiteKeys, updateKeyPositions, currentlyPressedNotesRef]);

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => {
        isDraggingRef.current = true;
        handlePointerInteraction(e.clientX);
      }}
      onMouseMove={(e) => {
        if (isDraggingRef.current) handlePointerInteraction(e.clientX);
      }}
      onMouseUp={() => {
        isDraggingRef.current = false;
      }}
      onTouchStart={(e) => {
        if (e.touches[0]) handlePointerInteraction(e.touches[0].clientX);
      }}
      onTouchMove={(e) => {
        if (e.touches[0]) handlePointerInteraction(e.touches[0].clientX);
      }}
      className="relative flex-1 h-9 sm:h-10 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden cursor-pointer select-none touch-none flex items-center shadow-inner"
      title="88-Key Mini Keyboard: tap to shift view or track incoming notes"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
