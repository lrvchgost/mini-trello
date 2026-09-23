import { Inject, Injectable } from '@nestjs/common';
import type { Card, Paginated, SearchQuery } from '@min-trello/shared';
import {
  SEARCH_REPOSITORY_TOKEN,
  type ISearchRepository,
  type SearchCardsQuery,
} from './repositories/search.repository';

@Injectable()
export class SearchService {
  constructor(
    @Inject(SEARCH_REPOSITORY_TOKEN)
    private readonly searchRepo: ISearchRepository,
  ) {}

  searchBoard(boardId: string, ownerId: string, query: SearchQuery): Promise<Paginated<Card>> {
    return this.searchRepo.searchCards(this.toQuery(ownerId, query, boardId));
  }

  searchGlobal(ownerId: string, query: SearchQuery): Promise<Paginated<Card>> {
    return this.searchRepo.searchCards(this.toQuery(ownerId, query));
  }

  private toQuery(ownerId: string, query: SearchQuery, boardId?: string): SearchCardsQuery {
    return {
      ownerId,
      boardId,
      q: query.q,
      priority: query.priority,
      labelId: query.label,
      assigneeId: query.assignee,
      hasDeadline: query.hasDeadline,
      page: query.page,
      limit: query.limit,
    };
  }
}
