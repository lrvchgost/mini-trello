import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { SearchQuery } from '@min-trello/shared';
import { searchBoardCards, searchGlobalCards } from './api';
import type { FilterValues } from './lib';
import { searchQueryKeys } from './query-keys';
import { useFiltersStore } from './store';

/** Reactive snapshot of the current filter values. */
export function useFilterValues(): FilterValues {
  const q = useFiltersStore((state) => state.q);
  const priority = useFiltersStore((state) => state.priority);
  const labelId = useFiltersStore((state) => state.labelId);
  const assigneeId = useFiltersStore((state) => state.assigneeId);
  const hasDeadline = useFiltersStore((state) => state.hasDeadline);
  return { q, priority, labelId, assigneeId, hasDeadline };
}

export function useBoardSearchQuery(boardId: string, query: SearchQuery, enabled = true) {
  return useQuery({
    queryKey: searchQueryKeys.board(boardId, query),
    queryFn: () => searchBoardCards(boardId, query),
    placeholderData: keepPreviousData,
    enabled: Boolean(boardId) && enabled,
  });
}

export function useGlobalSearchQuery(query: SearchQuery, enabled = true) {
  return useQuery({
    queryKey: searchQueryKeys.global(query),
    queryFn: () => searchGlobalCards(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}
