import type { BoardWithColumns, Card } from '@min-trello/shared';
import { byOrder } from '@/shared/lib/order';

function reindex(cards: Card[]): Card[] {
  return cards.map((card, index) => (card.order === index ? card : { ...card, order: index }));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/**
 * Applies a card move optimistically to a cached board snapshot.
 * Keeps untouched columns and cards by reference (so memoized components skip
 * re-rendering) and re-indexes `order` from 0 in the affected columns.
 * Returns the original board untouched if the card or target column is missing.
 */
export function applyCardMove(
  board: BoardWithColumns,
  cardId: string,
  targetColumnId: string,
  targetIndex: number,
): BoardWithColumns {
  const source = board.columns.find((column) => column.cards.some((card) => card.id === cardId));
  const target = board.columns.find((column) => column.id === targetColumnId);
  if (!source || !target) {
    return board;
  }

  const sourceCards = [...source.cards].sort(byOrder);
  const fromIndex = sourceCards.findIndex((card) => card.id === cardId);
  const movedCard = sourceCards[fromIndex];
  if (!movedCard) {
    return board;
  }

  const remaining = sourceCards.filter((card) => card.id !== cardId);
  const moved: Card = { ...movedCard, columnId: targetColumnId };

  const isSameColumn = source.id === target.id;
  const baseTargetCards = isSameColumn ? remaining : [...target.cards].sort(byOrder);
  const insertAt = clamp(targetIndex, 0, baseTargetCards.length);
  const nextTargetCards = reindex([
    ...baseTargetCards.slice(0, insertAt),
    moved,
    ...baseTargetCards.slice(insertAt),
  ]);

  if (isSameColumn) {
    const columns = board.columns.map((column) =>
      column.id === source.id ? { ...column, cards: nextTargetCards } : column,
    );
    return { ...board, columns };
  }

  const nextSourceCards = reindex(remaining);
  const columns = board.columns.map((column) => {
    if (column.id === source.id) {
      return { ...column, cards: nextSourceCards };
    }
    if (column.id === target.id) {
      return { ...column, cards: nextTargetCards };
    }
    return column;
  });
  return { ...board, columns };
}
