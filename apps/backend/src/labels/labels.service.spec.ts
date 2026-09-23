import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Card, CardDetail, Label } from '@min-trello/shared';
import type { ICardRepository } from '../cards/repositories/card.repository';
import { LabelsService } from './labels.service';
import type { ILabelRepository } from './repositories/label.repository';

const label: Label = {
  id: 'label-1',
  name: 'bug',
  color: '#f00',
  boardId: 'board-1',
};

const card: Card = {
  id: 'card-1',
  title: 'First task',
  description: null,
  priority: 'medium',
  deadline: null,
  order: 0,
  columnId: 'column-1',
  assigneeId: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const cardDetail: CardDetail = { ...card, assignee: null, labels: [label] };

describe('LabelsService', () => {
  let service: LabelsService;
  let labelRepo: jest.Mocked<ILabelRepository>;
  let cardRepo: jest.Mocked<ICardRepository>;

  beforeEach(() => {
    labelRepo = {
      findById: jest.fn(),
      findByBoard: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
      attachToCard: jest.fn(),
      detachFromCard: jest.fn(),
    };

    cardRepo = {
      findById: jest.fn(),
      findDetailById: jest.fn(),
      findManyByColumn: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      move: jest.fn(),
      setAssignee: jest.fn(),
      remove: jest.fn(),
    };

    service = new LabelsService(labelRepo, cardRepo);
  });

  describe('create', () => {
    it('creates a label inside the board', async () => {
      labelRepo.create.mockResolvedValue(label);

      await expect(service.create('board-1', { name: 'bug', color: '#f00' })).resolves.toBe(label);
      expect(labelRepo.create).toHaveBeenCalledWith({
        name: 'bug',
        color: '#f00',
        boardId: 'board-1',
      });
    });

    it('throws CONFLICT when the name is taken in the board', async () => {
      labelRepo.create.mockRejectedValue({ code: 'P2002' });

      await expect(service.create('board-1', { name: 'bug', color: '#f00' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findByBoard', () => {
    it('lists labels of the board', async () => {
      labelRepo.findByBoard.mockResolvedValue([label]);

      await expect(service.findByBoard('board-1')).resolves.toEqual([label]);
    });
  });

  describe('remove', () => {
    it('deletes the label', async () => {
      labelRepo.findById.mockResolvedValue(label);
      labelRepo.remove.mockResolvedValue(undefined);

      await service.remove('label-1');
      expect(labelRepo.remove).toHaveBeenCalledWith('label-1');
    });

    it('throws LABEL_NOT_FOUND when the label is missing', async () => {
      labelRepo.findById.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      expect(labelRepo.remove).not.toHaveBeenCalled();
    });
  });

  describe('attach', () => {
    it('attaches a label of the same board and returns the card', async () => {
      cardRepo.findById.mockResolvedValue(card);
      cardRepo.findDetailById.mockResolvedValue(cardDetail);
      labelRepo.findById.mockResolvedValue(label);
      labelRepo.attachToCard.mockResolvedValue(undefined);

      await expect(service.attach('card-1', 'label-1', 'board-1')).resolves.toBe(cardDetail);
      expect(labelRepo.attachToCard).toHaveBeenCalledWith('card-1', 'label-1');
    });

    it('rejects a label from another board (422)', async () => {
      cardRepo.findById.mockResolvedValue(card);
      labelRepo.findById.mockResolvedValue({ ...label, boardId: 'board-2' });

      await expect(service.attach('card-1', 'label-1', 'board-1')).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(labelRepo.attachToCard).not.toHaveBeenCalled();
    });

    it('throws LABEL_NOT_FOUND when the label is missing', async () => {
      cardRepo.findById.mockResolvedValue(card);
      labelRepo.findById.mockResolvedValue(null);

      await expect(service.attach('card-1', 'missing', 'board-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(labelRepo.attachToCard).not.toHaveBeenCalled();
    });

    it('throws CARD_NOT_FOUND when the card is missing', async () => {
      cardRepo.findById.mockResolvedValue(null);

      await expect(service.attach('missing', 'label-1', 'board-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(labelRepo.attachToCard).not.toHaveBeenCalled();
    });
  });

  describe('detach', () => {
    it('detaches the label from the card', async () => {
      cardRepo.findById.mockResolvedValue(card);
      labelRepo.detachFromCard.mockResolvedValue(undefined);

      await service.detach('card-1', 'label-1');
      expect(labelRepo.detachFromCard).toHaveBeenCalledWith('card-1', 'label-1');
    });

    it('throws CARD_NOT_FOUND when the card is missing', async () => {
      cardRepo.findById.mockResolvedValue(null);

      await expect(service.detach('missing', 'label-1')).rejects.toThrow(NotFoundException);
      expect(labelRepo.detachFromCard).not.toHaveBeenCalled();
    });
  });
});
