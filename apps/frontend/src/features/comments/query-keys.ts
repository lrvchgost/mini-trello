export const commentQueryKeys = {
  all: ['comments'] as const,
  list: (cardId: string) => ['comments', 'list', cardId] as const,
};
