export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  stats: () => ['dashboard', 'stats'] as const,
};
