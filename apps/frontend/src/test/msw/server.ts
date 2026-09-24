import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** Shared MSW server wired into every Vitest run via `src/test/setup.ts`. */
export const server = setupServer(...handlers);
