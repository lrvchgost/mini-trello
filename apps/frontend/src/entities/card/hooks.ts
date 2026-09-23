import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateCardInput, UpdateCardInput } from '@min-trello/shared';
import { boardQueryKeys } from '@/entities/board';
import { assignCard, createCard, deleteCard, fetchCard, updateCard } from './api';
import { cardQueryKeys } from './query-keys';

export function useCardQuery(id: string | undefined) {
  return useQuery({
    queryKey: cardQueryKeys.detail(id ?? ''),
    queryFn: () => fetchCard(id as string),
    enabled: Boolean(id),
  });
}

function useInvalidateCard(boardId: string) {
  const queryClient = useQueryClient();
  return (cardId: string) => {
    void queryClient.invalidateQueries({ queryKey: cardQueryKeys.detail(cardId) });
    void queryClient.invalidateQueries({ queryKey: boardQueryKeys.detail(boardId) });
  };
}

export function useCreateCard(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ columnId, input }: { columnId: string; input: CreateCardInput }) =>
      createCard(columnId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: boardQueryKeys.detail(boardId) });
    },
  });
}

export function useUpdateCard(boardId: string) {
  const invalidate = useInvalidateCard(boardId);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCardInput }) => updateCard(id, input),
    onSuccess: (_card, { id }) => invalidate(id),
  });
}

export function useAssignCard(boardId: string) {
  const invalidate = useInvalidateCard(boardId);
  return useMutation({
    mutationFn: ({ id, assigneeId }: { id: string; assigneeId: string | null }) =>
      assignCard(id, assigneeId),
    onSuccess: (_card, { id }) => invalidate(id),
  });
}

export function useDeleteCard(boardId: string) {
  const invalidate = useInvalidateCard(boardId);
  return useMutation({
    mutationFn: (id: string) => deleteCard(id),
    onSuccess: (_void, id) => invalidate(id),
  });
}
