import { useMutation, useQuery } from '@tanstack/react-query';
import { useAssignCard } from '@/entities/card';
import { fetchAssignableUsers } from './api';

export function useAssignableUsersQuery() {
  return useQuery({
    queryKey: ['users', 'assignable'],
    queryFn: fetchAssignableUsers,
  });
}

export function useAssignCardMutation(cardId: string, boardId: string) {
  const assign = useAssignCard(boardId);
  return useMutation({
    mutationFn: (assigneeId: string | null) => assign.mutateAsync({ id: cardId, assigneeId }),
  });
}
