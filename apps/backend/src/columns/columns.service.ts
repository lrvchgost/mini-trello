import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Column, CreateColumnInput, UpdateColumnInput } from '@min-trello/shared';
import { ErrorCode } from '../common/errors';
import { COLUMN_REPOSITORY_TOKEN, type IColumnRepository } from './repositories/column.repository';

@Injectable()
export class ColumnsService {
  constructor(
    @Inject(COLUMN_REPOSITORY_TOKEN)
    private readonly columnRepo: IColumnRepository,
  ) {}

  create(boardId: string, input: CreateColumnInput): Promise<Column> {
    return this.columnRepo.create({ title: input.title, boardId });
  }

  async update(id: string, input: UpdateColumnInput): Promise<Column> {
    await this.ensureExists(id);
    return this.columnRepo.update(id, input);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.columnRepo.delete(id);
  }

  private async ensureExists(id: string): Promise<void> {
    const column = await this.columnRepo.findById(id);
    if (!column) {
      throw new NotFoundException({
        error: ErrorCode.COLUMN_NOT_FOUND,
        message: 'Column not found',
      });
    }
  }
}
