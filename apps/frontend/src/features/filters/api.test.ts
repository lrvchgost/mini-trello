import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchBoardCards, searchGlobalCards, toSearchParams } from './api';

const mocks = vi.hoisted(() => ({
  api: { get: vi.fn() },
}));

vi.mock('@/shared/api/ky-client', () => ({ api: mocks.api }));

const cardJson = {
  id: 'clx000000000000000000101',
  title: 'Fix login',
  description: null,
  priority: 'high',
  deadline: null,
  order: 0,
  columnId: 'clx000000000000000000201',
  assigneeId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function mockJson<T>(value: T) {
  return { json: vi.fn().mockResolvedValue(value) };
}

describe('filters api', () => {
  beforeEach(() => {
    mocks.api.get.mockReset();
  });

  it('serializes only present params', () => {
    expect(toSearchParams({ page: 1, limit: 20 })).toEqual({ page: '1', limit: '20' });
    expect(
      toSearchParams({ page: 2, limit: 10, q: 'fix', priority: 'high', hasDeadline: false }),
    ).toEqual({ page: '2', limit: '10', q: 'fix', priority: 'high', hasDeadline: 'false' });
  });

  it('searches within a board and parses the page', async () => {
    mocks.api.get.mockReturnValue(mockJson({ items: [cardJson], total: 1, page: 1, limit: 20 }));

    const result = await searchBoardCards('clx000000000000000000001', {
      page: 1,
      limit: 20,
      q: 'fix',
    });

    expect(mocks.api.get).toHaveBeenCalledWith('boards/clx000000000000000000001/search', {
      searchParams: { page: '1', limit: '20', q: 'fix' },
    });
    expect(result.items[0]?.priority).toBe('high');
  });

  it('searches globally', async () => {
    mocks.api.get.mockReturnValue(mockJson({ items: [], total: 0, page: 1, limit: 20 }));

    await searchGlobalCards({ page: 1, limit: 20 });

    expect(mocks.api.get).toHaveBeenCalledWith('search', {
      searchParams: { page: '1', limit: '20' },
    });
  });
});
