import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@min-trello/shared';

const mocks = vi.hoisted(() => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
  refreshAccessToken: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
}));

vi.mock('@/shared/api/ky-client', () => ({
  api: mocks.api,
  setUnauthorizedHandler: mocks.setUnauthorizedHandler,
}));

vi.mock('@/shared/api/refresh', () => ({
  refreshAccessToken: mocks.refreshAccessToken,
}));

import { clearAccessToken, getAccessToken, setAccessToken } from '@/shared/api/token-store';
import { initialAuthState, useAuthStore } from './store';

const user: User = {
  id: 'user-1',
  email: 'alice@example.com',
  name: 'Alice',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

function mockJson<T>(value: T) {
  return { json: vi.fn().mockResolvedValue(value) };
}

describe('useAuthStore', () => {
  beforeEach(() => {
    mocks.api.get.mockReset();
    mocks.api.post.mockReset();
    mocks.refreshAccessToken.mockReset();
    clearAccessToken();
    useAuthStore.setState(initialAuthState);
  });

  it('login stores the session and access token', async () => {
    mocks.api.post.mockReturnValue(mockJson({ user, accessToken: 'access-1' }));

    await useAuthStore.getState().login({ email: user.email, password: 'password123' });

    expect(mocks.api.post).toHaveBeenCalledWith('auth/login', {
      json: { email: user.email, password: 'password123' },
    });
    expect(getAccessToken()).toBe('access-1');
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().user?.id).toBe('user-1');
  });

  it('login exposes an error and stays unauthenticated on failure', async () => {
    mocks.api.post.mockReturnValue({
      json: vi.fn().mockRejectedValue(new Error('Invalid credentials')),
    });

    await expect(
      useAuthStore.getState().login({ email: user.email, password: 'wrong' }),
    ).rejects.toThrow('Invalid credentials');

    expect(getAccessToken()).toBeNull();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(useAuthStore.getState().error).toBe('Invalid credentials');
  });

  it('logout revokes the session and clears local state', async () => {
    setAccessToken('access-1');
    useAuthStore.setState({ user, status: 'authenticated' });
    mocks.api.post.mockResolvedValue(undefined);

    await useAuthStore.getState().logout();

    expect(mocks.api.post).toHaveBeenCalledWith('auth/logout');
    expect(getAccessToken()).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('bootstrap restores the session via refresh + /auth/me', async () => {
    mocks.refreshAccessToken.mockResolvedValue('fresh-token');
    mocks.api.get.mockReturnValue(mockJson(user));

    await useAuthStore.getState().bootstrap();

    expect(mocks.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(mocks.api.get).toHaveBeenCalledWith('auth/me');
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().user?.id).toBe('user-1');
  });

  it('bootstrap ends unauthenticated when there is no session', async () => {
    mocks.refreshAccessToken.mockRejectedValue(new Error('no cookie'));

    await useAuthStore.getState().bootstrap();

    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(useAuthStore.getState().user).toBeNull();
    expect(mocks.api.get).not.toHaveBeenCalled();
  });
});
