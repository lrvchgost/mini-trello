import request from 'supertest';
import {
  createBoard,
  createCard,
  createColumn,
  createTestApp,
  registerUser,
  truncateAllTables,
  type TestApp,
} from './utils';

describe('Boards (e2e)', () => {
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

  it('rejects requests without an access token', async () => {
    await request(testApp.app.getHttpServer()).get('/api/boards').expect(401);
  });

  it('creates a board and returns it with columns and cards', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');

    const detail = await request(testApp.app.getHttpServer())
      .get(`/api/boards/${board.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(detail.body).toMatchObject({ id: board.id, title: 'My Board' });
    expect(detail.body.columns).toEqual([]);
  });

  it('lists only the owner boards with pagination metadata', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    await createBoard(testApp.app, alice, 'One');
    await createBoard(testApp.app, alice, 'Two');
    await createBoard(testApp.app, alice, 'Three');

    const page = await request(testApp.app.getHttpServer())
      .get('/api/boards?page=1&limit=2')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(page.body).toMatchObject({ total: 3, page: 1, limit: 2 });
    expect(page.body.items).toHaveLength(2);
    expect(page.body.items[0]).toMatchObject({ cardsCount: 0 });
  });

  it('reports the number of cards per board', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'Counted');

    const column = await createColumn(testApp.app, alice, board.id, 'In Progress');
    await createCard(testApp.app, alice, column.id, 'First');
    await createCard(testApp.app, alice, column.id, 'Second');

    const page = await request(testApp.app.getHttpServer())
      .get('/api/boards')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(page.body.items[0]).toMatchObject({ id: board.id, cardsCount: 2 });
  });

  it('filters boards by search term', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    await createBoard(testApp.app, alice, 'Roadmap');
    await createBoard(testApp.app, alice, 'Groceries');

    const response = await request(testApp.app.getHttpServer())
      .get('/api/boards?search=road')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.items[0]).toMatchObject({ title: 'Roadmap' });
  });

  it('updates and deletes an owned board', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'Draft');

    const updated = await request(testApp.app.getHttpServer())
      .patch(`/api/boards/${board.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ title: 'Final' })
      .expect(200);
    expect(updated.body).toMatchObject({ title: 'Final' });

    await request(testApp.app.getHttpServer())
      .delete(`/api/boards/${board.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(204);

    await request(testApp.app.getHttpServer())
      .get(`/api/boards/${board.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(404);
  });

  it("never exposes another user's board (404)", async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'Private');

    const bob = await registerUser(testApp.app, 'bob@example.com');

    const read = await request(testApp.app.getHttpServer())
      .get(`/api/boards/${board.id}`)
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(404);
    expect(read.body).toMatchObject({ error: 'BOARD_NOT_FOUND' });

    await request(testApp.app.getHttpServer())
      .patch(`/api/boards/${board.id}`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ title: 'Hacked' })
      .expect(404);

    await request(testApp.app.getHttpServer())
      .delete(`/api/boards/${board.id}`)
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(404);

    const bobList = await request(testApp.app.getHttpServer())
      .get('/api/boards')
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(200);
    expect(bobList.body.total).toBe(0);
  });

  it('returns 404 for a non-existent board', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');

    await request(testApp.app.getHttpServer())
      .get('/api/boards/clzzzzzzzzzzzzzzzzzzzzzzz')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(404);
  });
});
