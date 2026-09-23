import { useQuery } from '@tanstack/react-query';
import { dashboardStatsSchema, type DashboardStats } from '@min-trello/shared';
import { api } from '@/shared/api/ky-client';

export const dashboardStatsQueryKey = ['dashboard', 'stats'] as const;

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const data = await api.get('dashboard/stats').json();
  return dashboardStatsSchema.parse(data);
}

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardStatsQueryKey,
    queryFn: fetchDashboardStats,
  });
}
