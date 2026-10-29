export const PRODUCTION_DOMAIN = 'freeserv.it';
export const PRODUCTION_ORIGIN = 'https://freeserv.it';
export const PRODUCTION_PREFIX = '/Song';
export const PRODUCTION_BASE_URL = `${PRODUCTION_ORIGIN}${PRODUCTION_PREFIX}`; // https://freeserv.it/Song

/**
 * Detects if the app is currently running inside the native Android/iOS wrapper (Capacitor/Cordova/WebView)
 */
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Capacitor native check
  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.()) return true;
  if (cap && typeof cap.getPlatform === 'function' && cap.getPlatform() !== 'web') return true;

  // 2. Protocols used by mobile webviews
  const protocol = window.location.protocol;
  if (protocol === 'capacitor:' || protocol === 'ionic:' || protocol === 'content:') return true;

  // 3. Android WebView localhost origin without dev ports (3000 / 5173)
  const host = window.location.hostname;
  const port = window.location.port;
  if (host === 'localhost' || host === '127.0.0.1') {
    // Port 3000 or 5173 is our local development server
    if (port === '3000' || port === '5173') {
      return false;
    }
    // Port empty or 80/443 inside localhost WebView -> definitely Android APK!
    return true;
  }

  return false;
}

/**
 * Returns the base prefix for the web app routing (/Song on freeserv.it)
 */
export function getAppBasePrefix(): string {
  if (typeof window === 'undefined') return '';
  if (isNativePlatform()) return PRODUCTION_PREFIX;
  const pathname = window.location.pathname;
  if (pathname.startsWith('/Song')) return '/Song';
  if (pathname.startsWith('/song')) return '/song';
  return '';
}

/**
 * Gets the configured or default server base URL
 */
export function getServerBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  try {
    const custom = localStorage.getItem('maestro_server_base_url');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
  } catch (e) {}

  if (isNativePlatform()) {
    return PRODUCTION_BASE_URL;
  }

  return '';
}

/**
 * Builds WebSocket URL: in native APK it connects to wss://freeserv.it/Song/ws
 * In browser it connects to wss://[host][prefix]/ws
 */
export function getAppWebSocketUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:3000/ws';

  if (isNativePlatform()) {
    const base = getServerBaseUrl();
    const wsBase = base.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
    return `${wsBase}/ws`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const prefix = getAppBasePrefix();
  return `${protocol}//${host}${prefix}/ws`;
}

/**
 * Builds API endpoint URL: in native APK it connects to https://freeserv.it/Song/api/...
 * In browser it connects to /Song/api/... or /api/...
 */
export function getAppApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (isNativePlatform()) {
    const base = getServerBaseUrl();
    return `${base}${cleanEndpoint}`;
  }

  const prefix = getAppBasePrefix();
  return `${prefix}${cleanEndpoint}`;
}

/**
 * Generates public shareable URLs (for copying room invite links or WhatsApp sharing)
 * Always resolves to https://freeserv.it/Song when running in APK so students can open it!
 */
export function getPublicShareBaseUrl(): string {
  if (typeof window === 'undefined') return PRODUCTION_BASE_URL;

  if (isNativePlatform()) {
    return PRODUCTION_BASE_URL;
  }

  const origin = window.location.origin;
  const prefix = getAppBasePrefix();
  return `${origin}${prefix}`;
}

/**
 * Normalizes any user-entered room code:
 * - Digits: "542" -> "MASTERCLASS-542"
 * - Shortcuts: "M542", "M-542", "ROOM-542", "AULA 542" -> "MASTERCLASS-542"
 * - Preserves existing prefix: "MASTERCLASS-542", "BATTLE-123"
 */
export function normalizeRoomCode(rawCode: string, defaultMode: string = 'masterclass'): string {
  if (!rawCode) return '';
  let clean = rawCode.trim().toUpperCase().replace(/^#/, '').replace(/\s+/g, '-');
  if (!clean) return '';

  // If user typed pure digits (e.g. "542" or "101")
  if (/^\d+$/.test(clean)) {
    switch (defaultMode) {
      case 'masterclass':
        return `MASTERCLASS-${clean}`;
      case 'battle':
        return `BATTLE-${clean}`;
      case 'duet':
        return `DUET-${clean}`;
      case 'pianobar':
        return `PIANOBAR-${clean}`;
      case 'relay':
        return `RELAY-${clean}`;
      case 'guess':
        return `QUIZ-${clean}`;
      default:
        return `MASTERCLASS-${clean}`;
    }
  }

  // If user typed e.g. "M-542", "M542", "M 542"
  if (/^M-?\d+$/.test(clean)) {
    return clean.replace(/^M-?/, 'MASTERCLASS-');
  }

  // If user typed e.g. "ROOM-542", "ROOM 542", "ROOM542" or "AULA-542"
  if (/^(ROOM|AULA)-?\d+$/.test(clean)) {
    return clean.replace(/^(ROOM|AULA)-?/, 'MASTERCLASS-');
  }

  if (/^MASTERCLASS\d+$/.test(clean)) {
    return clean.replace(/^MASTERCLASS/, 'MASTERCLASS-');
  }

  return clean;
}

/**
 * Unique client session ID to distinguish teacher and student sessions reliably
 */
export function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return 'server_session';
  try {
    let id = sessionStorage.getItem('maestro_client_session_id');
    if (!id) {
      id = `cli_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      sessionStorage.setItem('maestro_client_session_id', id);
    }
    return id;
  } catch (e) {
    return `cli_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
