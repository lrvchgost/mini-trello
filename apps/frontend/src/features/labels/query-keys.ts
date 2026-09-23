export const labelQueryKeys = {
  all: ['labels'] as const,
  list: (boardId: string) => ['labels', 'list', boardId] as const,
};
