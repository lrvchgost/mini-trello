import ky from 'ky';
import { env } from '../config/env';
import { setAccessToken } from './token-store';

const REFRESH_PATH = 'auth/refresh';
const LOCK_NAME = 'min-trello:auth-refresh';
const CHANNEL_NAME = 'min-trello:auth';
const CROSS_TAB_GRACE_MS = 3000;

interface AccessTokenMessage {
  type: 'access-token';
  token: string;
}

/**
 * Refresh endpoint is called on the raw client (no auth interceptor) so a failed
 * refresh never recurses back into the interceptor.
 */
const refreshClient = ky.create({
  prefix: env.VITE_API_URL,
  credentials: 'include',
  retry: { limit: 0 },
});

let refreshPromise: Promise<string> | null = null;
let channel: BroadcastChannel | null = null;
let lastBroadcast: { token: string; at: number } | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') {
    return null;
  }
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener('message', (event: MessageEvent<AccessTokenMessage>) => {
      const data = event.data;
      if (data?.type === 'access-token' && typeof data.token === 'string') {
        lastBroadcast = { token: data.token, at: Date.now() };
        setAccessToken(data.token);
      }
    });
  }
  return channel;
}

async function requestRefresh(): Promise<string> {
  const { accessToken } = await refreshClient.post(REFRESH_PATH).json<{ accessToken: string }>();
  setAccessToken(accessToken);
  lastBroadcast = { token: accessToken, at: Date.now() };
  getChannel()?.postMessage({
    type: 'access-token',
    token: accessToken,
  } satisfies AccessTokenMessage);
  return accessToken;
}

async function runWithLock(task: () => Promise<string>): Promise<string> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  if (!locks) {
    return task();
  }
  return locks.request(LOCK_NAME, () => task());
}

/**
 * Single-flight refresh shared by every caller in the tab. Cross-tab the actual
 * network call is serialized through `navigator.locks`; other tabs receive the
 * fresh token via `BroadcastChannel` and skip a redundant (and race-prone) rotation.
 */
export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = runWithLock(async () => {
    if (lastBroadcast && Date.now() - lastBroadcast.at < CROSS_TAB_GRACE_MS) {
      setAccessToken(lastBroadcast.token);
      return lastBroadcast.token;
    }
    return requestRefresh();
  }).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}
