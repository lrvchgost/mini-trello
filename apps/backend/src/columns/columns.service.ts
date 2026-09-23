import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Column, CreateColumnInput, UpdateColumnInput } from '@min-trello/shared';
import { BoardsGateway } from '../boards/boards.gateway';
import { ErrorCode } from '../common/errors';
import { COLUMN_REPOSITORY_TOKEN, type IColumnRepository } from './repositories/column.repository';

@Injectable()
export class ColumnsService {
  constructor(
    @Inject(COLUMN_REPOSITORY_TOKEN)
    private readonly columnRepo: IColumnRepository,
    private readonly boardsGateway: BoardsGateway,
  ) {}

  async create(
    boardId: string,
    input: CreateColumnInput,
    actorId: string,
    clientId?: string | null,
  ): Promise<Column> {
    const column = await this.columnRepo.create({ title: input.title, boardId });
    this.boardsGateway.emitColumnCreated({ column, actorId, clientId });
    return column;
  }

  async update(
    id: string,
    input: UpdateColumnInput,
    actorId: string,
    clientId?: string | null,
  ): Promise<Column> {
    await this.ensureExists(id);
    const column = await this.columnRepo.update(id, input);
    this.boardsGateway.emitColumnUpdated({ column, actorId, clientId });
    return column;
  }

  async remove(id: string, actorId: string, clientId?: string | null): Promise<void> {
    const existing = await this.ensureExists(id);
    await this.columnRepo.delete(id);
    this.boardsGateway.emitColumnDeleted(existing.boardId, { columnId: id, actorId, clientId });
  }

  private async ensureExists(id: string): Promise<Column> {
    const column = await this.columnRepo.findById(id);
    if (!column) {
      throw new NotFoundException({
        error: ErrorCode.COLUMN_NOT_FOUND,
        message: 'Column not found',
      });
    }
    return column;
  }
}
