import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_LIMIT, DEFAULT_PAGE, type CreateBoardInput } from '@min-trello/shared';
import { dashboardQueryKeys } from '@/shared/api/query-keys';
import { createBoard, fetchBoard, fetchBoards, type BoardListParams } from './api';
import { boardQueryKeys } from './query-keys';

const defaultParams: BoardListParams = { page: DEFAULT_PAGE, limit: DEFAULT_LIMIT };

export function useBoardsQuery(params: BoardListParams = defaultParams) {
  return useQuery({
    queryKey: boardQueryKeys.list(params),
    queryFn: () => fetchBoards(params),
    placeholderData: keepPreviousData,
  });
}

export function useBoardQuery(id: string | undefined) {
  return useQuery({
    queryKey: boardQueryKeys.detail(id ?? ''),
    queryFn: () => fetchBoard(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBoardInput) => createBoard(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: boardQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all });
    },
  });
}
