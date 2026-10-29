export function getAppBasePrefix(): string {
  if (typeof window === 'undefined') return '';
  const pathname = window.location.pathname;
  if (pathname.startsWith('/Song')) return '/Song';
  if (pathname.startsWith('/song')) return '/song';
  return '';
}

export function getAppWebSocketUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:3000/ws';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const prefix = getAppBasePrefix();
  return `${protocol}//${host}${prefix}/ws`;
}

export function getAppApiUrl(endpoint: string): string {
  const prefix = getAppBasePrefix();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${prefix}${cleanEndpoint}`;
}

export function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return 'server_session';
  try {
    let id = sessionStorage.getItem('maestro_client_session_id');
    if (!id) {
      id = `cli_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      sessionStorage.setItem('maestro_client_session_id', id);
    }
    return id;
  } catch (e) {
    return `cli_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
