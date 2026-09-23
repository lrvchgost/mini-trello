import type { QueryClient } from '@tanstack/react-query';
import { boardQueryKeys } from '@/entities/board';
import { cardQueryKeys } from '@/entities/card';
import { commentQueryKeys } from '@/features/comments';
import { dashboardQueryKeys } from '@/shared/api/query-keys';

export const REALTIME_EVENTS = [
  'board.updated',
  'column.created',
  'column.updated',
  'column.deleted',
  'card.created',
  'card.updated',
  'card.moved',
  'card.deleted',
  'comment.created',
] as const;

export type RealtimeEventName = (typeof REALTIME_EVENTS)[number];

export interface RealtimeEventPayload {
  actorId?: string;
  clientId?: string | null;
  cardId?: string;
  card?: { id: string };
  comment?: { cardId: string };
  [key: string]: unknown;
}

/**
 * Dedup rule: only events emitted by *this tab* are skipped. `actorId` is kept in
 * the payload for audit, but two tabs of the same user still need to see each
 * other's changes (see 03-frontend.md).
 */
export function isOwnEvent(payload: RealtimeEventPayload | undefined, clientId: string): boolean {
  return typeof payload?.clientId === 'string' && payload.clientId === clientId;
}

function cardIdOf(eventName: RealtimeEventName, payload: RealtimeEventPayload): string | undefined {
  switch (eventName) {
    case 'card.created':
    case 'card.updated':
      return payload.card?.id;
    case 'card.moved':
    case 'card.deleted':
      return payload.cardId;
    case 'comment.created':
      return payload.comment?.cardId ?? payload.cardId;
    default:
      return undefined;
  }
}

/**
 * Maps a server event to the react-query caches it invalidates. The activity log
 * is fed by the SSE stream, so it is not invalidated here.
 */
export function invalidateForRealtimeEvent(
  queryClient: QueryClient,
  boardId: string,
  eventName: RealtimeEventName,
  payload: RealtimeEventPayload = {},
): void {
  void queryClient.invalidateQueries({ queryKey: boardQueryKeys.detail(boardId) });

  if (eventName === 'board.updated') {
    void queryClient.invalidateQueries({ queryKey: boardQueryKeys.all });
    void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all });
  }

  const cardId = cardIdOf(eventName, payload);
  if (cardId) {
    void queryClient.invalidateQueries({ queryKey: cardQueryKeys.detail(cardId) });
    if (eventName === 'comment.created') {
      void queryClient.invalidateQueries({ queryKey: commentQueryKeys.list(cardId) });
    }
  }
}
