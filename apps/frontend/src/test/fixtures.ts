import type { BoardWithColumns, Card, ColumnWithCards } from '@min-trello/shared';

export function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'clx000000000000000000101',
    title: 'Карточка',
    description: null,
    priority: 'medium',
    deadline: null,
    order: 0,
    columnId: 'clx000000000000000000201',
    assigneeId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

export function makeColumn(overrides: Partial<ColumnWithCards> = {}): ColumnWithCards {
  return {
    id: 'clx000000000000000000201',
    title: 'В работе',
    isDone: false,
    order: 0,
    boardId: 'clx000000000000000000001',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    cards: [],
    ...overrides,
  };
}

export function makeBoard(overrides: Partial<BoardWithColumns> = {}): BoardWithColumns {
  return {
    id: 'clx000000000000000000001',
    title: 'Работа',
    ownerId: 'clx000000000000000000002',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    columns: [],
    ...overrides,
  };
}
