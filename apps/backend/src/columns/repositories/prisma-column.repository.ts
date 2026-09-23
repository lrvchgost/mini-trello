import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Column } from '@min-trello/shared';
import { isUniqueConstraintError } from '../../common/prisma-errors';
import { PrismaService } from '../../prisma/prisma.service';
import { placeAtEnd } from '../order.util';
import type { IColumnRepository } from './column.repository';

const MAX_ORDER_ATTEMPTS = 5;

@Injectable()
export class PrismaColumnRepository implements IColumnRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Column | null> {
    return this.prisma.column.findUnique({ where: { id } });
  }

  findByBoard(boardId: string): Promise<Column[]> {
    return this.prisma.column.findMany({ where: { boardId }, orderBy: { order: 'asc' } });
  }

  async create(data: { title: string; boardId: string }): Promise<Column> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const last = await tx.column.findFirst({
            where: { boardId: data.boardId },
            orderBy: { order: 'desc' },
            select: { order: true },
          });

          return tx.column.create({
            data: {
              title: data.title,
              boardId: data.boardId,
              order: last ? last.order + 1 : 0,
            },
          });
        });
      } catch (error) {
        if (isUniqueConstraintError(error) && attempt < MAX_ORDER_ATTEMPTS) {
          continue;
        }
        throw error;
      }
    }
  }

  async update(
    id: string,
    data: { title?: string; isDone?: boolean; order?: number },
  ): Promise<Column> {
    const { order, ...fields } = data;

    return this.prisma.$transaction(async (tx) => {
      if (Object.keys(fields).length > 0) {
        await tx.column.update({ where: { id }, data: fields });
      }
      if (order !== undefined) {
        await this.renumber(tx, id, order);
      }
      return tx.column.findUniqueOrThrow({ where: { id } });
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.column.delete({ where: { id } });
  }

  /**
   * Двухфазная перенормировка: сначала все колонки уходят в «хвост» (вне `0..n-1`),
   * затем получают финальные `0..n-1`. Так промежуточные апдейты не ловят
   * `@@unique([boardId, order])`.
   */
  private async renumber(
    tx: Prisma.TransactionClient,
    movingId: string,
    targetOrder: number,
  ): Promise<void> {
    const moving = await tx.column.findUniqueOrThrow({ where: { id: movingId } });
    const columns = await tx.column.findMany({
      where: { boardId: moving.boardId },
      orderBy: { order: 'asc' },
      select: { id: true },
    });

    const orderedIds = placeAtEnd(
      columns.map((column) => column.id),
      movingId,
      targetOrder,
    );

    const offset = orderedIds.length + 1;
    for (const [index, id] of orderedIds.entries()) {
      await tx.column.update({ where: { id }, data: { order: index + offset } });
    }
    for (const [index, id] of orderedIds.entries()) {
      await tx.column.update({ where: { id }, data: { order: index } });
    }
  }
}
