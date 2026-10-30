export const APP_VERSION = '1.0.171';
export const APP_BUILD_DATE = '30 Ottobre 2026 - 06:31';
export const APP_COMMIT = '8c301f7';
export const APP_CHANGELOG = [
  'Eliminazione definitiva del crackle sui bassi veloci (HPF a 40Hz, gain bilanciato x1.5 e velocity scaling ottimizzato)',
  'Filtro High-Pass a 35Hz e anti-crackle master chain per eliminare la distorsione sui bassi veloci',
  'Volume estremo al massimo limite (Gain x4.0, Sampler +14dB, Compressor -28dB per eguagliare Perfect Piano)',
  'Massimo volume e punch (Compressor aggressivo -24dB, Gain x2.5 e Sampler +8dB pari alle app native)',
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
