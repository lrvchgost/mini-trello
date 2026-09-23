export const cardQueryKeys = {
  all: ['cards'] as const,
  detail: (id: string) => ['cards', 'detail', id] as const,
};
