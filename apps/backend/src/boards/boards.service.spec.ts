import { NotFoundException } from '@nestjs/common';
import type { Board, BoardWithColumns } from '@min-trello/shared';
import type { ActivityService } from '../activity/activity.service';
import type { BoardsGateway } from './boards.gateway';
import type { IBoardRepository } from './repositories/board.repository';
import { BoardsService } from './boards.service';

const board: Board = {
  id: 'board-1',
  title: 'My Board',
  ownerId: 'user-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const boardWithColumns: BoardWithColumns = { ...board, columns: [] };

describe('BoardsService', () => {
  let service: BoardsService;
  let boardRepo: jest.Mocked<IBoardRepository>;
  let activityService: jest.Mocked<ActivityService>;
  let boardsGateway: jest.Mocked<BoardsGateway>;

  beforeEach(() => {
    boardRepo = {
      findById: jest.fn(),
      findByIdWithColumns: jest.fn(),
      findByOwner: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    activityService = {
      log: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<ActivityService>;

    boardsGateway = {
      emitBoardUpdated: jest.fn(),
    } as unknown as jest.Mocked<BoardsGateway>;

    service = new BoardsService(boardRepo, activityService, boardsGateway);
  });

  describe('list', () => {
    it('returns the owner paginated boards', async () => {
      const paginated = { items: [board], total: 1, page: 1, limit: 20 };
      boardRepo.findByOwner.mockResolvedValue(paginated);

      await expect(service.list('user-1', { page: 2, limit: 5, search: 'my' })).resolves.toBe(
        paginated,
      );
      expect(boardRepo.findByOwner).toHaveBeenCalledWith('user-1', 2, 5, 'my');
    });
  });

  describe('create', () => {
    it('creates a board owned by the current user and logs activity', async () => {
      boardRepo.create.mockResolvedValue(board);

      await expect(service.create('user-1', { title: 'My Board' })).resolves.toBe(board);
      expect(boardRepo.create).toHaveBeenCalledWith({ title: 'My Board', ownerId: 'user-1' });
      expect(activityService.log).toHaveBeenCalledWith(
        'board-1',
        'board.created',
        { title: 'My Board' },
        'user-1',
      );
      expect(boardsGateway.emitBoardUpdated).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns the board with columns and cards', async () => {
      boardRepo.findByIdWithColumns.mockResolvedValue(boardWithColumns);

      await expect(service.findOne('board-1')).resolves.toBe(boardWithColumns);
    });

    it('throws BOARD_NOT_FOUND when the board is missing', async () => {
      boardRepo.findByIdWithColumns.mockResolvedValue(null);

      await expect(service.findOne('board-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates the board, logs activity and emits board.updated', async () => {
      const updated = { ...board, title: 'Renamed' };
      boardRepo.update.mockResolvedValue(updated);

      await expect(
        service.update('board-1', { title: 'Renamed' }, 'user-1', 'tab-1'),
      ).resolves.toBe(updated);
      expect(boardRepo.update).toHaveBeenCalledWith('board-1', { title: 'Renamed' });
      expect(activityService.log).toHaveBeenCalledWith(
        'board-1',
        'board.updated',
        { changes: { title: 'Renamed' } },
        'user-1',
      );
      expect(boardsGateway.emitBoardUpdated).toHaveBeenCalledWith({
        board: updated,
        actorId: 'user-1',
        clientId: 'tab-1',
      });
    });
  });

  describe('remove', () => {
    it('logs activity and deletes the board', async () => {
      boardRepo.delete.mockResolvedValue(undefined);

      await service.remove('board-1', 'user-1');
      expect(activityService.log).toHaveBeenCalledWith('board-1', 'board.deleted', {}, 'user-1');
      expect(boardRepo.delete).toHaveBeenCalledWith('board-1');
    });
  });
});
