export type AccessToken = string | null;

let accessToken: AccessToken = null;
const listeners = new Set<(token: AccessToken) => void>();

export function getAccessToken(): AccessToken {
  return accessToken;
}

export function setAccessToken(token: AccessToken): void {
  accessToken = token;
  for (const listener of listeners) {
    listener(token);
  }
}

export function clearAccessToken(): void {
  setAccessToken(null);
}

export function subscribeAccessToken(listener: (token: AccessToken) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
