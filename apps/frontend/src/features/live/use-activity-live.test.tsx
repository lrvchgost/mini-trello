import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityLog, Paginated } from '@min-trello/shared';
import { activityQueryKeys } from '@/entities/activity';
import { createQueryWrapper, createTestQueryClient } from '@/test/query-wrapper';
import { useActivityLive } from './use-activity-live';
import type { ActivityStreamHandlers } from '@/shared/realtime';

const mocks = vi.hoisted(() => ({
  openActivityStream: vi.fn(),
}));

vi.mock('@/shared/realtime', () => ({ openActivityStream: mocks.openActivityStream }));

const boardId = 'clx000000000000000000001';
const params = { page: 1, limit: 20 };

function makeActivity(overrides: Partial<ActivityLog> = {}): ActivityLog {
  return {
    id: 'clx000000000000000000777',
    action: 'card.created',
    payload: { cardId: 'clx000000000000000000101', title: 'Карточка' },
    boardId,
    cardId: 'clx000000000000000000101',
    userId: 'clx000000000000000000002',
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
    ...overrides,
  };
}

describe('useActivityLive', () => {
  let handlers: ActivityStreamHandlers;
  let close: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mocks.openActivityStream.mockReset();
    close = vi.fn();
    mocks.openActivityStream.mockImplementation(
      (_boardId: string, streamHandlers: ActivityStreamHandlers) => {
        handlers = streamHandlers;
        return close;
      },
    );
  });

  it('appends streamed activity to the first page without duplicates', () => {
    const queryClient = createTestQueryClient();
    const first = makeActivity({ id: 'clx000000000000000000701' });
    queryClient.setQueryData<Paginated<ActivityLog>>(activityQueryKeys.list(boardId, params), {
      items: [first],
      total: 1,
      page: 1,
      limit: 20,
    });

    renderHook(() => useActivityLive(boardId), {
      wrapper: createQueryWrapper(queryClient),
    });

    expect(mocks.openActivityStream).toHaveBeenCalledWith(boardId, expect.any(Object));

    const next = makeActivity({ id: 'clx000000000000000000702' });
    act(() => {
      handlers.onActivity(next);
      handlers.onActivity(next);
    });

    const cached = queryClient.getQueryData<Paginated<ActivityLog>>(
      activityQueryKeys.list(boardId, params),
    );
    expect(cached?.items.map((item) => item.id)).toEqual([
      'clx000000000000000000702',
      'clx000000000000000000701',
    ]);
    expect(cached?.total).toBe(2);
  });

  it('tracks the stream status and closes on unmount', () => {
    const queryClient = createTestQueryClient();
    const { result, unmount } = renderHook(() => useActivityLive(boardId), {
      wrapper: createQueryWrapper(queryClient),
    });

    expect(result.current).toBe('connecting');

    act(() => handlers.onOpen?.());
    expect(result.current).toBe('open');

    act(() => handlers.onAuthError?.());
    expect(result.current).toBe('error');

    unmount();
    expect(close).toHaveBeenCalled();
  });
});
