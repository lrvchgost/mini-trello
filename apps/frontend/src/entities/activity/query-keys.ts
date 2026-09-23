export type ActivityListParams = {
  page: number;
  limit: number;
};

export const activityQueryKeys = {
  all: ['activity'] as const,
  board: (boardId: string) => ['activity', boardId] as const,
  list: (boardId: string, params: ActivityListParams) => ['activity', boardId, params] as const,
};
