import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { Loading } from './loading';

interface LocationState {
  from?: string;
}

/**
 * Keeps authenticated users out of the public auth screens (`/login`, `/register`)
 * and sends them back to the page they originally requested.
 */
export function PublicOnlyRoute() {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();

  if (status === 'idle' || status === 'loading') {
    return <Loading />;
  }

  if (status === 'authenticated') {
    const from = (location.state as LocationState | null)?.from ?? '/dashboard';
    return <Navigate to={from} replace />;
  }

  return <Outlet />;
}
