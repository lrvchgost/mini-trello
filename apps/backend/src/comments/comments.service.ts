import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Comment, CreateCommentInput, Paginated } from '@min-trello/shared';
import { ErrorCode } from '../common/errors';
import { CARD_REPOSITORY_TOKEN, type ICardRepository } from '../cards/repositories/card.repository';
import {
  COMMENT_REPOSITORY_TOKEN,
  type ICommentRepository,
} from './repositories/comment.repository';

@Injectable()
export class CommentsService {
  constructor(
    @Inject(COMMENT_REPOSITORY_TOKEN)
    private readonly commentRepo: ICommentRepository,
    @Inject(CARD_REPOSITORY_TOKEN)
    private readonly cardRepo: ICardRepository,
  ) {}

  async list(cardId: string, page: number, limit: number): Promise<Paginated<Comment>> {
    await this.ensureCard(cardId);
    return this.commentRepo.findByCard(cardId, page, limit);
  }

  async create(cardId: string, input: CreateCommentInput, authorId: string): Promise<Comment> {
    await this.ensureCard(cardId);
    return this.commentRepo.create({ content: input.content, cardId, authorId });
  }

  async remove(id: string, userId: string): Promise<void> {
    const comment = await this.commentRepo.findById(id);
    if (!comment) {
      throw this.notFound();
    }
    if (comment.authorId !== userId) {
      throw new ForbiddenException({
        error: ErrorCode.FORBIDDEN,
        message: 'Only the author can delete a comment',
      });
    }
    await this.commentRepo.remove(id);
  }

  private async ensureCard(cardId: string): Promise<void> {
    const card = await this.cardRepo.findById(cardId);
    if (!card) {
      throw new NotFoundException({
        error: ErrorCode.CARD_NOT_FOUND,
        message: 'Card not found',
      });
    }
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      error: ErrorCode.COMMENT_NOT_FOUND,
      message: 'Comment not found',
    });
  }
}
