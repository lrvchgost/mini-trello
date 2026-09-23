import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateColumnInput } from '@min-trello/shared';
import { boardQueryKeys } from '@/entities/board';
import { createColumn } from './api';

export function useCreateColumn(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateColumnInput) => createColumn(boardId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: boardQueryKeys.detail(boardId) });
    },
  });
}
