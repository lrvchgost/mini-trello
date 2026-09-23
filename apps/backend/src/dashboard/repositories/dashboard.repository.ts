import type { DashboardStats } from '@min-trello/shared';

export const DASHBOARD_REPOSITORY_TOKEN = 'DASHBOARD_REPOSITORY';

export type { DashboardStats } from '@min-trello/shared';

export interface IDashboardRepository {
  getStats(ownerId: string): Promise<DashboardStats>;
}
