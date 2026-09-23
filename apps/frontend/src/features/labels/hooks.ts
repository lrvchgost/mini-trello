import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateLabelInput } from '@min-trello/shared';
import { boardQueryKeys } from '@/entities/board';
import { cardQueryKeys } from '@/entities/card';
import { attachLabel, createLabel, detachLabel, fetchBoardLabels } from './api';
import { labelQueryKeys } from './query-keys';

export function useBoardLabelsQuery(boardId: string) {
  return useQuery({
    queryKey: labelQueryKeys.list(boardId),
    queryFn: () => fetchBoardLabels(boardId),
    enabled: Boolean(boardId),
  });
}

export function useCreateLabel(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLabelInput) => createLabel(boardId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labelQueryKeys.list(boardId) });
    },
  });
}

function useCardLabelSync(cardId: string, boardId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: cardQueryKeys.detail(cardId) });
    void queryClient.invalidateQueries({ queryKey: boardQueryKeys.detail(boardId) });
  };
}

export function useAttachLabel(cardId: string, boardId: string) {
  const sync = useCardLabelSync(cardId, boardId);
  return useMutation({
    mutationFn: (labelId: string) => attachLabel(cardId, labelId),
    onSuccess: sync,
  });
}

export function useDetachLabel(cardId: string, boardId: string) {
  const sync = useCardLabelSync(cardId, boardId);
  return useMutation({
    mutationFn: (labelId: string) => detachLabel(cardId, labelId),
    onSuccess: sync,
  });
}
