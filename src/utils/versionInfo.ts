export const APP_VERSION = '1.0.231';
export const APP_BUILD_DATE = '13 Nov 2026 - 22:35';
export const APP_COMMIT = 'c9e7f31';
export const APP_CHANGELOG = [
  'Fixed Video Download in App & Browser via both "⬇️ Scarica Video" button AND native 3-dots menu ("⋮ -> Scarica") with 512KB chunked server upload',
  'Added 3 Cartoon Kids Keyboard styles: 🌈 Cartoon Rainbow (with kawaii faces), 🐶 Cuccioli Cartoon (animals & paw prints), and 🍭 Candy & Dolci (ice cream & sprinkles) + 1-tap Kids button',
  'Fixed multi-track & Karaoke MIDI import (Baby Shark & complex MIDIs): full Running Status preservation & polyphonic melody + chord playback',
  'Production signed AAB & APK build v1.0.231 (versionCode 10231) for Google Play Console',
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
