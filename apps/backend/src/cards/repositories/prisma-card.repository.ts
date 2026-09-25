import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Card, CardDetail, CreateCardInput, UpdateCardInput } from '@min-trello/shared';
import { isWriteConflictError } from '../../common/prisma-errors';
import { PrismaService } from '../../prisma/prisma.service';
import { planCardMove } from '../reorder.util';
import type { ICardRepository } from './card.repository';

const MOVE_RETRY_ATTEMPTS = 3;
const MOVE_RETRY_MIN_DELAY_MS = 50;
const MOVE_RETRY_MAX_DELAY_MS = 150;

function delayMoveRetry(): Promise<void> {
  const span = MOVE_RETRY_MAX_DELAY_MS - MOVE_RETRY_MIN_DELAY_MS;
  const delay = MOVE_RETRY_MIN_DELAY_MS + Math.floor(Math.random() * span);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

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

  /**
   * Перенос карточки. Параллельные переносы одних и тех же колонок сериализуются
   * advisory-локами PostgreSQL (`pg_advisory_xact_lock` по columnId, захваченным
   * в отсортированном порядке) — дедлок между двухфазными перенормировками
   * становится невозможен, конкуренты коротко ждут очереди. Остаточные конфликты
   * записи (P2034/дедлок) ретраятся ограниченное число раз; после исчерпания
   * ошибку получает сервис и отвечает 409.
   */
  async move(cardId: string, targetColumnId: string, targetOrder: number): Promise<Card> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MOVE_RETRY_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (tx) =>
          this.moveOnce(tx, cardId, targetColumnId, targetOrder),
        );
      } catch (error) {
        lastError = error;
        if (!isWriteConflictError(error) || attempt === MOVE_RETRY_ATTEMPTS) {
          throw error;
        }
        await delayMoveRetry();
      }
    }

    throw lastError;
  }

  private async moveOnce(
    tx: Prisma.TransactionClient,
    cardId: string,
    targetColumnId: string,
    targetOrder: number,
  ): Promise<Card> {
    const locked = new Set<string>();
    const initial = await tx.card.findUniqueOrThrow({ where: { id: cardId } });
    if (initial.columnId !== targetColumnId) {
      locked.add(initial.columnId);
    }
    locked.add(targetColumnId);
    for (const columnId of [...locked].sort()) {
      await this.lockColumn(tx, columnId);
    }

    // Перечитываем под локами: конкурентный перенос мог увести карточку
    // в колонку, лок на которую ещё не взят, — дозахватываем (повторный вызов
    // для уже взятого ключа реентерабелен) и работаем со свежими данными.
    const card = await tx.card.findUniqueOrThrow({ where: { id: cardId } });
    if (!locked.has(card.columnId)) {
      await this.lockColumn(tx, card.columnId);
      locked.add(card.columnId);
    }

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
  }

  setAssignee(id: string, assigneeId: string | null): Promise<Card> {
    return this.prisma.card.update({ where: { id }, data: { assigneeId } });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.card.delete({ where: { id } });
  }

  /**
   * Транзакционный advisory-лок по колонке. `pg_advisory_xact_lock` возвращает
   * `void`, который Prisma не может десериализовать, поэтому результат приводится
   * к int через `IS NULL`.
   */
  private async lockColumn(tx: Prisma.TransactionClient, columnId: string): Promise<void> {
    await tx.$queryRaw`
      SELECT (pg_advisory_xact_lock(hashtextextended(${columnId}, 0)) IS NULL)::int AS locked
    `;
  }

  private orderedIds(tx: Prisma.TransactionClient, columnId: string): Promise<string[]> {
    return tx.card
      .findMany({ where: { columnId }, orderBy: { order: 'asc' }, select: { id: true } })
      .then((cards) => cards.map((card) => card.id));
  }

  /**
   * Двухфазная перенормировка: сначала карточки уходят в «хвост» (вне `0..n-1`),
   * затем получают финальные `0..n-1`. Так промежуточные апдейты не сталкиваются
   * по `order` при переходе карточки между колонками (и это останется безопасным,
   * если у `Card` появится `@@unique([columnId, order])`). Каждая фаза — один
   * bulk-апдейт: меньше round-trips и короче удержание блокировок строк.
   */
  private async applyOrder(tx: Prisma.TransactionClient, ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await this.shiftOrders(tx, ids, ids.length + 1);
    await this.shiftOrders(tx, ids, 0);
  }

  private async shiftOrders(
    tx: Prisma.TransactionClient,
    ids: string[],
    offset: number,
  ): Promise<void> {
    const mapping = Prisma.join(
      ids.map((id, index) => Prisma.sql`(${id}::text, ${index + offset}::int)`),
    );
    await tx.$queryRaw`
      UPDATE "Card" AS card
      SET "order" = mapping.order
      FROM (VALUES ${mapping}) AS mapping(id, "order")
      WHERE card.id = mapping.id
    `;
  }
}
