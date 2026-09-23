import { NotFoundException } from '@nestjs/common';
import type { Column } from '@min-trello/shared';
import type { BoardsGateway } from '../boards/boards.gateway';
import { ColumnsService } from './columns.service';
import type { IColumnRepository } from './repositories/column.repository';

const column: Column = {
  id: 'column-1',
  title: 'To Do',
  isDone: false,
  order: 0,
  boardId: 'board-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('ColumnsService', () => {
  let service: ColumnsService;
  let columnRepo: jest.Mocked<IColumnRepository>;
  let boardsGateway: jest.Mocked<BoardsGateway>;

  beforeEach(() => {
    columnRepo = {
      findById: jest.fn(),
      findByBoard: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    boardsGateway = {
      emitColumnCreated: jest.fn(),
      emitColumnUpdated: jest.fn(),
      emitColumnDeleted: jest.fn(),
    } as unknown as jest.Mocked<BoardsGateway>;

    service = new ColumnsService(columnRepo, boardsGateway);
  });

  describe('create', () => {
    it('creates a column inside the board and emits column.created', async () => {
      columnRepo.create.mockResolvedValue(column);

      await expect(service.create('board-1', { title: 'To Do' }, 'user-1', 'tab-1')).resolves.toBe(
        column,
      );
      expect(columnRepo.create).toHaveBeenCalledWith({ title: 'To Do', boardId: 'board-1' });
      expect(boardsGateway.emitColumnCreated).toHaveBeenCalledWith({
        column,
        actorId: 'user-1',
        clientId: 'tab-1',
      });
    });
  });

  describe('update', () => {
    it('updates the title, reorders and emits column.updated', async () => {
      const updated = { ...column, title: 'Doing', order: 2 };
      columnRepo.findById.mockResolvedValue(column);
      columnRepo.update.mockResolvedValue(updated);

      await expect(
        service.update('column-1', { title: 'Doing', order: 2 }, 'user-1', 'tab-1'),
      ).resolves.toBe(updated);
      expect(columnRepo.update).toHaveBeenCalledWith('column-1', { title: 'Doing', order: 2 });
      expect(boardsGateway.emitColumnUpdated).toHaveBeenCalledWith({
        column: updated,
        actorId: 'user-1',
        clientId: 'tab-1',
      });
    });

    it('throws COLUMN_NOT_FOUND when the column is missing', async () => {
      columnRepo.findById.mockResolvedValue(null);

      await expect(service.update('missing', { order: 1 }, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(columnRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the column and emits column.deleted', async () => {
      columnRepo.findById.mockResolvedValue(column);
      columnRepo.delete.mockResolvedValue(undefined);

      await service.remove('column-1', 'user-1', 'tab-1');
      expect(columnRepo.delete).toHaveBeenCalledWith('column-1');
      expect(boardsGateway.emitColumnDeleted).toHaveBeenCalledWith('board-1', {
        columnId: 'column-1',
        actorId: 'user-1',
        clientId: 'tab-1',
      });
    });

    it('throws COLUMN_NOT_FOUND when the column is missing', async () => {
      columnRepo.findById.mockResolvedValue(null);

      await expect(service.remove('missing', 'user-1')).rejects.toThrow(NotFoundException);
      expect(columnRepo.delete).not.toHaveBeenCalled();
    });
  });
});
