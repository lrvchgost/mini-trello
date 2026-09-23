import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Card, CardDetail, CreateCardInput, UpdateCardInput } from '@min-trello/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { planCardMove } from '../reorder.util';
import type { ICardRepository } from './card.repository';

const assigneeSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class PrismaCardRepository implements ICardRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Card | null> {
    return this.prisma.card.findUnique({ where: { id } });
  }

  async findDetailById(id: string): Promise<CardDetail | null> {
    const card = await this.prisma.card.findUnique({
      where: { id },
      include: {
        assignee: { select: assigneeSelect },
        labels: { include: { label: true } },
      },
    });

    if (!card) {
      return null;
    }

    const { labels, ...rest } = card;
    return { ...rest, labels: labels.map((entry) => entry.label) };
  }

  findManyByColumn(columnId: string): Promise<Card[]> {
    return this.prisma.card.findMany({ where: { columnId }, orderBy: { order: 'asc' } });
  }

  create(data: CreateCardInput & { columnId: string }): Promise<Card> {
    return this.prisma.$transaction(async (tx) => {
      const last = await tx.card.findFirst({
        where: { columnId: data.columnId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });

      return tx.card.create({
        data: { ...data, order: last ? last.order + 1 : 0 },
      });
    });
  }

  async update(id: string, data: UpdateCardInput): Promise<Card | null> {
    const { expectedUpdatedAt, ...fields } = data;

    if (!expectedUpdatedAt) {
      return this.prisma.card.update({ where: { id }, data: fields });
    }

    if (Object.keys(fields).length === 0) {
      const current = await this.prisma.card.findUnique({ where: { id } });
      return current && current.updatedAt.getTime() === expectedUpdatedAt.getTime()
        ? current
        : null;
    }

    const result = await this.prisma.card.updateMany({
      where: { id, updatedAt: expectedUpdatedAt },
      data: fields,
    });

    if (result.count === 0) {
      return null;
    }

    return this.prisma.card.findUniqueOrThrow({ where: { id } });
  }

  move(cardId: string, targetColumnId: string, targetOrder: number): Promise<Card> {
    return this.prisma.$transaction(async (tx) => {
      const card = await tx.card.findUniqueOrThrow({ where: { id: cardId } });
      const fromColumnId = card.columnId;

      const targetIds = await this.orderedIds(tx, targetColumnId);
      const sourceIds =
        fromColumnId === targetColumnId ? targetIds : await this.orderedIds(tx, fromColumnId);

      const plan = planCardMove(sourceIds, targetIds, cardId, targetOrder);

      if (fromColumnId !== targetColumnId) {
        await tx.card.update({ where: { id: cardId }, data: { columnId: targetColumnId } });
        await this.applyOrder(tx, plan.sourceIds);
      }
      await this.applyOrder(tx, plan.targetIds);

      return tx.card.findUniqueOrThrow({ where: { id: cardId } });
    });
  }

  setAssignee(id: string, assigneeId: string | null): Promise<Card> {
    return this.prisma.card.update({ where: { id }, data: { assigneeId } });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.card.delete({ where: { id } });
  }

  private orderedIds(tx: Prisma.TransactionClient, columnId: string): Promise<string[]> {
    return tx.card
      .findMany({ where: { columnId }, orderBy: { order: 'asc' }, select: { id: true } })
      .then((cards) => cards.map((card) => card.id));
  }

  /**
   * Двухфазная перенормировка: сначала карточки уходят в «хвост» (вне `0..n-1`),
   * затем получают финальные `0..n-1`. Так промежуточные апдейты не сталкиваются
   * по `order` при переходе карточки между колонками.
   */
  private async applyOrder(tx: Prisma.TransactionClient, ids: string[]): Promise<void> {
    const offset = ids.length + 1;
    for (const [index, id] of ids.entries()) {
      await tx.card.update({ where: { id }, data: { order: index + offset } });
    }
    for (const [index, id] of ids.entries()) {
      await tx.card.update({ where: { id }, data: { order: index } });
    }
  }
}
