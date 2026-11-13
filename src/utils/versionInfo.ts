export const APP_VERSION = '1.0.233';
export const APP_BUILD_DATE = '13 Nov 2026 - 22:55';
export const APP_COMMIT = 'e5c3a19';
export const APP_CHANGELOG = [
  'Made the 14-FX Gallery Picker a full scrollable viewport modal so all falling-note visual effects can be scrolled & selected cleanly on any screen',
  'Added Top-Pinned Title Editor in Sheet Composer so the Android soft keyboard never covers the song title while typing',
  'Integrated 🌈 Pop Rainbow, 🐾 Pet & Paws, and 🍭 Sweet Pastel keyboard styles directly among Studio styles + elevated Video Format modal',
  'Fixed Video Download via both Download Video button & native 3-dots menu with 384KB chunked upload & full English UI (v1.0.233 / versionCode 10233)',
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
