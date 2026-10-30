export const APP_VERSION = '1.0.172';
export const APP_BUILD_DATE = '30 Ottobre 2026 - 11:05';
export const APP_COMMIT = '1f402a8';
export const APP_CHANGELOG = [
  'Sincronizzazione note bidirezionale garantita (WebSocket + HTTP POST simultanei) e Auto-connect vocale tra dispositivi',
  'Eliminazione definitiva del crackle sui bassi veloci (HPF a 40Hz, gain bilanciato x1.5 e velocity scaling ottimizzato)',
  'Filtro High-Pass a 35Hz e anti-crackle master chain per eliminare la distorsione sui bassi veloci',
  'Volume estremo al massimo limite (Gain x4.0, Sampler +14dB, Compressor -28dB per eguagliare Perfect Piano)',
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
