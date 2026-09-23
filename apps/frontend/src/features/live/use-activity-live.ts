import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { openActivityStream } from '@/shared/realtime';
import { appendActivityToCache } from './activity-cache';

export type ActivityStreamStatus = 'connecting' | 'open' | 'error';

/**
 * Streams the board activity log over SSE and appends each record to the query
 * cache. Closes the stream on unmount.
 */
export function useActivityLive(boardId: string | undefined): ActivityStreamStatus {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ActivityStreamStatus>('connecting');

  useEffect(() => {
    if (!boardId) {
      return;
    }
    setStatus('connecting');
    const close = openActivityStream(boardId, {
      onActivity: (activity) => appendActivityToCache(queryClient, boardId, activity),
      onOpen: () => setStatus('open'),
      onError: () => setStatus('connecting'),
      onAuthError: () => setStatus('error'),
    });
    return close;
  }, [boardId, queryClient]);

  return status;
}
