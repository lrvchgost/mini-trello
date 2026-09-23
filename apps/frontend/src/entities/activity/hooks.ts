import { useQuery } from '@tanstack/react-query';
import { DEFAULT_PAGE } from '@min-trello/shared';
import { fetchActivity, activityPageSize } from './api';
import { activityQueryKeys, type ActivityListParams } from './query-keys';

export function useActivityQuery(
  boardId: string | undefined,
  params: ActivityListParams = { page: DEFAULT_PAGE, limit: activityPageSize },
) {
  return useQuery({
    queryKey: activityQueryKeys.list(boardId ?? '', params),
    queryFn: () => fetchActivity(boardId as string, params),
    enabled: Boolean(boardId),
  });
}
