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
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);

  // Cached note positions for 88 keys across canvas width
  const notePosCacheRef = useRef<Map<string, { x: number; width: number; isBlack: boolean; whiteIdx: number }>>(new Map());
  const canvasDimsRef = useRef<{ width: number; height: number }>({ width: 600, height: 56 });

  const numWhiteKeys = Math.max(1, allWhiteKeys.length); // 52 keys

  // Precompute physical X positions for all 88 keys whenever canvas width changes
  const updateKeyPositions = useCallback((width: number) => {
    const map = new Map<string, { x: number; width: number; isBlack: boolean; whiteIdx: number }>();
    const whiteWidth = width / numWhiteKeys;

    allWhiteKeys.forEach((k, idx) => {
      map.set(k.note, {
        x: idx * whiteWidth,
        width: whiteWidth,
        isBlack: false,
        whiteIdx: idx,
      });
    });

    allPianoKeys.forEach((k) => {
      if (k.type === 'black') {
        const allIdx = allPianoKeys.findIndex((x) => x.note === k.note);
        let whiteCountBefore = 0;
        for (let i = 0; i < allIdx; i++) {
          if (allPianoKeys[i].type === 'white') whiteCountBefore++;
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
  }, [allWhiteKeys, allPianoKeys, numWhiteKeys]);

  const handlePointerInteraction = (clientX: number) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const relativeX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = relativeX / rect.width;
    const targetWhiteIdx = Math.round(ratio * (numWhiteKeys - 1));
    const centeredStart = Math.max(
      0,
      Math.min(maxStartWhiteIdx, targetWhiteIdx - Math.floor(windowSize / 2))
    );
    onSelectStartWhiteIdx(centeredStart);
  };

  // Main 60 FPS Mini-Map Render Loop
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

      // RADAR PREVIEW & FULL 88-KEY MINI PIANO
      // Upper radar strip (12px) shows incoming note markers landing onto keys when notes are ON
      const radarHeight = showWaterfall ? 12 : 0;
      const keysTopY = radarHeight;
      const keysHeight = Math.max(18, height - keysTopY);
      const blackKeyHeight = Math.round(keysHeight * 0.60);

      // 1. Dark background
      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, width, height);

      // 1b. Radar strip background (space above the small keyboard for incoming notes)
      if (showWaterfall) {
        ctx.fillStyle = '#080c14';
        ctx.fillRect(0, 0, width, radarHeight);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, radarHeight - 1, width, 1);
      }

      // 2. Draw 52 White Mini Keys
      for (let i = 0; i < numWhiteKeys; i++) {
        const wk = allWhiteKeys[i];
        const isPressed = currentlyPressedNotesRef.current.has(wk.note);
        const x = i * whiteWidth;
        const w = Math.max(1, whiteWidth - 1);

        if (isPressed) {
          ctx.fillStyle = '#f59e0b'; // Gold on press
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
      allPianoKeys.forEach((pk) => {
        if (pk.type === 'black') {
          const pos = keyPosMap.get(pk.note);
          if (!pos) return;
          const isPressed = currentlyPressedNotesRef.current.has(pk.note);

          if (isPressed) {
            ctx.fillStyle = '#fbbf24'; // Bright yellow on press
          } else {
            ctx.fillStyle = '#0f172a'; // Deep black key
          }

          ctx.fillRect(pos.x, keysTopY, pos.width, blackKeyHeight);
        }
      });

      // 4. Highlight Upcoming Notes & Off-Screen Guidance in the Radar Strip
      let offscreenLeftNote: string | null = null;
      let offscreenRightNote: string | null = null;

      if (showWaterfall) {
        const curSong = songPlaybackState.activeSong;
        const curTime = songPlaybackState.currentTime;

        if (curSong?.notes) {
          const visualLeadTime = curTime + 0.08;
          const nList = curSong.notes;
          const nLen = nList.length;

          for (let i = 0; i < nLen; i++) {
            const n = nList[i];
            const timeToHit = n.time - visualLeadTime;

            // Past notes: skip
            if (timeToHit < -0.2) continue;
            // Far future notes: break immediately (notes are chronological)
            if (timeToHit > 2.0) break;

            const pos = keyPosMap.get(n.note);
            if (!pos) continue;

            const isOutside = pos.whiteIdx < startWhiteKeyIdx || pos.whiteIdx >= startWhiteKeyIdx + windowSize;
            const noteW = Math.max(3, pos.width);

            // Calculate Y position in the upper radar strip (0 at top, approaching keysTopY)
            const progress = Math.max(0, Math.min(1, 1 - (timeToHit / 2.0)));
            const noteY = Math.max(1, Math.min(radarHeight - 4, Math.floor(progress * (radarHeight - 4))));

            if (isOutside) {
              // Amber Beacon on off-screen keys
              ctx.fillStyle = '#f59e0b';
              ctx.fillRect(pos.x, noteY, noteW, 3);

              if (timeToHit < 1.2) {
                if (pos.whiteIdx < startWhiteKeyIdx) {
                  offscreenLeftNote = n.note;
                } else {
                  offscreenRightNote = n.note;
                }
              }
            } else {
              // Cyan/Violet beacon on in-viewport keys
              ctx.fillStyle = pos.isBlack ? '#c084fc' : '#38bdf8';
              ctx.fillRect(pos.x, noteY, noteW, 3);
            }
          }
        }
      }

      // 5. Active Viewport Window Indicator (Cyan glowing frame)
      const boxLeft = (startWhiteKeyIdx / numWhiteKeys) * width;
      const boxWidth = (Math.min(windowSize, numWhiteKeys - startWhiteKeyIdx) / numWhiteKeys) * width;

      // Cyan tinted window over currently visible keys
      ctx.fillStyle = 'rgba(34, 211, 238, 0.16)';
      ctx.fillRect(boxLeft, keysTopY, boxWidth, keysHeight);

      // Frame border
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.strokeRect(boxLeft + 1, keysTopY + 1, boxWidth - 2, keysHeight - 2);

      // 6. Off-Screen Directional Alert Badges (High contrast in radar strip)
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
    };
  }, [allWhiteKeys, allPianoKeys, startWhiteKeyIdx, windowSize, numWhiteKeys, updateKeyPositions, currentlyPressedNotesRef, showWaterfall]);

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
