import { describe, expect, it, vi } from 'vitest';
import { boardQueryKeys } from '@/entities/board';
import { cardQueryKeys } from '@/entities/card';
import { commentQueryKeys } from '@/features/comments';
import { dashboardQueryKeys } from '@/shared/api/query-keys';
import { createTestQueryClient } from '@/test/query-wrapper';
import { invalidateForRealtimeEvent, isOwnEvent, REALTIME_EVENTS } from './events';

describe('isOwnEvent', () => {
  it('flags events emitted by the same tab', () => {
    expect(isOwnEvent({ clientId: 'tab-1' }, 'tab-1')).toBe(true);
  });

  it('keeps events from other tabs/users', () => {
    expect(isOwnEvent({ clientId: 'tab-2' }, 'tab-1')).toBe(false);
    expect(isOwnEvent({ clientId: null }, 'tab-1')).toBe(false);
    expect(isOwnEvent(undefined, 'tab-1')).toBe(false);
  });
});

describe('invalidateForRealtimeEvent', () => {
  it('covers every documented server event', () => {
    expect(REALTIME_EVENTS).toEqual([
      'board.updated',
      'column.created',
      'column.updated',
      'column.deleted',
      'card.created',
      'card.updated',
      'card.moved',
      'card.deleted',
      'comment.created',
    ]);
  });

  it('invalidates the board and the moved card', () => {
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    invalidateForRealtimeEvent(queryClient, 'board-1', 'card.moved', {
      cardId: 'card-1',
      clientId: 'tab-2',
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: boardQueryKeys.detail('board-1') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: cardQueryKeys.detail('card-1') });
  });

  it('invalidates board lists and dashboard stats on board.updated', () => {
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    invalidateForRealtimeEvent(queryClient, 'board-1', 'board.updated', { clientId: 'tab-2' });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: boardQueryKeys.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: dashboardQueryKeys.all });
  });

  it('invalidates the card comments on comment.created', () => {
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    invalidateForRealtimeEvent(queryClient, 'board-1', 'comment.created', {
      comment: { cardId: 'card-9' },
      clientId: 'tab-2',
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: cardQueryKeys.detail('card-9') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: commentQueryKeys.list('card-9') });
  });
});
