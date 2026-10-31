export const APP_VERSION = '1.0.190';
export const APP_BUILD_DATE = '31 Ottobre 2026 - 10:35';
export const APP_COMMIT = 'b3d4e2f';
export const APP_CHANGELOG = [
  'Rilevamento disconnessione automatica in tempo reale: notifica a video immediata e ritorno assistito alla scheda Social quando uno dei partecipanti si disconnette',
  'WebRTC Unified Plan Fix: rimosso transceiver duplicato (mid: null) sul lato ricevente per garantire voce Full-Duplex simmetrica',
  'Evidenziazione tasti allievo in colore distinto (Ciano/Celeste) sullo schermo del Maestro',
  'WebRTC DataChannel P2P Ultra-Veloce: note istantanee (<10ms) per glissando e passaggi rapidi',
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
