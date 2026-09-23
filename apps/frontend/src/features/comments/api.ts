import {
  commentSchema,
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  paginated,
  type Comment,
  type Paginated,
} from '@min-trello/shared';
import { api } from '@/shared/api/ky-client';

const paginatedCommentsSchema = paginated(commentSchema);

export type CommentsParams = {
  page: number;
  limit: number;
};

export const commentsPageSize = DEFAULT_LIMIT;

export async function fetchComments(
  cardId: string,
  params: CommentsParams = { page: DEFAULT_PAGE, limit: commentsPageSize },
): Promise<Paginated<Comment>> {
  const data = await api.get(`cards/${cardId}/comments`, { searchParams: params }).json();
  return paginatedCommentsSchema.parse(data);
}

export async function createComment(cardId: string, content: string): Promise<Comment> {
  const data = await api.post(`cards/${cardId}/comments`, { json: { content } }).json();
  return commentSchema.parse(data);
}

export async function deleteComment(id: string): Promise<void> {
  await api.delete(`comments/${id}`);
}
