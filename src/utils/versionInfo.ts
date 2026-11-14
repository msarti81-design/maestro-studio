export const APP_VERSION = '1.0.234';
export const APP_BUILD_DATE = '14 Nov 2026 - 07:10';
export const APP_COMMIT = 'c8a4f20';
export const APP_CHANGELOG = [
  'Added 4 copyright-safe retro 8-bit Center Stage Animations (Pixel Runner, Retro Coins & Blocks, Space Rocket, Neon Arcade Grid) reactive in Waterfall, Free Play & Video recording',
  'Added compact Center Stage Animation button in 3-dots Options opening a full scrollable Gallery modal for mobile portrait & landscape',
  'Made the 14-FX Gallery Picker a full scrollable viewport modal & added Top-Pinned Title Editor in Sheet Composer',
  'Dynamic GitHub Actions APK/AAB release versioning synced to v1.0.234 (versionCode 10234)',
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
