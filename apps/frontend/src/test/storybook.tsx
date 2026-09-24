import { DragDropContext } from '@hello-pangea/dnd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Decorator } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';

function createClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
}

/** Provides a per-story react-query client so connected components can render. */
export const withQueryClient: Decorator = (Story) => (
  <QueryClientProvider client={createClient()}>
    <Story />
  </QueryClientProvider>
);

/** Router context for components that render links or read `useLocation`. */
export const withRouter: Decorator = (Story) => (
  <MemoryRouter>
    <Story />
  </MemoryRouter>
);

/** Drag-and-drop context required by `Droppable`/`Draggable` widgets. */
export const withDndContext: Decorator = (Story) => (
  <DragDropContext onDragEnd={() => undefined}>
    <Story />
  </DragDropContext>
);
