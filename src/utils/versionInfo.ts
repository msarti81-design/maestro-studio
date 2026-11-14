export const APP_VERSION = '1.0.237';
export const APP_BUILD_DATE = '14 Nov 2026 - 09:30';
export const APP_COMMIT = 'a8d4e19';
export const APP_CHANGELOG = [
  'Overload Detonator 100% blast now triggers a 60fps damped earthquake screen shake & flying key shrapnel',
  'Progressive 4-stage piano destruction: hairline cracks → deep shatter splits → glowing magma fissures → smoking Abyssal Crater while music keeps playing uninterrupted',
  'One-tap Repair button in the top bar (plus automatic key restoration on song switch or FX reset)',
  'Dynamic GitHub Actions APK/AAB release versioning synced to v1.0.237 (versionCode 10237)',
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
