import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { boardQueryKeys } from '@/entities/board';
import { createQueryWrapper, createTestQueryClient } from '@/test/query-wrapper';
import { fetchCard } from './api';
import { useCardQuery, useUpdateCard } from './hooks';
import { cardQueryKeys } from './query-keys';

const mocks = vi.hoisted(() => ({
  api: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/shared/api/ky-client', () => ({ api: mocks.api }));

const boardId = 'clx000000000000000000001';
const cardId = 'clx000000000000000000101';

const cardDetailJson = {
  id: cardId,
  title: 'Карточка',
  description: '**Описание**',
  priority: 'high',
  deadline: null,
  order: 0,
  columnId: 'clx000000000000000000201',
  assigneeId: 'clx000000000000000000002',
  assignee: {
    id: 'clx000000000000000000002',
    email: 'alice@example.com',
    name: 'Alice',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  labels: [{ id: 'clx000000000000000000401', name: 'bug', color: '#ff0000', boardId }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

function mockJson<T>(value: T) {
  return { json: vi.fn().mockResolvedValue(value) };
}

describe('card entity', () => {
  beforeEach(() => {
    mocks.api.get.mockReset();
    mocks.api.patch.mockReset();
    mocks.api.delete.mockReset();
  });

  it('fetches and parses a card detail with labels and assignee', async () => {
    mocks.api.get.mockReturnValue(mockJson(cardDetailJson));

    const card = await fetchCard(cardId);

    expect(mocks.api.get).toHaveBeenCalledWith(`cards/${cardId}`);
    expect(card.updatedAt).toBeInstanceOf(Date);
    expect(card.assignee?.name).toBe('Alice');
    expect(card.labels[0]?.name).toBe('bug');
  });

  it('loads a card through react-query', async () => {
    mocks.api.get.mockReturnValue(mockJson(cardDetailJson));

    const { result } = renderHook(() => useCardQuery(cardId), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.title).toBe('Карточка');
  });

  it('stays idle without an id', () => {
    const { result } = renderHook(() => useCardQuery(undefined), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mocks.api.get).not.toHaveBeenCalled();
  });

  it('invalidates the card and board after an update', async () => {
    mocks.api.patch.mockReturnValue(mockJson({ ...cardDetailJson, title: 'Обновлено' }));
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateCard(boardId), {
      wrapper: createQueryWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: cardId, input: { title: 'Обновлено' } });
    });

    expect(mocks.api.patch).toHaveBeenCalledWith(
      `cards/${cardId}`,
      expect.objectContaining({ json: { title: 'Обновлено' } }),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: cardQueryKeys.detail(cardId) });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: boardQueryKeys.detail(boardId) });
  });
});
