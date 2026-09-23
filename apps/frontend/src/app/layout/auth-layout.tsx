import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">min-trello</h1>
          <p className="text-sm text-muted-foreground">Канбан для небольших команд</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
