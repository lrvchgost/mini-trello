import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  ActivityAction,
  AssignCardInput,
  Card,
  CardDetail,
  CreateCardInput,
  MoveCardInput,
  UpdateCardInput,
} from '@min-trello/shared';
import { ActivityService } from '../activity/activity.service';
import { ErrorCode } from '../common/errors';
import {
  COLUMN_REPOSITORY_TOKEN,
  type IColumnRepository,
} from '../columns/repositories/column.repository';
import { CARD_REPOSITORY_TOKEN, type ICardRepository } from './repositories/card.repository';

export interface MoveCardResult {
  columnId: string;
  order: number;
}

@Injectable()
export class CardsService {
  constructor(
    @Inject(CARD_REPOSITORY_TOKEN)
    private readonly cardRepo: ICardRepository,
    @Inject(COLUMN_REPOSITORY_TOKEN)
    private readonly columnRepo: IColumnRepository,
    private readonly activityService: ActivityService,
  ) {}

  async create(
    columnId: string,
    input: CreateCardInput,
    actorId: string,
    boardId?: string,
  ): Promise<Card> {
    const card = await this.cardRepo.create({ ...input, columnId });
    await this.logActivity(
      boardId,
      'card.created',
      { cardId: card.id, title: card.title },
      actorId,
      card.id,
    );
    return card;
  }

  async findOne(id: string): Promise<CardDetail> {
    const card = await this.cardRepo.findDetailById(id);
    if (!card) {
      throw this.notFound();
    }
    return card;
  }

  async update(
    id: string,
    input: UpdateCardInput,
    actorId: string,
    boardId?: string,
  ): Promise<Card> {
    await this.ensureExists(id);

    const card = await this.cardRepo.update(id, input);
    if (!card) {
      throw new ConflictException({
        error: ErrorCode.CONFLICT,
        message: 'Card was modified by another request',
      });
    }

    await this.logActivity(
      boardId,
      'card.updated',
      { cardId: card.id, changes: input },
      actorId,
      card.id,
    );
    return card;
  }

  async move(
    id: string,
    input: MoveCardInput,
    actorId: string,
    boardId?: string,
  ): Promise<MoveCardResult> {
    await this.ensureExists(id);

    const column = await this.columnRepo.findById(input.columnId);
    if (!column || column.boardId !== boardId) {
      throw new NotFoundException({
        error: ErrorCode.COLUMN_NOT_FOUND,
        message: 'Column not found',
      });
    }

    const card = await this.cardRepo.move(id, input.columnId, input.order);
    await this.logActivity(
      boardId,
      'card.moved',
      { cardId: card.id, targetColumnId: card.columnId, newOrder: card.order },
      actorId,
      card.id,
    );
    return { columnId: card.columnId, order: card.order };
  }

  async assign(
    id: string,
    input: AssignCardInput,
    actorId: string,
    boardId?: string,
  ): Promise<Card> {
    if (input.assigneeId !== null && input.assigneeId !== actorId) {
      throw new UnprocessableEntityException({
        error: ErrorCode.INVALID_ASSIGNEE,
        message: 'Assignee must be the board owner',
      });
    }

    await this.ensureExists(id);
    const card = await this.cardRepo.setAssignee(id, input.assigneeId);
    await this.logActivity(
      boardId,
      'card.assignee_changed',
      { cardId: card.id, assigneeId: card.assigneeId },
      actorId,
      card.id,
    );
    return card;
  }

  async remove(id: string, actorId: string, boardId?: string): Promise<void> {
    await this.ensureExists(id);
    await this.cardRepo.remove(id);
    await this.logActivity(boardId, 'card.deleted', { cardId: id }, actorId);
  }

  private async logActivity(
    boardId: string | undefined,
    action: ActivityAction,
    payload: Record<string, unknown>,
    actorId: string,
    cardId?: string | null,
  ): Promise<void> {
    if (!boardId) {
      return;
    }
    await this.activityService.log(boardId, action, payload, actorId, cardId);
  }

  private async ensureExists(id: string): Promise<void> {
    const card = await this.cardRepo.findById(id);
    if (!card) {
      throw this.notFound();
    }
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      error: ErrorCode.CARD_NOT_FOUND,
      message: 'Card not found',
    });
  }
}
