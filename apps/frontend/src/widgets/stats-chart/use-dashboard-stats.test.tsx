import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryWrapper, createTestQueryClient } from '@/test/query-wrapper';
import { dashboardStatsQueryKey, useDashboardStats } from './use-dashboard-stats';

const mocks = vi.hoisted(() => ({
  api: { get: vi.fn() },
}));

vi.mock('@/shared/api/ky-client', () => ({ api: mocks.api }));

const stats = {
  totalBoards: 3,
  totalCards: 60,
  cardsByStatus: [
    { columnId: 'clx000000000000000000010', columnTitle: 'To Do', count: 5 },
    { columnId: 'clx000000000000000000011', columnTitle: 'Done', count: 3 },
  ],
  overdueCards: 2,
};

function mockJson<T>(value: T) {
  return { json: vi.fn().mockResolvedValue(value) };
}

describe('useDashboardStats', () => {
  beforeEach(() => {
    mocks.api.get.mockReset();
  });

  it('fetches and validates the dashboard stats', async () => {
    mocks.api.get.mockReturnValue(mockJson(stats));

    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mocks.api.get).toHaveBeenCalledWith('dashboard/stats');
    expect(result.current.data).toEqual(stats);
    expect(dashboardStatsQueryKey).toEqual(['dashboard', 'stats']);
  });

  it('rejects a malformed payload', async () => {
    mocks.api.get.mockReturnValue(mockJson({ totalBoards: 'many' }));

    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
