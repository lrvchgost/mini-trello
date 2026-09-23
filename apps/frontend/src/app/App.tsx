import { useAuthBootstrap } from '@/features/auth/useAuth';
import { ErrorBoundary } from '@/shared/ui/error-boundary';
import { AppRoutes } from './routes';

export function App() {
  useAuthBootstrap();
  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  );
}
