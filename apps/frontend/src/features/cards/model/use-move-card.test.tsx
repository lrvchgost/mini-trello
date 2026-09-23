import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BoardWithColumns } from '@min-trello/shared';
import { boardQueryKeys } from '@/entities/board';
import { cardQueryKeys } from '@/entities/card';
import { createQueryWrapper, createTestQueryClient } from '@/test/query-wrapper';
import { makeBoard, makeCard, makeColumn } from '@/test/fixtures';
import { useMoveCard } from './use-move-card';

const mocks = vi.hoisted(() => ({
  api: { patch: vi.fn() },
}));

vi.mock('@/shared/api/ky-client', () => ({ api: mocks.api }));

const boardId = 'clx000000000000000000001';
const colA = 'clx000000000000000000201';
const colB = 'clx000000000000000000202';

function boardFixture(): BoardWithColumns {
  return makeBoard({
    id: boardId,
    columns: [
      makeColumn({
        id: colA,
        order: 0,
        cards: [
          makeCard({ id: 'card1', columnId: colA, order: 0 }),
          makeCard({ id: 'card2', columnId: colA, order: 1 }),
        ],
      }),
      makeColumn({ id: colB, order: 1, cards: [] }),
    ],
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryDefaults(boardQueryKeys.all, { gcTime: Infinity });
  queryClient.setQueryData(boardQueryKeys.detail(boardId), boardFixture());
  return { queryClient, wrapper: createQueryWrapper(queryClient) };
}

describe('useMoveCard', () => {
  beforeEach(() => {
    mocks.api.patch.mockReset();
  });

  it('optimistically applies the move and invalidates on success', async () => {
    mocks.api.patch.mockReturnValue({
      json: vi.fn().mockResolvedValue({ columnId: colB, order: 0 }),
    });
    const { queryClient, wrapper } = setup();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useMoveCard(boardId), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 'card1', input: { columnId: colB, order: 0 } });
    });

    expect(mocks.api.patch).toHaveBeenCalledWith('cards/card1/move', {
      json: { columnId: colB, order: 0 },
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: boardQueryKeys.detail(boardId) });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: cardQueryKeys.detail('card1') });
  });

  it('applies the optimistic move while the request is in flight', async () => {
    const pending = deferred<{ columnId: string; order: number }>();
    mocks.api.patch.mockReturnValue({ json: () => pending.promise });
    const { queryClient, wrapper } = setup();

    const { result } = renderHook(() => useMoveCard(boardId), { wrapper });

    await act(async () => {
      result.current.mutate({ id: 'card1', input: { columnId: colB, order: 0 } });
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<BoardWithColumns>(boardQueryKeys.detail(boardId));
      expect(cached?.columns.find((column) => column.id === colB)?.cards[0]?.id).toBe('card1');
    });

    await act(async () => {
      pending.resolve({ columnId: colB, order: 0 });
      await pending.promise.catch(() => undefined);
    });
  });

  it('rolls back the optimistic move when the request fails', async () => {
    const pending = deferred<{ columnId: string; order: number }>();
    mocks.api.patch.mockReturnValue({ json: () => pending.promise });
    const { queryClient, wrapper } = setup();

    const { result } = renderHook(() => useMoveCard(boardId), { wrapper });

    await act(async () => {
      result.current.mutate({ id: 'card1', input: { columnId: colB, order: 0 } });
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<BoardWithColumns>(boardQueryKeys.detail(boardId));
      expect(cached?.columns.find((column) => column.id === colB)?.cards).toHaveLength(1);
    });

    await act(async () => {
      pending.reject(new Error('network down'));
      await pending.promise.catch(() => undefined);
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<BoardWithColumns>(boardQueryKeys.detail(boardId));
      expect(cached).toEqual(boardFixture());
    });
  });
});
