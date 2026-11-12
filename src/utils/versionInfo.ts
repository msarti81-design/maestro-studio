export const APP_VERSION = '1.0.226';
export const APP_BUILD_DATE = '12 Nov 2026 - 19:25';
export const APP_COMMIT = 'b8d5f12';
export const APP_CHANGELOG = [
  'Interactive Onboarding Walkthrough & Progress Checklist with automatic step return pill',
  'In-App Rate VirtuKeys on Google Play & Share App with customizable message',
  '13 selectable Falling Notes visual FX + 10 luxury 3D key materials (Emerald, Ruby, Sapphire, Amethyst)',
  'Production signed AAB & APK build v1.0.226 (versionCode 10226) for Google Play Console',
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
