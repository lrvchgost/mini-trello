import type { QueryClient } from '@tanstack/react-query';
import type { ActivityLog, Paginated } from '@min-trello/shared';
import { activityQueryKeys } from '@/entities/activity';

/**
 * Prepends an activity record streamed over SSE to the board's first page in the
 * react-query cache (deduplicated by id, capped at the page size). Other pages are
 * left untouched — the list always shows the newest records first.
 */
export function appendActivityToCache(
  queryClient: QueryClient,
  boardId: string,
  activity: ActivityLog,
): void {
  queryClient.setQueriesData<Paginated<ActivityLog>>(
    { queryKey: activityQueryKeys.board(boardId) },
    (current) => {
      if (!current || current.page !== 1) {
        return current;
      }
      if (current.items.some((item) => item.id === activity.id)) {
        return current;
      }
      const items = [activity, ...current.items].slice(0, current.limit);
      return { ...current, items, total: current.total + 1 };
    },
  );
}
