export const APP_VERSION = '1.0.157';
export const APP_BUILD_DATE = '29 Ottobre 2026 - 14:35';
export const APP_COMMIT = '3013d77';
export const APP_CHANGELOG = [
  'Fix connessione WebSocket & API per APK Android su freeserv.it',
  'Motore audio professionale Tone.js: soppressione crackling e saturazione nei glissando rapidi',
  'Grafica Waterfall a cascata: testi e countdown compatti integrati nello spazio nero senza tagli',
  'Normalizzazione codici stanza Masterclass (es. 542, M-542, MASTERCLASS-542)',
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
