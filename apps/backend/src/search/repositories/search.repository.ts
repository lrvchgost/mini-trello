import type { Card, Paginated, Priority } from '@min-trello/shared';

export const SEARCH_REPOSITORY_TOKEN = 'SEARCH_REPOSITORY';

export interface SearchCardsQuery {
  ownerId: string;
  boardId?: string;
  q?: string;
  priority?: Priority;
  labelId?: string;
  assigneeId?: string;
  hasDeadline?: boolean;
  page?: number;
  limit?: number;
}

export interface ISearchRepository {
  searchCards(query: SearchCardsQuery): Promise<Paginated<Card>>;
}
