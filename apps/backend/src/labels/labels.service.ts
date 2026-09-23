import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { CardDetail, CreateLabelInput, Label } from '@min-trello/shared';
import { ErrorCode } from '../common/errors';
import { isUniqueConstraintError } from '../common/prisma-errors';
import { CARD_REPOSITORY_TOKEN, type ICardRepository } from '../cards/repositories/card.repository';
import { LABEL_REPOSITORY_TOKEN, type ILabelRepository } from './repositories/label.repository';

@Injectable()
export class LabelsService {
  constructor(
    @Inject(LABEL_REPOSITORY_TOKEN)
    private readonly labelRepo: ILabelRepository,
    @Inject(CARD_REPOSITORY_TOKEN)
    private readonly cardRepo: ICardRepository,
  ) {}

  async create(boardId: string, input: CreateLabelInput): Promise<Label> {
    try {
      return await this.labelRepo.create({ ...input, boardId });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException({
          error: ErrorCode.CONFLICT,
          message: 'Label with this name already exists',
        });
      }
      throw error;
    }
  }

  findByBoard(boardId: string): Promise<Label[]> {
    return this.labelRepo.findByBoard(boardId);
  }

  async remove(id: string): Promise<void> {
    const label = await this.labelRepo.findById(id);
    if (!label) {
      throw this.labelNotFound();
    }
    await this.labelRepo.remove(id);
  }

  async attach(cardId: string, labelId: string, boardId: string): Promise<CardDetail> {
    await this.ensureCard(cardId);

    const label = await this.labelRepo.findById(labelId);
    if (!label) {
      throw this.labelNotFound();
    }
    if (label.boardId !== boardId) {
      throw new UnprocessableEntityException({
        error: ErrorCode.INVALID_LABEL,
        message: 'Label belongs to another board',
      });
    }

    await this.labelRepo.attachToCard(cardId, labelId);
    return this.cardDetail(cardId);
  }

  async detach(cardId: string, labelId: string): Promise<void> {
    await this.ensureCard(cardId);
    await this.labelRepo.detachFromCard(cardId, labelId);
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

  private async cardDetail(cardId: string): Promise<CardDetail> {
    const card = await this.cardRepo.findDetailById(cardId);
    if (!card) {
      throw new NotFoundException({
        error: ErrorCode.CARD_NOT_FOUND,
        message: 'Card not found',
      });
    }
    return card;
  }

  private labelNotFound(): NotFoundException {
    return new NotFoundException({
      error: ErrorCode.LABEL_NOT_FOUND,
      message: 'Label not found',
    });
  }
}
