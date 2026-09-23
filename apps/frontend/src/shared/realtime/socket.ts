import { io, type Socket } from 'socket.io-client';
import { refreshAccessToken } from '../api/refresh';
import { getAccessToken, subscribeAccessToken } from '../api/token-store';
import { env } from '../config/env';

export type RealtimeSocket = Socket;

/** Socket.IO needs an http(s) URL — the dev env exposes `ws://`/`wss://`. */
export function normalizeSocketUrl(url: string): string {
  return url.replace(/^ws:/, 'http:').replace(/^wss:/, 'https:');
}

let socket: RealtimeSocket | null = null;
let unsubscribeToken: (() => void) | null = null;
let refreshing = false;

/**
 * Refreshes the access token once (single-flight) and reconnects the socket with
 * it. Guards against overlapping `connect_error` events while the refresh is in
 * flight; if refresh fails the socket is disconnected to stop reconnection storms.
 */
async function recoverAuth(instance: RealtimeSocket): Promise<void> {
  if (refreshing || instance.connected) {
    return;
  }
  refreshing = true;
  try {
    const token = await refreshAccessToken();
    instance.auth = { token };
    instance.connect();
  } catch {
    instance.disconnect();
  } finally {
    refreshing = false;
  }
}

/**
 * Lazily creates the shared Socket.IO connection. The current access token is sent
 * in the handshake; later rotations are kept in sync through the token store, and
 * an expired token is recovered via a single-flight refresh on `connect_error`.
 */
export function getSocket(): RealtimeSocket {
  if (socket) {
    return socket;
  }

  const instance = io(normalizeSocketUrl(env.VITE_WS_URL), {
    autoConnect: false,
    withCredentials: true,
    auth: { token: getAccessToken() },
  });

  instance.on('connect_error', () => {
    void recoverAuth(instance);
  });

  unsubscribeToken = subscribeAccessToken((token) => {
    instance.auth = { token };
  });

  socket = instance;
  instance.connect();
  return instance;
}

/** Tears the shared connection down (used on logout/session loss). */
export function resetSocket(): void {
  unsubscribeToken?.();
  unsubscribeToken = null;
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
