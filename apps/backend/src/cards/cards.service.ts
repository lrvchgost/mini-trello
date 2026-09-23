import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  AssignCardInput,
  Card,
  CardDetail,
  CreateCardInput,
  MoveCardInput,
  UpdateCardInput,
} from '@min-trello/shared';
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
  ) {}

  create(columnId: string, input: CreateCardInput): Promise<Card> {
    return this.cardRepo.create({ ...input, columnId });
  }

  async findOne(id: string): Promise<CardDetail> {
    const card = await this.cardRepo.findDetailById(id);
    if (!card) {
      throw this.notFound();
    }
    return card;
  }

  async update(id: string, input: UpdateCardInput): Promise<Card> {
    await this.ensureExists(id);

    const card = await this.cardRepo.update(id, input);
    if (!card) {
      throw new ConflictException({
        error: ErrorCode.CONFLICT,
        message: 'Card was modified by another request',
      });
    }
    return card;
  }

  async move(id: string, input: MoveCardInput, boardId: string): Promise<MoveCardResult> {
    await this.ensureExists(id);

    const column = await this.columnRepo.findById(input.columnId);
    if (!column || column.boardId !== boardId) {
      throw new NotFoundException({
        error: ErrorCode.COLUMN_NOT_FOUND,
        message: 'Column not found',
      });
    }

    const card = await this.cardRepo.move(id, input.columnId, input.order);
    return { columnId: card.columnId, order: card.order };
  }

  async assign(id: string, input: AssignCardInput, ownerId: string): Promise<Card> {
    if (input.assigneeId !== null && input.assigneeId !== ownerId) {
      throw new UnprocessableEntityException({
        error: ErrorCode.INVALID_ASSIGNEE,
        message: 'Assignee must be the board owner',
      });
    }

    await this.ensureExists(id);
    return this.cardRepo.setAssignee(id, input.assigneeId);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.cardRepo.remove(id);
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
