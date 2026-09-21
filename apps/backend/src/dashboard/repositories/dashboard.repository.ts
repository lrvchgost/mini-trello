export const DASHBOARD_REPOSITORY_TOKEN = 'DASHBOARD_REPOSITORY';

export interface CardsByStatus {
  columnId: string;
  columnTitle: string;
  count: number;
}

export interface DashboardStats {
  totalBoards: number;
  totalCards: number;
  cardsByStatus: CardsByStatus[];
  overdueCards: number;
}

export interface IDashboardRepository {
  getStats(ownerId: string): Promise<DashboardStats>;
}
