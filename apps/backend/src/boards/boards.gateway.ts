import { Inject, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayDisconnect,
  type OnGatewayInit,
} from '@nestjs/websockets';
import type { Board, Column } from '@min-trello/shared';
import type { Server, Socket } from 'socket.io';
import { boardRoom } from '../realtime/room.util';
import { WsAuthMiddleware, type WsSocketData } from '../realtime/ws-auth.middleware';
import { BOARD_REPOSITORY_TOKEN, type IBoardRepository } from './repositories/board.repository';

export interface JoinBoardPayload {
  boardId?: string;
  clientId?: string;
}

export interface BoardUpdatedEvent {
  board: Board;
  actorId: string;
  clientId?: string | null;
}

export interface ColumnEvent {
  column: Column;
  actorId: string;
  clientId?: string | null;
}

export interface ColumnDeletedEvent {
  columnId: string;
  actorId: string;
  clientId?: string | null;
}

@WebSocketGateway()
export class BoardsGateway implements OnGatewayInit, OnGatewayDisconnect {
  private readonly logger = new Logger(BoardsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(BOARD_REPOSITORY_TOKEN)
    private readonly boardRepo: IBoardRepository,
    private readonly wsAuth: WsAuthMiddleware,
  ) {}

  afterInit(server: Server): void {
    this.wsAuth.apply(server);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Socket ${client.id} disconnected`);
  }

  @SubscribeMessage('joinBoard')
  async handleJoinBoard(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: JoinBoardPayload,
  ): Promise<{ joined: boolean } | void> {
    const data = socket.data as WsSocketData;
    const user = data.user;
    if (!user) {
      socket.emit('error', { code: 'UNAUTHORIZED' });
      return;
    }

    const boardId = payload?.boardId;
    if (!boardId) {
      socket.emit('error', { code: 'VALIDATION_ERROR' });
      return;
    }

    const board = await this.boardRepo.findById(boardId);
    if (!board || board.ownerId !== user.id) {
      socket.emit('error', { code: 'FORBIDDEN' });
      return;
    }

    data.clientId = payload.clientId;
    await socket.join(boardRoom(boardId));
    return { joined: true };
  }

  @SubscribeMessage('leaveBoard')
  async handleLeaveBoard(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { boardId?: string },
  ): Promise<void> {
    if (payload?.boardId) {
      await socket.leave(boardRoom(payload.boardId));
    }
  }

  emitBoardUpdated(event: BoardUpdatedEvent): void {
    this.broadcast(boardRoom(event.board.id), 'board.updated', event);
  }

  emitColumnCreated(event: ColumnEvent): void {
    this.broadcast(boardRoom(event.column.boardId), 'column.created', event);
  }

  emitColumnUpdated(event: ColumnEvent): void {
    this.broadcast(boardRoom(event.column.boardId), 'column.updated', event);
  }

  emitColumnDeleted(boardId: string, event: ColumnDeletedEvent): void {
    this.broadcast(boardRoom(boardId), 'column.deleted', event);
  }

  private broadcast(room: string, event: string, payload: unknown): void {
    this.server.to(room).emit(event, payload);
  }
}
