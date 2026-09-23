import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Card, CardDetail } from '@min-trello/shared';
import type { IColumnRepository } from '../columns/repositories/column.repository';
import { CardsService } from './cards.service';
import type { ICardRepository } from './repositories/card.repository';

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

const cardDetail: CardDetail = { ...card, assignee: null, labels: [] };

const column = {
  id: 'column-1',
  title: 'To Do',
  isDone: false,
  order: 0,
  boardId: 'board-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('CardsService', () => {
  let service: CardsService;
  let cardRepo: jest.Mocked<ICardRepository>;
  let columnRepo: jest.Mocked<IColumnRepository>;

  beforeEach(() => {
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

    columnRepo = {
      findById: jest.fn(),
      findByBoard: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    service = new CardsService(cardRepo, columnRepo);
  });

  describe('create', () => {
    it('creates a card inside the column', async () => {
      cardRepo.create.mockResolvedValue(card);

      await expect(
        service.create('column-1', { title: 'First task', priority: 'medium' }),
      ).resolves.toBe(card);
      expect(cardRepo.create).toHaveBeenCalledWith({
        title: 'First task',
        priority: 'medium',
        columnId: 'column-1',
      });
    });
  });

  describe('findOne', () => {
    it('returns the card detail', async () => {
      cardRepo.findDetailById.mockResolvedValue(cardDetail);

      await expect(service.findOne('card-1')).resolves.toBe(cardDetail);
    });

    it('throws CARD_NOT_FOUND when the card is missing', async () => {
      cardRepo.findDetailById.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates the card', async () => {
      const updated = { ...card, title: 'Renamed' };
      cardRepo.findById.mockResolvedValue(card);
      cardRepo.update.mockResolvedValue(updated);

      await expect(service.update('card-1', { title: 'Renamed' })).resolves.toBe(updated);
    });

    it('throws CONFLICT when expectedUpdatedAt is stale', async () => {
      cardRepo.findById.mockResolvedValue(card);
      cardRepo.update.mockResolvedValue(null);

      await expect(service.update('card-1', { title: 'Renamed' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws CARD_NOT_FOUND when the card is missing', async () => {
      cardRepo.findById.mockResolvedValue(null);

      await expect(service.update('missing', { title: 'Renamed' })).rejects.toThrow(
        NotFoundException,
      );
      expect(cardRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('move', () => {
    it('moves the card and returns its new position', async () => {
      cardRepo.findById.mockResolvedValue(card);
      columnRepo.findById.mockResolvedValue(column);
      cardRepo.move.mockResolvedValue({ ...card, columnId: 'column-2', order: 3 });

      await expect(
        service.move('card-1', { columnId: 'column-2', order: 3 }, 'board-1'),
      ).resolves.toEqual({ columnId: 'column-2', order: 3 });
      expect(cardRepo.move).toHaveBeenCalledWith('card-1', 'column-2', 3);
    });

    it('throws COLUMN_NOT_FOUND for a column of another board', async () => {
      cardRepo.findById.mockResolvedValue(card);
      columnRepo.findById.mockResolvedValue({ ...column, boardId: 'board-2' });

      await expect(
        service.move('card-1', { columnId: 'column-1', order: 0 }, 'board-1'),
      ).rejects.toThrow(NotFoundException);
      expect(cardRepo.move).not.toHaveBeenCalled();
    });

    it('throws COLUMN_NOT_FOUND for a missing column', async () => {
      cardRepo.findById.mockResolvedValue(card);
      columnRepo.findById.mockResolvedValue(null);

      await expect(
        service.move('card-1', { columnId: 'missing', order: 0 }, 'board-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws CARD_NOT_FOUND when the card is missing', async () => {
      cardRepo.findById.mockResolvedValue(null);

      await expect(
        service.move('missing', { columnId: 'column-1', order: 0 }, 'board-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assign', () => {
    it('assigns the board owner', async () => {
      cardRepo.findById.mockResolvedValue(card);
      cardRepo.setAssignee.mockResolvedValue({ ...card, assigneeId: 'user-1' });

      await expect(
        service.assign('card-1', { assigneeId: 'user-1' }, 'user-1'),
      ).resolves.toMatchObject({ assigneeId: 'user-1' });
    });

    it('allows clearing the assignee', async () => {
      cardRepo.findById.mockResolvedValue(card);
      cardRepo.setAssignee.mockResolvedValue(card);

      await expect(service.assign('card-1', { assigneeId: null }, 'user-1')).resolves.toBe(card);
      expect(cardRepo.setAssignee).toHaveBeenCalledWith('card-1', null);
    });

    it('rejects an assignee that is not the board owner (422)', async () => {
      await expect(service.assign('card-1', { assigneeId: 'user-2' }, 'user-1')).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(cardRepo.setAssignee).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the card', async () => {
      cardRepo.findById.mockResolvedValue(card);
      cardRepo.remove.mockResolvedValue(undefined);

      await service.remove('card-1');
      expect(cardRepo.remove).toHaveBeenCalledWith('card-1');
    });

    it('throws CARD_NOT_FOUND when the card is missing', async () => {
      cardRepo.findById.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      expect(cardRepo.remove).not.toHaveBeenCalled();
    });
  });
});
