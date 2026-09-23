import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryWrapper, createTestQueryClient } from '@/test/query-wrapper';
import { fetchBoard } from './api';
import { useBoardQuery } from './hooks';

const mocks = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('@/shared/api/ky-client', () => ({ api: mocks.api }));

const boardJson = {
  id: 'clx000000000000000000001',
  title: 'Работа',
  ownerId: 'clx000000000000000000002',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  columns: [
    {
      id: 'clx000000000000000000201',
      title: 'В работе',
      isDone: false,
      order: 0,
      boardId: 'clx000000000000000000001',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      cards: [
        {
          id: 'clx000000000000000000101',
          title: 'Карточка',
          description: null,
          priority: 'medium',
          deadline: null,
          order: 0,
          columnId: 'clx000000000000000000201',
          assigneeId: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    },
  ],
};

function mockJson<T>(value: T) {
  return { json: vi.fn().mockResolvedValue(value) };
}

describe('board entity', () => {
  beforeEach(() => {
    mocks.api.get.mockReset();
    mocks.api.post.mockReset();
  });

  it('fetches and parses a board with columns and cards', async () => {
    mocks.api.get.mockReturnValue(mockJson(boardJson));

    const board = await fetchBoard(boardJson.id);

    expect(mocks.api.get).toHaveBeenCalledWith(`boards/${boardJson.id}`);
    expect(board.createdAt).toBeInstanceOf(Date);
    expect(board.columns).toHaveLength(1);
    expect(board.columns[0]?.cards[0]?.title).toBe('Карточка');
  });

  it('loads a board through react-query', async () => {
    mocks.api.get.mockReturnValue(mockJson(boardJson));

    const { result } = renderHook(() => useBoardQuery(boardJson.id), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.columns[0]?.title).toBe('В работе');
  });

  it('stays idle without an id', () => {
    const { result } = renderHook(() => useBoardQuery(undefined), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mocks.api.get).not.toHaveBeenCalled();
  });
});
