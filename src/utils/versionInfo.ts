export const APP_VERSION = '1.0.232';
export const APP_BUILD_DATE = '13 Nov 2026 - 22:45';
export const APP_COMMIT = 'd4a2b88';
export const APP_CHANGELOG = [
  'Integrated 🌈 Pop Rainbow, 🐾 Pet & Paws, and 🍭 Sweet Pastel keyboard styles directly among Studio styles (no external Kids button)',
  'Elevated Video Format selector modal (z-[120]) above the 88-key mini-keyboard and auto-restarts active song from 0:00 with current settings when recording starts',
  'Fixed Video Download in App & Browser via both "⬇️ Scarica Video" button AND native 3-dots menu ("⋮ -> Scarica") with 384KB chunked server upload',
  'Production signed AAB & APK build v1.0.232 (versionCode 10232) for Google Play Console',
];

export interface ServerVersionInfo {
  version: string;
  buildDate?: string;
  commit?: string;
  status: string;
}

export async function checkServerVersion(): Promise<{
  clientVersion: string;
  serverVersion: string | null;
  isUpToDate: boolean;
  status: 'synced' | 'server_outdated' | 'client_outdated' | 'offline';
  error?: string;
}> {
  try {
    const { getAppApiUrl } = await import('./networkHelper');
    const res = await fetch(getAppApiUrl('/api/version'), { cache: 'no-store' });
    if (!res.ok) {
      return {
        clientVersion: APP_VERSION,
        serverVersion: null,
        isUpToDate: false,
        status: 'offline',
        error: `Server HTTP ${res.status}`,
      };
    }
    const data = await res.json();
    const serverVer = data.version || 'unknown';
    const isUpToDate = serverVer === APP_VERSION;
    return {
      clientVersion: APP_VERSION,
      serverVersion: serverVer,
      isUpToDate,
      status: isUpToDate ? 'synced' : 'server_outdated',
    };
  } catch (err: any) {
    return {
      clientVersion: APP_VERSION,
      serverVersion: null,
      isUpToDate: false,
      status: 'offline',
      error: err?.message || 'Connessione fallita',
    };
  }
}
