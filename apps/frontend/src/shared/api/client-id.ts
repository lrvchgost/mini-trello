const STORAGE_KEY = 'min-trello:client-id';

let cached: string | null = null;

/**
 * Stable tab id used for the `X-Client-Id` header. `sessionStorage` is per-tab
 * (and survives reloads within the tab), so two browser tabs get distinct ids and
 * the client can deduplicate its own websocket events.
 */
export function getClientId(): string {
  if (cached) {
    return cached;
  }

  if (typeof window === 'undefined') {
    cached = 'server';
    return cached;
  }

  const stored = window.sessionStorage.getItem(STORAGE_KEY);
  if (stored) {
    cached = stored;
    return cached;
  }

  cached = crypto.randomUUID();
  window.sessionStorage.setItem(STORAGE_KEY, cached);
  return cached;
}
