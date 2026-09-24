import { beforeEach, describe, expect, it } from 'vitest';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/shared/api/token-store';
import { db } from '@/test/msw/data';
import { initialAuthState, useAuthStore } from './store';

describe('useAuthStore over MSW', () => {
  beforeEach(() => {
    clearAccessToken();
    useAuthStore.setState(initialAuthState);
  });

  it('logs in against the mocked auth endpoint', async () => {
    await useAuthStore
      .getState()
      .login({ email: db.credentials.email, password: db.credentials.password });

    expect(getAccessToken()).toBe(db.accessToken);
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().user?.email).toBe(db.credentials.email);
  });

  it('rejects invalid credentials and stays unauthenticated', async () => {
    await expect(
      useAuthStore.getState().login({ email: db.credentials.email, password: 'wrong-password' }),
    ).rejects.toThrow();

    expect(getAccessToken()).toBeNull();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('registers and hydrates the user through the authenticated /auth/me', async () => {
    await useAuthStore
      .getState()
      .register({ name: 'Bob', email: 'bob@example.com', password: 'password123' });

    expect(getAccessToken()).toBe(db.accessToken);
    expect(useAuthStore.getState().user?.name).toBe('Bob');
    expect(useAuthStore.getState().user?.email).toBe('bob@example.com');
  });

  it('updates the profile through PATCH /users/me', async () => {
    setAccessToken(db.accessToken);
    useAuthStore.setState({ user: db.currentUser, status: 'authenticated' });

    const updated = await useAuthStore.getState().updateProfile({ name: 'Alicia' });

    expect(updated.name).toBe('Alicia');
    expect(useAuthStore.getState().user?.name).toBe('Alicia');
  });

  it('logs out and drops the session', async () => {
    useAuthStore.setState({ user: db.currentUser, status: 'authenticated' });
    clearAccessToken();

    await useAuthStore.getState().logout();

    expect(getAccessToken()).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });
});
