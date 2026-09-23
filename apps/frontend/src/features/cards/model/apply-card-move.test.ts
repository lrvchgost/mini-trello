import { describe, expect, it } from 'vitest';
import type { BoardWithColumns } from '@min-trello/shared';
import { makeBoard, makeCard, makeColumn } from '@/test/fixtures';
import { applyCardMove } from './apply-card-move';

const boardId = 'clx000000000000000000001';
const colA = 'clx000000000000000000201';
const colB = 'clx000000000000000000202';

function boardFixture(): BoardWithColumns {
  return makeBoard({
    id: boardId,
    columns: [
      makeColumn({
        id: colA,
        order: 0,
        cards: [
          makeCard({ id: 'card1', columnId: colA, order: 0 }),
          makeCard({ id: 'card2', columnId: colA, order: 1 }),
          makeCard({ id: 'card3', columnId: colA, order: 2 }),
        ],
      }),
      makeColumn({
        id: colB,
        order: 1,
        cards: [makeCard({ id: 'card4', columnId: colB, order: 0 })],
      }),
    ],
  });
}

function column(board: BoardWithColumns, id: string) {
  return board.columns.find((item) => item.id === id)!;
}

describe('applyCardMove', () => {
  it('reorders cards inside the same column and reindexes order from 0', () => {
    const next = applyCardMove(boardFixture(), 'card3', colA, 0);

    expect(column(next, colA).cards.map((card) => card.id)).toEqual(['card3', 'card1', 'card2']);
    expect(column(next, colA).cards.map((card) => card.order)).toEqual([0, 1, 2]);
  });

  it('moves a card to another column and reindexes both columns', () => {
    const next = applyCardMove(boardFixture(), 'card1', colB, 1);

    expect(column(next, colA).cards.map((card) => card.id)).toEqual(['card2', 'card3']);
    expect(column(next, colA).cards.map((card) => card.order)).toEqual([0, 1]);
    expect(column(next, colB).cards.map((card) => card.id)).toEqual(['card4', 'card1']);
    expect(column(next, colB).cards.map((card) => card.order)).toEqual([0, 1]);
    expect(column(next, colB).cards[1]?.columnId).toBe(colB);
  });

  it('returns the same board when the card or target column is unknown', () => {
    const board = boardFixture();

    expect(applyCardMove(board, 'missing', colA, 0)).toBe(board);
    expect(applyCardMove(board, 'card1', 'missing', 0)).toBe(board);
  });
});
