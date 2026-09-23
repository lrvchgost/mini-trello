import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, type OnGatewayInit } from '@nestjs/websockets';
import type { Card, Comment } from '@min-trello/shared';
import type { Server } from 'socket.io';
import { boardRoom } from '../realtime/room.util';
import { WsAuthMiddleware } from '../realtime/ws-auth.middleware';

export interface CardEvent {
  card: Card;
  actorId: string;
  clientId?: string | null;
}

export interface CardMovedEvent {
  cardId: string;
  targetColumnId: string;
  newOrder: number;
  actorId: string;
  clientId?: string | null;
}

export interface CardDeletedEvent {
  cardId: string;
  actorId: string;
  clientId?: string | null;
}

export interface CommentCreatedEvent {
  comment: Comment;
  actorId: string;
  clientId?: string | null;
}

@WebSocketGateway()
export class CardsGateway implements OnGatewayInit {
  private readonly logger = new Logger(CardsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly wsAuth: WsAuthMiddleware) {}

  afterInit(server: Server): void {
    this.wsAuth.apply(server);
  }

  emitCardCreated(boardId: string, event: CardEvent): void {
    this.broadcast(boardId, 'card.created', event);
  }

  emitCardUpdated(boardId: string, event: CardEvent): void {
    this.broadcast(boardId, 'card.updated', event);
  }

  emitCardMoved(boardId: string, event: CardMovedEvent): void {
    this.broadcast(boardId, 'card.moved', event);
  }

  emitCardDeleted(boardId: string, event: CardDeletedEvent): void {
    this.broadcast(boardId, 'card.deleted', event);
  }

  emitCommentCreated(boardId: string, event: CommentCreatedEvent): void {
    this.broadcast(boardId, 'comment.created', event);
  }

  private broadcast(boardId: string, event: string, payload: unknown): void {
    this.server.to(boardRoom(boardId)).emit(event, payload);
  }
}
