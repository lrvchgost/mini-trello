import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getClientId } from '@/shared/api/client-id';
import { getSocket } from '@/shared/realtime';
import {
  invalidateForRealtimeEvent,
  isOwnEvent,
  REALTIME_EVENTS,
  type RealtimeEventPayload,
} from './events';

/**
 * Joins the `board:{boardId}` Socket.IO room and invalidates the relevant query
 * caches on server events. Own-tab events are skipped via `clientId` dedup;
 * re-joins after reconnects and leaves the room on unmount.
 */
export function useBoardLive(boardId: string | undefined): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!boardId) {
      return;
    }
    const socket = getSocket();
    const clientId = getClientId();

    const join = () => {
      socket.emit('joinBoard', { boardId, clientId });
    };

    const listeners = REALTIME_EVENTS.map((eventName) => {
      const listener = (payload: RealtimeEventPayload) => {
        if (isOwnEvent(payload, clientId)) {
          return;
        }
        invalidateForRealtimeEvent(queryClient, boardId, eventName, payload);
      };
      socket.on(eventName, listener);
      return { eventName, listener };
    });

    socket.on('connect', join);
    if (socket.connected) {
      join();
    }

    return () => {
      for (const { eventName, listener } of listeners) {
        socket.off(eventName, listener);
      }
      socket.off('connect', join);
      socket.emit('leaveBoard', { boardId });
    };
  }, [boardId, queryClient]);
}
