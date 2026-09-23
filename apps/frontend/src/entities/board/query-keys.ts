import type { BoardListParams } from './api';

export const boardQueryKeys = {
  all: ['boards'] as const,
  list: (params: BoardListParams) => ['boards', 'list', params] as const,
  detail: (id: string) => ['boards', 'detail', id] as const,
};
