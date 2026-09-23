import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from './ky-client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('createApiClient', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  let refresh: ReturnType<typeof vi.fn>;
  let onUnauthorized: ReturnType<typeof vi.fn>;
  let getClientId: ReturnType<typeof vi.fn>;

  function buildClient(token: string | null = null) {
    return createApiClient({
      prefix: 'http://localhost:3000/api',
      refresh: refresh as () => Promise<string>,
      getAccessToken: () => token,
      onUnauthorized: onUnauthorized as () => void,
      getClientId: getClientId as () => string,
      fetch: fetchMock as unknown as typeof fetch,
    });
  }

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>();
    refresh = vi.fn();
    onUnauthorized = vi.fn();
    getClientId = vi.fn(() => 'tab-1');
  });

  it('refreshes the token on 401 and retries the request once', async () => {
    refresh.mockResolvedValue('new-token');
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: 'UNAUTHORIZED' }, 401))
      .mockResolvedValueOnce(jsonResponse({ id: 'user-1' }, 200));

    const data = await buildClient(null).get('auth/me').json<{ id: string }>();

    expect(data).toEqual({ id: 'user-1' });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const retryRequest = fetchMock.mock.calls[1]?.[0] as Request;
    expect(retryRequest.headers.get('authorization')).toBe('Bearer new-token');
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('drops the session when refresh fails', async () => {
    refresh.mockRejectedValue(new Error('no session'));
    fetchMock.mockResolvedValue(jsonResponse({ error: 'UNAUTHORIZED' }, 401));

    await expect(buildClient(null).get('auth/me').json()).rejects.toThrow();

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('sends the access token and X-Client-Id on mutating requests', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'board-1' }, 201));

    await buildClient('access-token').post('boards', { json: { title: 'Backlog' } });

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.headers.get('authorization')).toBe('Bearer access-token');
    expect(request.headers.get('x-client-id')).toBe('tab-1');
  });

  it('does not send X-Client-Id on safe requests', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await buildClient('access-token').get('boards');

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.headers.get('authorization')).toBe('Bearer access-token');
    expect(request.headers.has('x-client-id')).toBe(false);
    expect(getClientId).not.toHaveBeenCalled();
  });
});
