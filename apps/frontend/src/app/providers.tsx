import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifyManager } from '@tanstack/query-core';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './theme-provider';

// Default react-query scheduling defers observer notifications to setTimeout(0),
// which lands the optimistic drag&drop reorder *after* the browser has painted
// the stale order (the destination column flashes "Нет карточек"). A microtask
// flushes the update before paint, keeping drag&drop flicker-free.
notifyManager.setScheduler(queueMicrotask);

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
