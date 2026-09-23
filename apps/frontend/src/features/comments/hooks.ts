import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_PAGE, type Comment } from '@min-trello/shared';
import { createComment, deleteComment, fetchComments, commentsPageSize } from './api';
import { commentQueryKeys } from './query-keys';

export function useCommentsQuery(cardId: string) {
  return useInfiniteQuery({
    queryKey: commentQueryKeys.list(cardId),
    initialPageParam: DEFAULT_PAGE,
    queryFn: ({ pageParam }) => fetchComments(cardId, { page: pageParam, limit: commentsPageSize }),
    getNextPageParam: (last) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
    enabled: Boolean(cardId),
  });
}

export function useCreateComment(cardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => createComment(cardId, content),
    onSuccess: (comment: Comment) => {
      void queryClient.invalidateQueries({ queryKey: commentQueryKeys.list(comment.cardId) });
    },
  });
}

export function useDeleteComment(cardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commentQueryKeys.list(cardId) });
    },
  });
}
