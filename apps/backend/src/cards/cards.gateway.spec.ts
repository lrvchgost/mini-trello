import type { Card, Comment } from '@min-trello/shared';
import type { Server } from 'socket.io';
import type { WsAuthMiddleware } from '../realtime/ws-auth.middleware';
import { CardsGateway } from './cards.gateway';

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

const comment: Comment = {
  id: 'comment-1',
  content: 'ping',
  cardId: 'card-1',
  authorId: 'user-1',
  createdAt: new Date('2026-01-02T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

describe('CardsGateway', () => {
  let gateway: CardsGateway;
  let wsAuth: jest.Mocked<WsAuthMiddleware>;
  let emit: jest.Mock;
  let server: Server;

  beforeEach(() => {
    wsAuth = { apply: jest.fn() } as unknown as jest.Mocked<WsAuthMiddleware>;
    emit = jest.fn();
    server = { to: jest.fn().mockReturnValue({ emit }) } as unknown as Server;

    gateway = new CardsGateway(wsAuth);
    gateway.server = server;
  });

  it('applies the ws auth middleware on init', () => {
    gateway.afterInit(server);
    expect(wsAuth.apply).toHaveBeenCalledWith(server);
  });

  it('broadcasts card events to the board room', () => {
    gateway.emitCardCreated('board-1', { card, actorId: 'user-1', clientId: 'tab-1' });
    gateway.emitCardUpdated('board-1', { card, actorId: 'user-1' });
    gateway.emitCardMoved('board-1', {
      cardId: 'card-1',
      targetColumnId: 'column-2',
      newOrder: 3,
      actorId: 'user-1',
      clientId: 'tab-1',
    });
    gateway.emitCardDeleted('board-1', { cardId: 'card-1', actorId: 'user-1' });

    expect(server.to).toHaveBeenCalledWith('board:board-1');
    expect(emit).toHaveBeenCalledWith('card.created', {
      card,
      actorId: 'user-1',
      clientId: 'tab-1',
    });
    expect(emit).toHaveBeenCalledWith('card.updated', { card, actorId: 'user-1' });
    expect(emit).toHaveBeenCalledWith('card.moved', {
      cardId: 'card-1',
      targetColumnId: 'column-2',
      newOrder: 3,
      actorId: 'user-1',
      clientId: 'tab-1',
    });
    expect(emit).toHaveBeenCalledWith('card.deleted', { cardId: 'card-1', actorId: 'user-1' });
  });

  it('broadcasts comment.created to the board room', () => {
    gateway.emitCommentCreated('board-1', { comment, actorId: 'user-1', clientId: 'tab-1' });

    expect(emit).toHaveBeenCalledWith('comment.created', {
      comment,
      actorId: 'user-1',
      clientId: 'tab-1',
    });
  });
});
