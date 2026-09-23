import { parseClientEnv, type ClientEnv } from '@min-trello/shared';

export const env: ClientEnv = parseClientEnv({
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_WS_URL: import.meta.env.VITE_WS_URL,
});
