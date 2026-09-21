import type { Comment, Paginated } from '@min-trello/shared';

export const COMMENT_REPOSITORY_TOKEN = 'COMMENT_REPOSITORY';

export interface ICommentRepository {
  findById(id: string): Promise<Comment | null>;
  findByCard(cardId: string, page?: number, limit?: number): Promise<Paginated<Comment>>;
  create(data: { content: string; cardId: string; authorId: string }): Promise<Comment>;
  remove(id: string): Promise<void>;
}
