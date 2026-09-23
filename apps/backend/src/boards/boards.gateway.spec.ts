import type { Board, Column } from '@min-trello/shared';
import type { Server, Socket } from 'socket.io';
import type { WsAuthMiddleware, WsSocketData } from '../realtime/ws-auth.middleware';
import { BoardsGateway } from './boards.gateway';
import type { IBoardRepository } from './repositories/board.repository';

const board: Board = {
  id: 'board-1',
  title: 'My Board',
  ownerId: 'user-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const column: Column = {
  id: 'column-1',
  title: 'To Do',
  isDone: false,
  order: 0,
  boardId: 'board-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

function createSocket(user?: { id: string; email: string }): Socket {
  return {
    id: 'socket-1',
    data: user ? ({ user } as WsSocketData) : ({} as WsSocketData),
    emit: jest.fn(),
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
  } as unknown as Socket;
}

describe('BoardsGateway', () => {
  let gateway: BoardsGateway;
  let boardRepo: jest.Mocked<IBoardRepository>;
  let wsAuth: jest.Mocked<WsAuthMiddleware>;
  let emit: jest.Mock;
  let server: Server;

  beforeEach(() => {
    boardRepo = {
      findById: jest.fn(),
      findByIdWithColumns: jest.fn(),
      findByOwner: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    wsAuth = { apply: jest.fn() } as unknown as jest.Mocked<WsAuthMiddleware>;
    emit = jest.fn();
    server = { to: jest.fn().mockReturnValue({ emit }) } as unknown as Server;

    gateway = new BoardsGateway(boardRepo, wsAuth);
    gateway.server = server;
  });

  it('applies the ws auth middleware on init', () => {
    gateway.afterInit(server);
    expect(wsAuth.apply).toHaveBeenCalledWith(server);
  });

  describe('joinBoard', () => {
    it('joins the room when the caller owns the board', async () => {
      boardRepo.findById.mockResolvedValue(board);
      const socket = createSocket({ id: 'user-1', email: 'user@example.com' });

      await gateway.handleJoinBoard(socket, { boardId: 'board-1', clientId: 'tab-1' });

      expect(socket.join).toHaveBeenCalledWith('board:board-1');
      expect((socket.data as WsSocketData).clientId).toBe('tab-1');
      expect(socket.emit).not.toHaveBeenCalled();
    });

    it('rejects a socket without an authenticated user', async () => {
      const socket = createSocket();

      await gateway.handleJoinBoard(socket, { boardId: 'board-1' });

      expect(socket.join).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith('error', { code: 'UNAUTHORIZED' });
    });

    it('rejects a missing boardId', async () => {
      const socket = createSocket({ id: 'user-1', email: 'user@example.com' });

      await gateway.handleJoinBoard(socket, {});

      expect(socket.emit).toHaveBeenCalledWith('error', { code: 'VALIDATION_ERROR' });
      expect(socket.join).not.toHaveBeenCalled();
    });

    it("rejects another user's board without joining", async () => {
      boardRepo.findById.mockResolvedValue({ ...board, ownerId: 'user-2' });
      const socket = createSocket({ id: 'user-1', email: 'user@example.com' });

      await gateway.handleJoinBoard(socket, { boardId: 'board-1' });

      expect(socket.emit).toHaveBeenCalledWith('error', { code: 'FORBIDDEN' });
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('rejects a missing board without joining', async () => {
      boardRepo.findById.mockResolvedValue(null);
      const socket = createSocket({ id: 'user-1', email: 'user@example.com' });

      await gateway.handleJoinBoard(socket, { boardId: 'missing' });

      expect(socket.emit).toHaveBeenCalledWith('error', { code: 'FORBIDDEN' });
      expect(socket.join).not.toHaveBeenCalled();
    });
  });

  it('leaves the board room', async () => {
    const socket = createSocket();

    await gateway.handleLeaveBoard(socket, { boardId: 'board-1' });

    expect(socket.leave).toHaveBeenCalledWith('board:board-1');
  });

  describe('emissions', () => {
    it('broadcasts board.updated to the board room', () => {
      gateway.emitBoardUpdated({ board, actorId: 'user-1', clientId: 'tab-1' });

      expect(server.to).toHaveBeenCalledWith('board:board-1');
      expect(emit).toHaveBeenCalledWith('board.updated', {
        board,
        actorId: 'user-1',
        clientId: 'tab-1',
      });
    });

    it('broadcasts column events to the board room', () => {
      gateway.emitColumnCreated({ column, actorId: 'user-1', clientId: 'tab-1' });
      gateway.emitColumnUpdated({ column, actorId: 'user-1', clientId: 'tab-1' });
      gateway.emitColumnDeleted('board-1', { columnId: 'column-1', actorId: 'user-1' });

      expect(emit).toHaveBeenCalledWith('column.created', {
        column,
        actorId: 'user-1',
        clientId: 'tab-1',
      });
      expect(emit).toHaveBeenCalledWith('column.updated', {
        column,
        actorId: 'user-1',
        clientId: 'tab-1',
      });
      expect(emit).toHaveBeenCalledWith('column.deleted', {
        columnId: 'column-1',
        actorId: 'user-1',
      });
    });
  });
});
