export const APP_VERSION = '1.0.174';
export const APP_BUILD_DATE = '30 Ottobre 2026 - 11:55';
export const APP_COMMIT = '5c802e1';
export const APP_CHANGELOG = [
  'Eliminazione eco e ritorno di voce (Acoustic Echo Cancellation software + esclusione mittente garantita)',
  'Intercom vocale Web Audio PCM in tempo reale a zero errori (funziona su qualsiasi smartphone e tablet)',
  'Ripristinato suono note in tempo reale in modalità Masterclass tra Maestro e Allievo',
  'Sincronizzazione note bidirezionale garantita (WebSocket + HTTP POST simultanei)',
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
