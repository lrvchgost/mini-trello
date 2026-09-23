import { create } from 'zustand';
import type { AuthResponse, LoginInput, RegisterInput, User } from '@min-trello/shared';
import { api, setUnauthorizedHandler } from '@/shared/api/ky-client';
import { refreshAccessToken } from '@/shared/api/refresh';
import { clearAccessToken, setAccessToken } from '@/shared/api/token-store';
import { resetSocket } from '@/shared/realtime/socket';
import { extractErrorMessage } from '@/shared/lib/errors';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  user: User | null;
  status: AuthStatus;
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
  forgetSession: () => void;
}

export const initialAuthState = {
  user: null,
  status: 'idle' as AuthStatus,
  error: null,
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initialAuthState,

  login: async (input) => {
    set({ status: 'loading', error: null });
    try {
      const session = await api.post('auth/login', { json: input }).json<AuthResponse>();
      setAccessToken(session.accessToken);
      set({ user: session.user, status: 'authenticated', error: null });
    } catch (error) {
      clearAccessToken();
      set({ user: null, status: 'unauthenticated', error: extractErrorMessage(error) });
      throw error;
    }
  },

  register: async (input) => {
    set({ status: 'loading', error: null });
    try {
      const session = await api.post('auth/register', { json: input }).json<AuthResponse>();
      setAccessToken(session.accessToken);
      // register already set the refresh cookie, so the session can be hydrated from the server.
      const user = await api.get('auth/me').json<User>();
      set({ user, status: 'authenticated', error: null });
    } catch (error) {
      clearAccessToken();
      set({ user: null, status: 'unauthenticated', error: extractErrorMessage(error) });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('auth/logout');
    } catch {
      // The refresh cookie is httpOnly; the server clears it. Local state is dropped either way.
    }
    clearAccessToken();
    resetSocket();
    set({ user: null, status: 'unauthenticated', error: null });
  },

  bootstrap: async () => {
    set({ status: 'loading', error: null });
    try {
      await refreshAccessToken();
      const user = await api.get('auth/me').json<User>();
      set({ user, status: 'authenticated', error: null });
    } catch {
      clearAccessToken();
      set({ user: null, status: 'unauthenticated', error: null });
    }
  },

  forgetSession: () => {
    clearAccessToken();
    resetSocket();
    set({ user: null, status: 'unauthenticated' });
  },
}));

setUnauthorizedHandler(() => {
  useAuthStore.getState().forgetSession();
});
