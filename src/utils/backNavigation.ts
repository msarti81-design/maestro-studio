import { useEffect, useRef } from 'react';

interface BackHandlerEntry {
  id: number;
  priority: number;
  order: number;
  handler: () => void;
}

declare global {
  interface Window {
    __virtukeysHandleBack?: () => boolean;
  }
}

const entries: BackHandlerEntry[] = [];
let nextId = 1;
let nextOrder = 1;
let isInitialized = false;
let lastHandledAt = 0;

function pickTopEntry(): BackHandlerEntry | null {
  if (entries.length === 0) return null;
  let best = entries[0];
  for (let i = 1; i < entries.length; i++) {
    const cur = entries[i];
    if (cur.priority > best.priority || (cur.priority === best.priority && cur.order > best.order)) {
      best = cur;
    }
  }
  return best;
}

export function triggerBackNavigation(): boolean {
  const now = Date.now();
  // Guard against double-firing if native Android & popstate both trigger within a few ms
  if (now - lastHandledAt < 80) {
    return true;
  }
  lastHandledAt = now;

  const top = pickTopEntry();
  if (top) {
    try {
      top.handler();
    } catch {
      // Ignore handler error so navigation never crashes
    }
    return true;
  }
  // Always return true to prevent leaving the app even at root Home
  return true;
}

function pushSentinelHistoryState() {
  if (typeof window === 'undefined') return;
  try {
    window.history.pushState({ vkBackLock: true, ts: Date.now() }, '', window.location.href);
  } catch {
    // Ignore history restrictions in sandboxed environments
  }
}

export function initGlobalBackNavigation(): void {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  window.__virtukeysHandleBack = () => triggerBackNavigation();

  // Seed initial history sentinel so browser/PWA hardware back never exits app
  if (!window.history.state || !window.history.state.vkBackLock) {
    pushSentinelHistoryState();
  }

  window.addEventListener('popstate', () => {
    // Immediately re-arm history lock so repeated back presses never leave the app
    pushSentinelHistoryState();
    triggerBackNavigation();
  });

  window.addEventListener('virtukeys:back', () => {
    triggerBackNavigation();
  });
}

/**
 * Registers a LIFO + priority back handler while `isActive` is true.
 * Higher `priority` layers always intercept Back before lower ones:
 * - 40: Nested sub-modals (e.g. Options sub-modals, Waterfall FX Picker, MIDI Track Selector)
 * - 30: Primary modals (e.g. Options Hub, Library, Metronome, Profile, Export/Import, Tutorial)
 * - 20: Embedded sub-views (e.g. FallingNotesWaterfall inside PianoView)
 * - 10: Top-level app views (App view history / Back to Home)
 */
export function useBackHandler(isActive: boolean, handler: () => void, priority: number = 30): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    initGlobalBackNavigation();
    if (!isActive) return;

    const entry: BackHandlerEntry = {
      id: nextId++,
      priority,
      order: nextOrder++,
      handler: () => handlerRef.current(),
    };
    entries.push(entry);

    return () => {
      const idx = entries.findIndex((e) => e.id === entry.id);
      if (idx !== -1) {
        entries.splice(idx, 1);
      }
    };
  }, [isActive, priority]);
}
