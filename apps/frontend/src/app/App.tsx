import { useAuthBootstrap } from '@/features/auth/useAuth';
import { AppRoutes } from './routes';

export function App() {
  useAuthBootstrap();
  return <AppRoutes />;
}
