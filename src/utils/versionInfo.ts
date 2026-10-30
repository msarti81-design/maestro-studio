export const APP_VERSION = '1.0.177';
export const APP_BUILD_DATE = '30 Ottobre 2026 - 13:10';
export const APP_COMMIT = '8b3c19e';
export const APP_CHANGELOG = [
  'WebRTC DataChannel P2P Ultra-Veloce: note pianoforte istantanee (<10ms) per glissando e passaggi rapidi senza ritardi né note perse',
  'Vivavoce Full-Duplex bidirezionale simultaneo con transceiver sendrecv e replaceTrack: entrambi possono parlare e ascoltarsi nello stesso istante',
  'Audio pianoforte unidirezionale: in Masterclass il suono scorre solo dallo studente al maestro (il maestro invia note via Invia Frase o Waterfall)',
  'WebRTC Voice con OpenRelay TURN e cancellazione eco acustica per conversazione cristallina a due vie',
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
