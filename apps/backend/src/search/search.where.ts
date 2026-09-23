import { Prisma } from '@prisma/client';
import type { SearchCardsQuery } from './repositories/search.repository';

/**
 * Собирает `where` для поиска карточек: всегда ограничен досками владельца
 * (ADR-008), плюс опциональный `boardId` и фильтры из query.
 */
export function buildCardSearchWhere(query: SearchCardsQuery): Prisma.CardWhereInput {
  const board = query.boardId
    ? { id: query.boardId, ownerId: query.ownerId }
    : { ownerId: query.ownerId };

  return {
    column: { board },
    ...(query.q
      ? {
          OR: [
            { title: { contains: query.q, mode: 'insensitive' as const } },
            { description: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(query.priority ? { priority: query.priority } : {}),
    ...(query.labelId ? { labels: { some: { labelId: query.labelId } } } : {}),
    ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
    ...(query.hasDeadline === true ? { deadline: { not: null } } : {}),
    ...(query.hasDeadline === false ? { deadline: null } : {}),
  };
}
