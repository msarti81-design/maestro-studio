export const APP_VERSION = '1.0.229';
export const APP_BUILD_DATE = '13 Nov 2026 - 19:55';
export const APP_COMMIT = 'a9e3c42';
export const APP_CHANGELOG = [
  'Fixed Horizontal 16:9 & Vertical 9:16 Video Download button (synchronous instant download + automatic video archive in Video menu & server data/videos)',
  'Fixed multi-track & Karaoke MIDI import (Baby Shark & complex MIDIs): full Running Status preservation & polyphonic melody + chord playback',
  'New "Rimbalzi" (Bouncing Rhythm Balls) FX mode: colorful 3D glowing spheres bounce on keys in musical rhythm',
  'Production signed AAB & APK build v1.0.229 (versionCode 10229) for Google Play Console',
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
