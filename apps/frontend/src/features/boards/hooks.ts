import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_LIMIT, DEFAULT_PAGE, type CreateBoardInput } from '@min-trello/shared';
import { createBoard, fetchBoards, type BoardListParams } from './api';

export const boardQueryKeys = {
  all: ['boards'] as const,
  list: (params: BoardListParams) => [...boardQueryKeys.all, 'list', params] as const,
};

const defaultParams: BoardListParams = { page: DEFAULT_PAGE, limit: DEFAULT_LIMIT };

export function useBoardsQuery(params: BoardListParams = defaultParams) {
  return useQuery({
    queryKey: boardQueryKeys.list(params),
    queryFn: () => fetchBoards(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBoardInput) => createBoard(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: boardQueryKeys.all });
    },
  });
}
