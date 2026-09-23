import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryWrapper, createTestQueryClient } from '@/test/query-wrapper';
import { useBoardsQuery, useCreateBoard } from './hooks';

const mocks = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('@/shared/api/ky-client', () => ({ api: mocks.api }));

const board = {
  id: 'clx000000000000000000001',
  title: 'Работа',
  ownerId: 'clx000000000000000000002',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function mockJson<T>(value: T) {
  return { json: vi.fn().mockResolvedValue(value) };
}

describe('boards hooks', () => {
  beforeEach(() => {
    mocks.api.get.mockReset();
    mocks.api.post.mockReset();
  });

  it('queries the requested page and parses the paginated response', async () => {
    mocks.api.get.mockReturnValue(
      mockJson({ items: [{ ...board, cardsCount: 7 }], total: 42, page: 2, limit: 10 }),
    );

    const { result } = renderHook(() => useBoardsQuery({ page: 2, limit: 10 }), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mocks.api.get).toHaveBeenCalledWith('boards', {
      searchParams: { page: 2, limit: 10 },
    });
    expect(result.current.data?.total).toBe(42);
    expect(result.current.data?.items[0]?.id).toBe(board.id);
    expect(result.current.data?.items[0]?.createdAt).toBeInstanceOf(Date);
    expect(result.current.data?.items[0]?.cardsCount).toBe(7);
  });

  it('creates a board and invalidates the board list', async () => {
    mocks.api.post.mockReturnValue(mockJson(board));

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateBoard(), {
      wrapper: createQueryWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ title: 'Работа' });
    });

    expect(mocks.api.post).toHaveBeenCalledWith('boards', { json: { title: 'Работа' } });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['boards'] });
  });
});
