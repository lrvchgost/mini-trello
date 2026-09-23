import type { DashboardStats, IDashboardRepository } from './repositories/dashboard.repository';
import { DashboardService } from './dashboard.service';

const stats: DashboardStats = {
  totalBoards: 2,
  totalCards: 3,
  cardsByStatus: [{ columnId: 'col-1', columnTitle: 'To Do', count: 3 }],
  overdueCards: 1,
};

describe('DashboardService', () => {
  it('delegates stats to the repository scoped by owner', async () => {
    const repo: jest.Mocked<IDashboardRepository> = {
      getStats: jest.fn().mockResolvedValue(stats),
    };
    const service = new DashboardService(repo);

    await expect(service.getStats('user-1')).resolves.toBe(stats);
    expect(repo.getStats).toHaveBeenCalledWith('user-1');
  });
});
