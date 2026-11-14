export const APP_VERSION = '1.0.236';
export const APP_BUILD_DATE = '14 Nov 2026 - 08:45';
export const APP_COMMIT = 'f2a9c41';
export const APP_CHANGELOG = [
  'Added 6 curiosity & anticipation kinetic visualizers (24 FX total): Combo Reactor, Overload Detonator (0→100% Blast), Laser Pinball Arena, Gravity Slingshot, Crystal Mosaic, and Auto-Morph Twist',
  'Full-row tappable category triggers in 3-dots Options hub opening dedicated scrollable sub-modals',
  'Universal step-by-step Back navigation across Android hardware Back button and browser Popstate (steps back 1 layer cleanly across all modals, Waterfall & views without ever exiting the app)',
  'Dynamic GitHub Actions APK/AAB release versioning synced to v1.0.236 (versionCode 10236)',
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
