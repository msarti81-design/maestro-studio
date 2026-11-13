export const APP_VERSION = '1.0.228';
export const APP_BUILD_DATE = '13 Nov 2026 - 16:30';
export const APP_COMMIT = 'f4b8d19';
export const APP_CHANGELOG = [
  'Fixed multi-track & Karaoke MIDI import (Baby Shark & complex MIDIs): full Running Status preservation after Meta events, per-channel splitting & full polyphonic melody + chord playback',
  'New "Rimbalzi" (Bouncing Rhythm Balls) FX mode: colorful 3D glowing spheres bounce on keys in musical rhythm',
  'Interactive Onboarding Walkthrough & Progress Checklist with automatic step return pill',
  'Production signed AAB & APK build v1.0.228 (versionCode 10228) for Google Play Console',
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
