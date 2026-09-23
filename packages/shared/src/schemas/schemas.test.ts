import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  activityLogSchema,
  addLabelSchema,
  assignCardSchema,
  boardWithColumnsSchema,
  createBoardSchema,
  createCardSchema,
  createColumnSchema,
  createCommentSchema,
  createLabelSchema,
  loginSchema,
  moveCardSchema,
  paginated,
  paginationQuerySchema,
  registerSchema,
  updateCardSchema,
} from './index';

const CUID = 'clh3q2x1z0000abcd1234efgh';
const CUID2 = 'clh3q2x1z0001abcd1234efgh';

describe('auth schemas', () => {
  it('accepts a valid register payload', () => {
    const result = registerSchema.safeParse({
      email: 'alice@example.com',
      name: 'Alice',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email and a short password', () => {
    expect(
      registerSchema.safeParse({ email: 'nope', name: 'A', password: 'password123' }).success,
    ).toBe(false);
    expect(registerSchema.safeParse({ email: 'a@b.c', name: 'A', password: 'short' }).success).toBe(
      false,
    );
  });

  it('accepts a valid login payload', () => {
    expect(loginSchema.safeParse({ email: 'alice@example.com', password: 'x' }).success).toBe(true);
  });
});

describe('board / column / card schemas', () => {
  it('defaults card priority to medium', () => {
    const parsed = createCardSchema.parse({ title: 'Task' });
    expect(parsed.priority).toBe('medium');
  });

  it('rejects an empty card title', () => {
    expect(createCardSchema.safeParse({ title: '' }).success).toBe(false);
  });

  it('coerces expectedUpdatedAt into a Date', () => {
    const parsed = updateCardSchema.parse({
      title: 'New',
      expectedUpdatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(parsed.expectedUpdatedAt).toBeInstanceOf(Date);
  });

  it('validates move payload', () => {
    expect(moveCardSchema.safeParse({ columnId: CUID, order: 0 }).success).toBe(true);
    expect(moveCardSchema.safeParse({ columnId: CUID, order: -1 }).success).toBe(false);
    expect(moveCardSchema.safeParse({ columnId: 'not-cuid', order: 0 }).success).toBe(false);
  });

  it('allows null or a valid cuid assignee', () => {
    expect(assignCardSchema.safeParse({ assigneeId: null }).success).toBe(true);
    expect(assignCardSchema.safeParse({ assigneeId: CUID }).success).toBe(true);
    expect(assignCardSchema.safeParse({ assigneeId: 'nope' }).success).toBe(false);
  });

  it('validates board and column creation', () => {
    expect(createBoardSchema.safeParse({ title: 'My Board' }).success).toBe(true);
    expect(createBoardSchema.safeParse({ title: '' }).success).toBe(false);
    expect(createColumnSchema.safeParse({ title: 'To Do' }).success).toBe(true);
    expect(createColumnSchema.safeParse({}).success).toBe(false);
  });

  it('defaults label color', () => {
    expect(createLabelSchema.parse({ name: 'bug' }).color).toBe('#6b7280');
    expect(createLabelSchema.safeParse({ name: 'bug', color: 'red' }).success).toBe(false);
  });

  it('validates a card-label link payload', () => {
    expect(addLabelSchema.safeParse({ labelId: CUID }).success).toBe(true);
    expect(addLabelSchema.safeParse({ labelId: 'not-cuid' }).success).toBe(false);
    expect(addLabelSchema.safeParse({}).success).toBe(false);
  });

  it('validates comment content', () => {
    expect(createCommentSchema.safeParse({ content: 'ping' }).success).toBe(true);
    expect(createCommentSchema.safeParse({ content: '' }).success).toBe(false);
  });

  it('parses a board with nested columns and cards', () => {
    const payload = {
      id: CUID,
      title: 'Board',
      ownerId: CUID2,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      columns: [
        {
          id: CUID2,
          title: 'To Do',
          isDone: false,
          order: 0,
          boardId: CUID,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          cards: [],
        },
      ],
    };

    expect(boardWithColumnsSchema.safeParse(payload).success).toBe(true);
  });
});

describe('activity schema', () => {
  it('parses an activity log entry', () => {
    const parsed = activityLogSchema.safeParse({
      id: CUID,
      action: 'card.moved',
      payload: { cardId: CUID2, targetColumnId: CUID },
      boardId: CUID,
      cardId: CUID2,
      userId: CUID2,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(parsed.success).toBe(true);
  });
});

describe('pagination', () => {
  it('applies defaults and coerces query strings', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(paginationQuerySchema.parse({ page: '2', limit: '50' })).toEqual({ page: 2, limit: 50 });
  });

  it('rejects a limit above the maximum', () => {
    expect(paginationQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it('builds a paginated schema around an item schema', () => {
    const schema = paginated(z.object({ id: z.string() }));
    const result = schema.safeParse({ items: [{ id: '1' }], total: 1, page: 1, limit: 20 });
    expect(result.success).toBe(true);
  });
});
