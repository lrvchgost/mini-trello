import { useEffect } from 'react';
import { useAuthStore } from './store';

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.error);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const logout = useAuthStore((state) => state.logout);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const changePassword = useAuthStore((state) => state.changePassword);

  return {
    user,
    status,
    error,
    login,
    register,
    logout,
    bootstrap,
    updateProfile,
    changePassword,
  };
}

/** Restores the session once on app start (`/auth/refresh` then `/auth/me`). */
export function useAuthBootstrap(): void {
  useEffect(() => {
    const { status, bootstrap } = useAuthStore.getState();
    if (status === 'idle') {
      void bootstrap();
    }
  }, []);
}
