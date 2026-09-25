import request from 'supertest';
import {
  createBoard,
  createCard,
  createColumn,
  createTestApp,
  registerUser,
  truncateAllTables,
  type CardDto,
  type TestApp,
  type TestSession,
} from './utils';

interface BoardColumn {
  id: string;
  cards: Array<{ id: string; order: number }>;
}

describe('Cards (e2e)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  beforeEach(async () => {
    await truncateAllTables(testApp.prisma);
  });

  afterAll(async () => {
    await testApp.close();
  });

  async function boardColumns(session: TestSession, boardId: string): Promise<BoardColumn[]> {
    const response = await request(testApp.app.getHttpServer())
      .get(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${session.token}`)
      .expect(200);

    return (response.body.columns as BoardColumn[]).map((column) => ({
      id: column.id,
      cards: column.cards.map((card) => ({ id: card.id, order: card.order })),
    }));
  }

  it('rejects requests without an access token', async () => {
    await request(testApp.app.getHttpServer()).get('/api/cards/x').expect(401);
  });

  it('creates cards with sequential order 0, 1', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const column = await createColumn(testApp.app, alice, board.id, 'To Do');

    const first = await createCard(testApp.app, alice, column.id, 'First');
    const second = await createCard(testApp.app, alice, column.id, 'Second');

    expect([first.order, second.order]).toEqual([0, 1]);
  });

  it('returns a card with assignee and labels', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const column = await createColumn(testApp.app, alice, board.id, 'To Do');
    const card = await createCard(testApp.app, alice, column.id, 'First');

    const response = await request(testApp.app.getHttpServer())
      .get(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: card.id,
      title: 'First',
      priority: 'medium',
      assignee: null,
      labels: [],
    });
  });

  it('updates a card', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const column = await createColumn(testApp.app, alice, board.id, 'To Do');
    const card = await createCard(testApp.app, alice, column.id, 'First');

    const response = await request(testApp.app.getHttpServer())
      .patch(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ title: 'Renamed', priority: 'high', description: 'Details' })
      .expect(200);

    expect(response.body).toMatchObject({
      id: card.id,
      title: 'Renamed',
      priority: 'high',
      description: 'Details',
    });
  });

  it('rejects a stale expectedUpdatedAt with 409', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const column = await createColumn(testApp.app, alice, board.id, 'To Do');
    const card = await createCard(testApp.app, alice, column.id, 'First');

    const detail = await request(testApp.app.getHttpServer())
      .get(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    await new Promise((resolve) => setTimeout(resolve, 5));

    await request(testApp.app.getHttpServer())
      .patch(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ title: 'First edit', expectedUpdatedAt: detail.body.updatedAt })
      .expect(200);

    const conflict = await request(testApp.app.getHttpServer())
      .patch(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ title: 'Second edit', expectedUpdatedAt: detail.body.updatedAt })
      .expect(409);

    expect(conflict.body).toMatchObject({ error: 'CONFLICT' });
  });

  it('reorders cards within a column without gaps', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const column = await createColumn(testApp.app, alice, board.id, 'To Do');
    const first = await createCard(testApp.app, alice, column.id, 'First');
    const second = await createCard(testApp.app, alice, column.id, 'Second');
    const third = await createCard(testApp.app, alice, column.id, 'Third');

    await request(testApp.app.getHttpServer())
      .patch(`/api/cards/${third.id}/move`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ columnId: column.id, order: 0 })
      .expect(200);

    const [result] = await boardColumns(alice, board.id);
    expect(result!.cards.map((c) => c.id)).toEqual([third.id, first.id, second.id]);
    expect(result!.cards.map((c) => c.order)).toEqual([0, 1, 2]);
  });

  it('renumbers both columns when moving a card across them', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const todo = await createColumn(testApp.app, alice, board.id, 'To Do');
    const doing = await createColumn(testApp.app, alice, board.id, 'Doing');

    const todoA = await createCard(testApp.app, alice, todo.id, 'A');
    const todoB = await createCard(testApp.app, alice, todo.id, 'B');
    const doingX = await createCard(testApp.app, alice, doing.id, 'X');
    const doingY = await createCard(testApp.app, alice, doing.id, 'Y');

    await request(testApp.app.getHttpServer())
      .patch(`/api/cards/${todoA.id}/move`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ columnId: doing.id, order: 1 })
      .expect(200);

    const columns = await boardColumns(alice, board.id);
    const [todoColumn, doingColumn] = columns;

    expect(todoColumn!.cards.map((c) => c.id)).toEqual([todoB.id]);
    expect(todoColumn!.cards.map((c) => c.order)).toEqual([0]);
    expect(doingColumn!.cards.map((c) => c.id)).toEqual([doingX.id, todoA.id, doingY.id]);
    expect(doingColumn!.cards.map((c) => c.order)).toEqual([0, 1, 2]);
  });

  it('moves a card into an empty column', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const todo = await createColumn(testApp.app, alice, board.id, 'To Do');
    const done = await createColumn(testApp.app, alice, board.id, 'Done');
    const card = await createCard(testApp.app, alice, todo.id, 'A');

    await request(testApp.app.getHttpServer())
      .patch(`/api/cards/${card.id}/move`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ columnId: done.id, order: 0 })
      .expect(200);

    const [, doneColumn] = await boardColumns(alice, board.id);
    expect(doneColumn!.cards.map((c) => c.id)).toEqual([card.id]);
    expect(doneColumn!.cards.map((c) => c.order)).toEqual([0]);
  });

  it('assigns the board owner and clears the assignee', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const column = await createColumn(testApp.app, alice, board.id, 'To Do');
    const card = await createCard(testApp.app, alice, column.id, 'First');

    const assigned = await request(testApp.app.getHttpServer())
      .patch(`/api/cards/${card.id}/assignee`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ assigneeId: alice.userId })
      .expect(200);
    expect(assigned.body.assigneeId).toBe(alice.userId);

    const cleared = await request(testApp.app.getHttpServer())
      .patch(`/api/cards/${card.id}/assignee`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ assigneeId: null })
      .expect(200);
    expect(cleared.body.assigneeId).toBeNull();
  });

  it('rejects an assignee that is not the board owner with 422', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const bob = await registerUser(testApp.app, 'bob@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const column = await createColumn(testApp.app, alice, board.id, 'To Do');
    const card = await createCard(testApp.app, alice, column.id, 'First');

    const response = await request(testApp.app.getHttpServer())
      .patch(`/api/cards/${card.id}/assignee`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ assigneeId: bob.userId })
      .expect(422);

    expect(response.body).toMatchObject({ error: 'INVALID_ASSIGNEE' });
  });

  it('deletes a card', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const column = await createColumn(testApp.app, alice, board.id, 'To Do');
    const card = await createCard(testApp.app, alice, column.id, 'First');

    await request(testApp.app.getHttpServer())
      .delete(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(204);

    await request(testApp.app.getHttpServer())
      .get(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(404);
  });

  it("never exposes another user's cards (404)", async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'Private');
    const column = await createColumn(testApp.app, alice, board.id, 'To Do');
    const card = await createCard(testApp.app, alice, column.id, 'Secret');

    const bob = await registerUser(testApp.app, 'bob@example.com');

    const read = await request(testApp.app.getHttpServer())
      .get(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(404);
    expect(read.body).toMatchObject({ error: 'BOARD_NOT_FOUND' });

    await request(testApp.app.getHttpServer())
      .patch(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ title: 'Hacked' })
      .expect(404);

    await request(testApp.app.getHttpServer())
      .delete(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(404);
  });

  it('refuses to move a card into a column of another board (404)', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const bob = await registerUser(testApp.app, 'bob@example.com');

    const aliceBoard = await createBoard(testApp.app, alice, 'Alice');
    const aliceColumn = await createColumn(testApp.app, alice, aliceBoard.id, 'To Do');
    const card = await createCard(testApp.app, alice, aliceColumn.id, 'Task');

    const bobBoard = await createBoard(testApp.app, bob, 'Bob');
    const bobColumn = await createColumn(testApp.app, bob, bobBoard.id, 'To Do');

    const response = await request(testApp.app.getHttpServer())
      .patch(`/api/cards/${card.id}/move`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ columnId: bobColumn.id, order: 0 })
      .expect(404);

    expect(response.body).toMatchObject({ error: 'COLUMN_NOT_FOUND' });
  });

  it('survives parallel moves within one column without 5xx and keeps orders unique', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const column = await createColumn(testApp.app, alice, board.id, 'To Do');

    const cards: CardDto[] = [];
    for (let i = 0; i < 8; i += 1) {
      cards.push(await createCard(testApp.app, alice, column.id, `Card ${i + 1}`));
    }

    const statuses = await Promise.all(
      cards.map(async (card) => {
        const response = await request(testApp.app.getHttpServer())
          .patch(`/api/cards/${card.id}/move`)
          .set('Authorization', `Bearer ${alice.token}`)
          .send({ columnId: column.id, order: cards.length - 1 });
        return response.status;
      }),
    );

    expect(statuses.filter((status) => status >= 500)).toEqual([]);

    const [columnState] = await boardColumns(alice, board.id);
    const orders = columnState!.cards.map((card) => card.order).sort((a, b) => a - b);
    expect(orders).toEqual([...Array(cards.length).keys()]);
  });

  it('survives parallel cross-column moves and renumbers both columns', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const todo = await createColumn(testApp.app, alice, board.id, 'To Do');
    const doing = await createColumn(testApp.app, alice, board.id, 'Doing');

    const cards: CardDto[] = [];
    for (let i = 0; i < 6; i += 1) {
      cards.push(await createCard(testApp.app, alice, todo.id, `Card ${i + 1}`));
    }

    const statuses = await Promise.all(
      cards.map(async (card, index) => {
        const response = await request(testApp.app.getHttpServer())
          .patch(`/api/cards/${card.id}/move`)
          .set('Authorization', `Bearer ${alice.token}`)
          .send({ columnId: doing.id, order: index });
        return response.status;
      }),
    );

    expect(statuses.filter((status) => status >= 500)).toEqual([]);

    const [todoState, doingState] = await boardColumns(alice, board.id);
    expect(todoState!.cards).toEqual([]);
    expect(doingState!.cards.map((card) => card.id).sort()).toEqual(
      cards.map((card) => card.id).sort(),
    );
    const orders = doingState!.cards.map((card) => card.order).sort((a, b) => a - b);
    expect(orders).toEqual([...Array(cards.length).keys()]);
  });
});
