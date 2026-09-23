import {
  cardSchema,
  paginated,
  type Card,
  type Paginated,
  type SearchQuery,
} from '@min-trello/shared';
import { api } from '@/shared/api/ky-client';

const paginatedCardsSchema = paginated(cardSchema);

/** Builds string search params, omitting empty filters (zod coerces them on the server). */
export function toSearchParams(query: SearchQuery): Record<string, string> {
  const params: Record<string, string> = {
    page: String(query.page),
    limit: String(query.limit),
  };
  if (query.q) {
    params.q = query.q;
  }
  if (query.priority) {
    params.priority = query.priority;
  }
  if (query.label) {
    params.label = query.label;
  }
  if (query.assignee) {
    params.assignee = query.assignee;
  }
  if (query.hasDeadline !== undefined) {
    params.hasDeadline = String(query.hasDeadline);
  }
  return params;
}

export async function searchBoardCards(
  boardId: string,
  query: SearchQuery,
): Promise<Paginated<Card>> {
  const data = await api
    .get(`boards/${boardId}/search`, { searchParams: toSearchParams(query) })
    .json();
  return paginatedCardsSchema.parse(data);
}

export async function searchGlobalCards(query: SearchQuery): Promise<Paginated<Card>> {
  const data = await api.get('search', { searchParams: toSearchParams(query) }).json();
  return paginatedCardsSchema.parse(data);
}
