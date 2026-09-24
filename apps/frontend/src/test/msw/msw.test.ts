import { beforeEach, describe, expect, it } from 'vitest';
import { fetchActivity } from '@/entities/activity';
import { createBoard, fetchBoard, fetchBoards } from '@/entities/board';
import { fetchCard, moveCard } from '@/entities/card';
import { fetchAssignableUsers } from '@/features/cards/api';
import { setAccessToken } from '@/shared/api/token-store';
import { db } from './data';

const BOARD_ID = 'clx000000000000000000001';
const CARD_ID = 'clx000000000000000000101';
const COLUMN_DONE = 'clx000000000000000000202';

describe('MSW handlers', () => {
  beforeEach(() => {
    setAccessToken(db.accessToken);
  });

  it('serves the paginated board list with card counts', async () => {
    const page = await fetchBoards({ page: 1, limit: 20 });

    expect(page.total).toBe(1);
    expect(page.items[0]?.id).toBe(BOARD_ID);
    expect(page.items[0]?.cardsCount).toBe(3);
  });

  it('creates a board and returns it in the list', async () => {
    const created = await createBoard({ title: 'Новая доска' });

    expect(created.title).toBe('Новая доска');
    const page = await fetchBoards({ page: 1, limit: 20 });
    expect(page.total).toBe(2);
  });

  it('serves a board with columns and cards', async () => {
    const board = await fetchBoard(BOARD_ID);

    expect(board.title).toBe('Работа');
    expect(board.columns).toHaveLength(2);
    expect(board.columns[0]?.cards[0]?.createdAt).toBeInstanceOf(Date);
  });

  it('serves card details with labels, comments and assignee', async () => {
    const card = await fetchCard(CARD_ID);

    expect(card.title).toBe('Подготовить отчёт');
    expect(card.labels.length).toBeGreaterThan(0);
    expect(card.comments?.[0]?.content).toBe('Первый комментарий');
    expect(card.assignee?.id).toBe(db.currentUser.id);
  });

  it('moves a card and echoes the target position', async () => {
    const result = await moveCard(CARD_ID, { columnId: COLUMN_DONE, order: 1 });

    expect(result).toEqual({ columnId: COLUMN_DONE, order: 1 });
  });

  it('serves board activity and assignable users', async () => {
    const activity = await fetchActivity(BOARD_ID, { page: 1, limit: 20 });
    const users = await fetchAssignableUsers();

    expect(activity.total).toBe(2);
    expect(activity.items[0]?.createdAt).toBeInstanceOf(Date);
    expect(users).toHaveLength(1);
    expect(users[0]?.email).toBe(db.credentials.email);
  });

  it('rejects requests without an access token', async () => {
    setAccessToken(null);

    await expect(fetchBoards({ page: 1, limit: 20 })).rejects.toThrow();
  });
});
