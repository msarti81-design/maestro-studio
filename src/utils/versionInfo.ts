export const APP_VERSION = '1.0.178';
export const APP_BUILD_DATE = '30 Ottobre 2026 - 13:25';
export const APP_COMMIT = '2f9a74c';
export const APP_CHANGELOG = [
  'Evidenziazione tasti allievo in colore distinto (Ciano/Celeste) sullo schermo del Maestro',
  'Ripristino Vivavoce Full-Duplex bidirezionale con renegotiation WebRTC automatica all attivazione del microfono',
  'WebRTC DataChannel P2P Ultra-Veloce: note istantanee (<10ms) per glissando e passaggi rapidi',
  'Audio pianoforte unidirezionale in Masterclass: suona solo lo studente verso il maestro',
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
