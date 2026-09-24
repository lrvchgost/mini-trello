import type { ActivityLog, BoardWithColumns, Comment, Label, User } from '@min-trello/shared';

export interface MswCredentials {
  email: string;
  password: string;
}

export interface MswDb {
  accessToken: string;
  credentials: MswCredentials;
  currentUser: User;
  users: User[];
  labels: Label[];
  boards: BoardWithColumns[];
  activity: ActivityLog[];
}

const ACCESS_TOKEN = 'msw-access-token';

const ALICE: User = {
  id: 'clx0000000000000000000001',
  email: 'alice@example.com',
  name: 'Alice',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const BOARD = 'clx000000000000000000001';
const COLUMN_TODO = 'clx000000000000000000201';
const COLUMN_DONE = 'clx000000000000000000202';

/** Deep, deterministic fixture copy so every test starts from a clean state. */
export function createDb(): MswDb {
  return {
    accessToken: ACCESS_TOKEN,
    credentials: { email: ALICE.email, password: 'password123' },
    currentUser: { ...ALICE },
    users: [{ ...ALICE }],
    labels: [{ id: 'clx000000000000000000401', name: 'Срочно', color: '#ef4444', boardId: BOARD }],
    boards: [
      {
        id: BOARD,
        title: 'Работа',
        ownerId: ALICE.id,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        columns: [
          {
            id: COLUMN_TODO,
            title: 'К выполнению',
            isDone: false,
            order: 0,
            boardId: BOARD,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            cards: [
              {
                id: 'clx000000000000000000101',
                title: 'Подготовить отчёт',
                description: 'Описание отчёта',
                priority: 'high',
                deadline: new Date('2026-12-31T00:00:00.000Z'),
                order: 0,
                columnId: COLUMN_TODO,
                assigneeId: ALICE.id,
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
              },
              {
                id: 'clx000000000000000000102',
                title: 'Согласовать макет',
                description: null,
                priority: 'medium',
                deadline: null,
                order: 1,
                columnId: COLUMN_TODO,
                assigneeId: null,
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
              },
            ],
          },
          {
            id: COLUMN_DONE,
            title: 'Готово',
            isDone: true,
            order: 1,
            boardId: BOARD,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            cards: [
              {
                id: 'clx000000000000000000103',
                title: 'Собрать требования',
                description: null,
                priority: 'low',
                deadline: null,
                order: 0,
                columnId: COLUMN_DONE,
                assigneeId: ALICE.id,
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
              },
            ],
          },
        ],
      },
    ],
    activity: [
      {
        id: 'clx000000000000000000501',
        action: 'board.created',
        payload: { title: 'Работа' },
        boardId: BOARD,
        cardId: null,
        userId: ALICE.id,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 'clx000000000000000000502',
        action: 'card.created',
        payload: { title: 'Подготовить отчёт' },
        boardId: BOARD,
        cardId: 'clx000000000000000000101',
        userId: ALICE.id,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ],
  };
}

export const labelsForBoard = (db: MswDb, boardId: string): Label[] =>
  db.labels.filter((label) => label.boardId === boardId);

export const commentFor = (cardId: string): Comment => ({
  id: 'clx000000000000000000601',
  content: 'Первый комментарий',
  cardId,
  authorId: ALICE.id,
  author: { ...ALICE },
  createdAt: new Date('2026-01-02T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
});

export let db: MswDb = createDb();

export function resetDb(): void {
  db = createDb();
}
