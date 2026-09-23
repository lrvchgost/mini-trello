import {
  activityLogSchema,
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  paginated,
  type ActivityLog,
  type Paginated,
} from '@min-trello/shared';
import { api } from '@/shared/api/ky-client';
import type { ActivityListParams } from './query-keys';

const paginatedActivitySchema = paginated(activityLogSchema);

export const activityPageSize = DEFAULT_LIMIT;

export async function fetchActivity(
  boardId: string,
  params: ActivityListParams = { page: DEFAULT_PAGE, limit: activityPageSize },
): Promise<Paginated<ActivityLog>> {
  const data = await api.get(`boards/${boardId}/activity`, { searchParams: params }).json();
  return paginatedActivitySchema.parse(data);
}
