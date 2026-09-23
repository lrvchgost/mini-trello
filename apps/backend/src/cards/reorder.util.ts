import { placeAtEnd } from '../common/order.util';

export interface CardMovePlan {
  /** Итоговый порядок id в исходной колонке (без перемещаемой карточки). */
  sourceIds: string[];
  /** Итоговый порядок id в целевой колонке (перемещаемая карточка включена). */
  targetIds: string[];
}

/**
 * Планирует порядок карточек при перемещении. Если карточка уже в целевой
 * колонке (`targetIds` её содержит) — переставляем внутри неё; иначе удаляем из
 * исходной и вставляем в целевую на позицию `targetOrder` (с зажимом в диапазон).
 */
export function planCardMove(
  sourceIds: string[],
  targetIds: string[],
  cardId: string,
  targetOrder: number,
): CardMovePlan {
  const sameColumn = targetIds.includes(cardId);
  const ordered = placeAtEnd(targetIds, cardId, targetOrder);

  return {
    sourceIds: sameColumn ? ordered : sourceIds.filter((id) => id !== cardId),
    targetIds: ordered,
  };
}
