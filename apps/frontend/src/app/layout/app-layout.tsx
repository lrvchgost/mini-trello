import { Outlet, useMatch } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import { Header } from './header';

export function AppLayout() {
  const isBoard = useMatch('/boards/:id/*');

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main
        className={cn(
          'flex-1 px-4 py-6 sm:px-6 lg:px-8',
          isBoard ? 'w-full' : 'mx-auto w-full max-w-7xl',
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}
