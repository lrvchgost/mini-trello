import request from 'supertest';
import {
  createBoard,
  createColumn,
  createTestApp,
  registerUser,
  truncateAllTables,
  type TestApp,
  type TestSession,
} from './utils';

describe('Columns (e2e)', () => {
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

  async function boardColumnIds(session: TestSession, boardId: string): Promise<string[]> {
    const response = await request(testApp.app.getHttpServer())
      .get(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${session.token}`)
      .expect(200);

    return (response.body.columns as Array<{ id: string }>).map((column) => column.id);
  }

  it('rejects requests without an access token', async () => {
    await request(testApp.app.getHttpServer()).post('/api/boards/x/columns').expect(401);
  });

  it('creates three columns with sequential order 0, 1, 2', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');

    const first = await createColumn(testApp.app, alice, board.id, 'To Do');
    const second = await createColumn(testApp.app, alice, board.id, 'In Progress');
    const third = await createColumn(testApp.app, alice, board.id, 'Done');

    expect([first.order, second.order, third.order]).toEqual([0, 1, 2]);
    expect(await boardColumnIds(alice, board.id)).toEqual([first.id, second.id, third.id]);
  });

  it('updates a column title and isDone flag', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const column = await createColumn(testApp.app, alice, board.id, 'To Do');

    const updated = await request(testApp.app.getHttpServer())
      .patch(`/api/columns/${column.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ title: 'Done', isDone: true })
      .expect(200);

    expect(updated.body).toMatchObject({ id: column.id, title: 'Done', isDone: true, order: 0 });
  });

  it('reorders columns without gaps or duplicates', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const first = await createColumn(testApp.app, alice, board.id, 'To Do');
    const second = await createColumn(testApp.app, alice, board.id, 'In Progress');
    const third = await createColumn(testApp.app, alice, board.id, 'Done');

    await request(testApp.app.getHttpServer())
      .patch(`/api/columns/${third.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ order: 0 })
      .expect(200);

    expect(await boardColumnIds(alice, board.id)).toEqual([third.id, first.id, second.id]);

    const reordered = await request(testApp.app.getHttpServer())
      .get(`/api/boards/${board.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    const orders = (reordered.body.columns as Array<{ order: number }>).map((c) => c.order);
    expect(orders).toEqual([0, 1, 2]);
  });

  it('deletes a column', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const column = await createColumn(testApp.app, alice, board.id, 'To Do');

    await request(testApp.app.getHttpServer())
      .delete(`/api/columns/${column.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(204);

    expect(await boardColumnIds(alice, board.id)).toEqual([]);
  });

  it('returns 404 for a non-existent column', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');

    const response = await request(testApp.app.getHttpServer())
      .patch('/api/columns/clzzzzzzzzzzzzzzzzzzzzzzz')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ title: 'Ghost' })
      .expect(404);

    expect(response.body).toMatchObject({ error: 'COLUMN_NOT_FOUND' });
  });

  it('returns 404 when creating a column in a non-existent board', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');

    const response = await request(testApp.app.getHttpServer())
      .post('/api/boards/clzzzzzzzzzzzzzzzzzzzzzzz/columns')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ title: 'Orphan' })
      .expect(404);

    expect(response.body).toMatchObject({ error: 'BOARD_NOT_FOUND' });
  });

  it("never exposes another user's columns (404)", async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'Private');
    const column = await createColumn(testApp.app, alice, board.id, 'To Do');

    const bob = await registerUser(testApp.app, 'bob@example.com');

    await request(testApp.app.getHttpServer())
      .post(`/api/boards/${board.id}/columns`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ title: 'Intruder' })
      .expect(404);

    await request(testApp.app.getHttpServer())
      .patch(`/api/columns/${column.id}`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ title: 'Hacked' })
      .expect(404);

    await request(testApp.app.getHttpServer())
      .delete(`/api/columns/${column.id}`)
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(404);

    expect(await boardColumnIds(alice, board.id)).toEqual([column.id]);
  });
});
