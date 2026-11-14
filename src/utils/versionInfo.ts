export const APP_VERSION = '1.0.238';
export const APP_BUILD_DATE = '14 Nov 2026 - 09:50';
export const APP_COMMIT = 'c4b7f28';
export const APP_CHANGELOG = [
  'Realistic per-key piano destruction: every white and black key cracks, chips, tilts, snaps off individually and exposes the hollow interior keyframe underneath',
  'Overload Detonator 100% blasts shake the screen, launch key shrapnel & advance through 4 destruction stages into the smoking Abyssal Crater while music keeps playing',
  'One-tap Repair button in the top bar + automatic restore on song switch or FX reset',
  'Dynamic GitHub Actions APK/AAB release versioning synced to v1.0.238 (versionCode 10238)',
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
      error: err?.message || 'Connection failed',
    };
  }
}
