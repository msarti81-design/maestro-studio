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
