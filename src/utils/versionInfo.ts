export const APP_VERSION = '1.0.176';
export const APP_BUILD_DATE = '30 Ottobre 2026 - 12:35';
export const APP_COMMIT = '4e712a8';
export const APP_CHANGELOG = [
  'Vivavoce Full-Duplex bidirezionale simultaneo: entrambi possono parlare e ascoltarsi nello stesso istante',
  'Eliminata collisione offerte WebRTC glare e integrato replaceTrack per flusso voce continuo',
  'Audio pianoforte unidirezionale: in Masterclass suona solo lo studente verso il maestro (il maestro passa con Invia Frase/Waterfall)',
  'WebRTC Voice con OpenRelay TURN ad alta definizione senza congestione di rete né distorsioni',
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
