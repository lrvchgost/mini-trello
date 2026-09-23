import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { boardQueryKeys } from '@/entities/board';
import { createQueryWrapper, createTestQueryClient } from '@/test/query-wrapper';
import { useBoardLive } from './use-board-live';

type Listener = (payload: unknown) => void;

function createFakeSocket(connected = true) {
  const listeners = new Map<string, Set<Listener>>();
  return {
    connected,
    emitted: [] as Array<[string, unknown]>,
    on(event: string, handler: Listener) {
      const set = listeners.get(event) ?? new Set<Listener>();
      set.add(handler);
      listeners.set(event, set);
      return this;
    },
    off(event: string, handler: Listener) {
      listeners.get(event)?.delete(handler);
      return this;
    },
    emit(event: string, payload: unknown) {
      this.emitted.push([event, payload]);
      return this;
    },
    fire(event: string, payload: unknown) {
      listeners.get(event)?.forEach((handler) => handler(payload));
    },
  };
}

const mocks = vi.hoisted(() => ({
  getSocket: vi.fn(),
  getClientId: vi.fn(() => 'tab-1'),
}));

vi.mock('@/shared/realtime', () => ({ getSocket: mocks.getSocket }));
vi.mock('@/shared/api/client-id', () => ({ getClientId: mocks.getClientId }));

const boardId = 'clx000000000000000000001';

describe('useBoardLive', () => {
  beforeEach(() => {
    mocks.getSocket.mockReset();
    mocks.getClientId.mockReturnValue('tab-1');
  });

  it('joins the board room and leaves it on unmount', () => {
    const socket = createFakeSocket();
    mocks.getSocket.mockReturnValue(socket);
    const { unmount } = renderHook(() => useBoardLive(boardId), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    expect(socket.emitted).toContainEqual(['joinBoard', { boardId, clientId: 'tab-1' }]);

    unmount();
    expect(socket.emitted).toContainEqual(['leaveBoard', { boardId }]);
  });

  it('re-joins the room after a reconnect', () => {
    const socket = createFakeSocket(false);
    mocks.getSocket.mockReturnValue(socket);

    renderHook(() => useBoardLive(boardId), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    expect(socket.emitted).toHaveLength(0);

    socket.fire('connect', undefined);
    expect(socket.emitted).toContainEqual(['joinBoard', { boardId, clientId: 'tab-1' }]);
  });

  it('invalidates caches for other tabs but ignores its own events', () => {
    const socket = createFakeSocket();
    mocks.getSocket.mockReturnValue(socket);
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useBoardLive(boardId), {
      wrapper: createQueryWrapper(queryClient),
    });

    socket.fire('card.moved', { cardId: 'card-1', clientId: 'tab-2' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: boardQueryKeys.detail(boardId) });

    invalidate.mockClear();
    socket.fire('card.moved', { cardId: 'card-1', clientId: 'tab-1' });
    expect(invalidate).not.toHaveBeenCalled();
  });
});
