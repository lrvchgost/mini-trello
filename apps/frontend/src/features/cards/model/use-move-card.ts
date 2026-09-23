import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BoardWithColumns, MoveCardInput } from '@min-trello/shared';
import { boardQueryKeys } from '@/entities/board';
import { cardQueryKeys, moveCard } from '@/entities/card';
import { applyCardMove } from './apply-card-move';

interface MoveCardVariables {
  id: string;
  input: MoveCardInput;
}

export function useMoveCard(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: MoveCardVariables) => moveCard(id, input),
    // Kept synchronous on purpose: @hello-pangea/dnd requires the reorder to be
    // applied in the same tick as `onDragEnd`, otherwise the whole column flashes
    // back to the old order before the optimistic data lands.
    onMutate: ({ id, input }: MoveCardVariables) => {
      const queryKey = boardQueryKeys.detail(boardId);
      const previous = queryClient.getQueryData<BoardWithColumns>(queryKey);

      if (previous) {
        queryClient.setQueryData(
          queryKey,
          applyCardMove(previous, id, input.columnId, input.order),
        );
      }
      void queryClient.cancelQueries({ queryKey });

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardQueryKeys.detail(boardId), context.previous);
      }
    },
    onSettled: (_data, _error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: boardQueryKeys.detail(boardId) });
      void queryClient.invalidateQueries({ queryKey: cardQueryKeys.detail(id) });
    },
  });
}
