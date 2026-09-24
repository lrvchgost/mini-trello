import { http, HttpResponse } from 'msw';
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  type Board,
  type BoardListItem,
  type Card,
} from '@min-trello/shared';
import { env } from '@/shared/config/env';
import { commentFor, db, labelsForBoard } from './data';

const base = env.VITE_API_URL.replace(/\/+$/, '');

const url = (path: string) => `${base}${path}`;

function error(status: number, errorCode: string, message: string) {
  return HttpResponse.json({ errorCode, message }, { status });
}

const unauthorized = () => error(401, 'UNAUTHORIZED', 'Unauthorized');

function isAuthenticated(request: Request): boolean {
  return request.headers.get('authorization') === `Bearer ${db.accessToken}`;
}

function paginate<T>(items: T[], page: number, limit: number) {
  const start = (page - 1) * limit;
  return { items: items.slice(start, start + limit), total: items.length, page, limit };
}

function readPagination(request: Request): { page: number; limit: number } {
  const params = new URL(request.url).searchParams;
  return {
    page: Number(params.get('page') ?? DEFAULT_PAGE),
    limit: Number(params.get('limit') ?? DEFAULT_LIMIT),
  };
}

function findCard(id: string) {
  for (const board of db.boards) {
    for (const column of board.columns) {
      const card = column.cards.find((candidate) => candidate.id === id);
      if (card) {
        return { board, column, card };
      }
    }
  }
  return null;
}

export const handlers = [
  // --- auth -----------------------------------------------------------------
  http.post(url('/auth/login'), async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (body.email !== db.credentials.email || body.password !== db.credentials.password) {
      return error(401, 'UNAUTHORIZED', 'Invalid credentials');
    }
    return HttpResponse.json({ user: db.currentUser, accessToken: db.accessToken });
  }),

  http.post(url('/auth/register'), async ({ request }) => {
    const body = (await request.json()) as { email: string; name: string };
    db.currentUser = { ...db.currentUser, email: body.email, name: body.name };
    db.users = [{ ...db.currentUser }];
    return HttpResponse.json(
      { user: db.currentUser, accessToken: db.accessToken },
      { status: 201 },
    );
  }),

  http.get(url('/auth/me'), ({ request }) =>
    isAuthenticated(request) ? HttpResponse.json(db.currentUser) : unauthorized(),
  ),

  http.post(url('/auth/refresh'), ({ request }) =>
    request.headers.get('cookie')?.includes('refresh_token')
      ? HttpResponse.json({ accessToken: db.accessToken })
      : unauthorized(),
  ),

  http.post(url('/auth/logout'), () => new HttpResponse(null, { status: 204 })),

  // --- users ----------------------------------------------------------------
  http.get(url('/users'), ({ request }) =>
    isAuthenticated(request) ? HttpResponse.json(db.users) : unauthorized(),
  ),

  http.patch(url('/users/me'), async ({ request }) => {
    if (!isAuthenticated(request)) {
      return unauthorized();
    }
    const body = (await request.json()) as { name?: string };
    db.currentUser = { ...db.currentUser, name: body.name ?? db.currentUser.name };
    db.users = [{ ...db.currentUser }];
    return HttpResponse.json(db.currentUser);
  }),

  http.patch(url('/users/me/password'), ({ request }) =>
    isAuthenticated(request) ? new HttpResponse(null, { status: 204 }) : unauthorized(),
  ),

  // --- boards ---------------------------------------------------------------
  http.get(url('/boards'), ({ request }) => {
    if (!isAuthenticated(request)) {
      return unauthorized();
    }
    const { page, limit } = readPagination(request);
    const items: BoardListItem[] = db.boards.map((board) => ({
      id: board.id,
      title: board.title,
      ownerId: board.ownerId,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
      cardsCount: board.columns.reduce((total, column) => total + column.cards.length, 0),
    }));
    return HttpResponse.json(paginate(items, page, limit));
  }),

  http.post(url('/boards'), async ({ request }) => {
    if (!isAuthenticated(request)) {
      return unauthorized();
    }
    const body = (await request.json()) as { title: string };
    const board: Board = {
      id: `clx00000000000000010000${db.boards.length + 1}`,
      title: body.title,
      ownerId: db.currentUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.boards = [...db.boards, { ...board, columns: [] }];
    return HttpResponse.json(board, { status: 201 });
  }),

  http.get(url('/boards/:id'), ({ request, params }) => {
    if (!isAuthenticated(request)) {
      return unauthorized();
    }
    const board = db.boards.find((candidate) => candidate.id === params.id);
    return board ? HttpResponse.json(board) : error(404, 'BOARD_NOT_FOUND', 'Board not found');
  }),

  http.get(url('/boards/:id/labels'), ({ request, params }) => {
    if (!isAuthenticated(request)) {
      return unauthorized();
    }
    return HttpResponse.json(labelsForBoard(db, String(params.id)));
  }),

  http.get(url('/boards/:id/activity'), ({ request, params }) => {
    if (!isAuthenticated(request)) {
      return unauthorized();
    }
    const { page, limit } = readPagination(request);
    const items = db.activity.filter((entry) => entry.boardId === params.id);
    return HttpResponse.json(paginate(items, page, limit));
  }),

  // --- columns / cards ------------------------------------------------------
  http.post(url('/columns/:columnId/cards'), async ({ request, params }) => {
    if (!isAuthenticated(request)) {
      return unauthorized();
    }
    const board = db.boards.find((candidate) =>
      candidate.columns.some((column) => column.id === params.columnId),
    );
    const column = board?.columns.find((candidate) => candidate.id === params.columnId);
    if (!board || !column) {
      return error(404, 'COLUMN_NOT_FOUND', 'Column not found');
    }
    const body = (await request.json()) as { title: string; priority?: Card['priority'] };
    const card: Card = {
      id: `clx00000000000000020000${column.cards.length + 1}${Date.now()}`,
      title: body.title,
      description: null,
      priority: body.priority ?? 'medium',
      deadline: null,
      order: column.cards.length,
      columnId: column.id,
      assigneeId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    column.cards = [...column.cards, card];
    return HttpResponse.json(card, { status: 201 });
  }),

  http.get(url('/cards/:id'), ({ request, params }) => {
    if (!isAuthenticated(request)) {
      return unauthorized();
    }
    const found = findCard(String(params.id));
    if (!found) {
      return error(404, 'CARD_NOT_FOUND', 'Card not found');
    }
    return HttpResponse.json({
      ...found.card,
      assignee: found.card.assigneeId ? db.currentUser : null,
      labels: labelsForBoard(db, found.board.id),
      comments: [commentFor(found.card.id)],
    });
  }),

  http.patch(url('/cards/:id/move'), async ({ request, params }) => {
    if (!isAuthenticated(request)) {
      return unauthorized();
    }
    const found = findCard(String(params.id));
    if (!found) {
      return error(404, 'CARD_NOT_FOUND', 'Card not found');
    }
    const body = (await request.json()) as { columnId: string; order: number };
    return HttpResponse.json({ columnId: body.columnId, order: body.order });
  }),

  http.patch(url('/cards/:id/assignee'), async ({ request, params }) => {
    if (!isAuthenticated(request)) {
      return unauthorized();
    }
    const found = findCard(String(params.id));
    if (!found) {
      return error(404, 'CARD_NOT_FOUND', 'Card not found');
    }
    const body = (await request.json()) as { assigneeId: string | null };
    found.card = { ...found.card, assigneeId: body.assigneeId, updatedAt: new Date() };
    return HttpResponse.json(found.card);
  }),

  http.patch(url('/cards/:id'), async ({ request, params }) => {
    if (!isAuthenticated(request)) {
      return unauthorized();
    }
    const found = findCard(String(params.id));
    if (!found) {
      return error(404, 'CARD_NOT_FOUND', 'Card not found');
    }
    const body = (await request.json()) as Partial<Card>;
    found.card = { ...found.card, ...body, updatedAt: new Date() };
    return HttpResponse.json(found.card);
  }),

  http.delete(url('/cards/:id'), ({ request }) =>
    isAuthenticated(request) ? new HttpResponse(null, { status: 204 }) : unauthorized(),
  ),
];
