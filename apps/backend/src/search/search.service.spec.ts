import type { Card, Paginated } from '@min-trello/shared';
import type { ISearchRepository } from './repositories/search.repository';
import { SearchService } from './search.service';

const emptyPage: Paginated<Card> = { items: [], total: 0, page: 1, limit: 20 };

describe('SearchService', () => {
  let service: SearchService;
  let searchRepo: jest.Mocked<ISearchRepository>;

  beforeEach(() => {
    searchRepo = { searchCards: jest.fn().mockResolvedValue(emptyPage) };
    service = new SearchService(searchRepo);
  });

  it('scopes board search to the owner and board id', async () => {
    await service.searchBoard('board-1', 'user-1', { page: 1, limit: 20, q: 'todo' });

    expect(searchRepo.searchCards).toHaveBeenCalledWith({
      ownerId: 'user-1',
      boardId: 'board-1',
      q: 'todo',
      priority: undefined,
      labelId: undefined,
      assigneeId: undefined,
      hasDeadline: undefined,
      page: 1,
      limit: 20,
    });
  });

  it('maps filter aliases for global search', async () => {
    await service.searchGlobal('user-1', {
      page: 2,
      limit: 5,
      priority: 'urgent',
      label: 'label-1',
      assignee: 'user-1',
      hasDeadline: true,
    });

    expect(searchRepo.searchCards).toHaveBeenCalledWith({
      ownerId: 'user-1',
      boardId: undefined,
      q: undefined,
      priority: 'urgent',
      labelId: 'label-1',
      assigneeId: 'user-1',
      hasDeadline: true,
      page: 2,
      limit: 5,
    });
  });
});
