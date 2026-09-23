import ky, { type KyInstance, type Options as KyOptions } from 'ky';
import { env } from '../config/env';
import { getClientId } from './client-id';
import { refreshAccessToken } from './refresh';
import { getAccessToken } from './token-store';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface ApiClientDeps {
  prefix: string;
  refresh: () => Promise<string>;
  getAccessToken: () => string | null;
  onUnauthorized: () => void;
  getClientId: () => string;
  fetch?: KyOptions['fetch'];
}

let unauthorizedHandler: () => void = () => undefined;

/** Registered by the auth store to drop the local session when refresh fails. */
export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

const defaultDeps: ApiClientDeps = {
  prefix: env.VITE_API_URL,
  refresh: refreshAccessToken,
  getAccessToken,
  onUnauthorized: () => unauthorizedHandler(),
  getClientId,
};

/**
 * Authenticated ky client:
 * - access token is read from memory and sent as `Authorization: Bearer`;
 * - mutating requests carry `X-Client-Id` (for websocket dedup between tabs);
 * - a 401 triggers a single-flight refresh and one retry of the original request;
 * - when refresh fails the local session is dropped via `onUnauthorized`.
 */
export function createApiClient(overrides: Partial<ApiClientDeps> = {}): KyInstance {
  const deps: ApiClientDeps = { ...defaultDeps, ...overrides };

  return ky.create({
    prefix: deps.prefix,
    credentials: 'include',
    retry: { limit: 1, delay: () => 0 },
    fetch: deps.fetch,
    hooks: {
      beforeRequest: [
        ({ request }) => {
          const token = deps.getAccessToken();
          if (token) {
            request.headers.set('Authorization', `Bearer ${token}`);
          }
          if (MUTATING_METHODS.has(request.method.toUpperCase())) {
            request.headers.set('X-Client-Id', deps.getClientId());
          }
        },
      ],
      afterResponse: [
        async ({ request, response, retryCount }) => {
          if (response.status !== 401) {
            return;
          }
          if (retryCount > 0) {
            deps.onUnauthorized();
            return;
          }
          try {
            const token = await deps.refresh();
            const headers = new Headers(request.headers);
            headers.set('Authorization', `Bearer ${token}`);
            return ky.retry({
              request: new Request(request, { headers }),
              code: 'TOKEN_REFRESHED',
            });
          } catch {
            deps.onUnauthorized();
            return;
          }
        },
      ],
    },
  });
}

export const api = createApiClient();
