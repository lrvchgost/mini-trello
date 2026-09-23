import type { SearchQuery } from '@min-trello/shared';

export const searchQueryKeys = {
  all: ['search'] as const,
  board: (boardId: string, query: SearchQuery) => ['search', 'board', boardId, query] as const,
  global: (query: SearchQuery) => ['search', 'global', query] as const,
};
