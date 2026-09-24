import request from 'supertest';
import {
  createBoard,
  createCard,
  createColumn,
  createLabel,
  createTestApp,
  registerUser,
  truncateAllTables,
  type TestApp,
} from './utils';

describe('Search (e2e)', () => {
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
    await request(testApp.app.getHttpServer()).get('/api/search').expect(401);
  });

  it('searches within a board and paginates', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const column = await createColumn(testApp.app, alice, board.id, 'To Do');
    const fix = await createCard(testApp.app, alice, column.id, 'Fix login');
    await createCard(testApp.app, alice, column.id, 'Write docs');

    const all = await request(testApp.app.getHttpServer())
      .get(`/api/boards/${board.id}/search?page=1&limit=1`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(all.body).toMatchObject({ total: 2, page: 1, limit: 1 });
    expect(all.body.items).toHaveLength(1);

    const filtered = await request(testApp.app.getHttpServer())
      .get(`/api/boards/${board.id}/search?q=fix`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(filtered.body.total).toBe(1);
    expect(filtered.body.items[0].id).toBe(fix.id);
  });

  it('applies priority, label, assignee and deadline filters', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const column = await createColumn(testApp.app, alice, board.id, 'To Do');
    const future = new Date(Date.now() + 86_400_000).toISOString();

    const urgent = await createCard(testApp.app, alice, column.id, {
      title: 'Urgent task',
      priority: 'high',
      deadline: future,
    });
    const plain = await createCard(testApp.app, alice, column.id, {
      title: 'Plain task',
      priority: 'low',
    });

    const label = await createLabel(testApp.app, alice, board.id, 'bug');
    await request(testApp.app.getHttpServer())
      .post(`/api/cards/${urgent.id}/labels`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ labelId: label.id })
      .expect(200);
    await request(testApp.app.getHttpServer())
      .patch(`/api/cards/${urgent.id}/assignee`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ assigneeId: alice.userId })
      .expect(200);

    const byPriority = await request(testApp.app.getHttpServer())
      .get(`/api/boards/${board.id}/search?priority=high`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(byPriority.body.items.map((card: { id: string }) => card.id)).toEqual([urgent.id]);

    const byLabel = await request(testApp.app.getHttpServer())
      .get(`/api/boards/${board.id}/search?label=${label.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(byLabel.body.items.map((card: { id: string }) => card.id)).toEqual([urgent.id]);

    const byAssignee = await request(testApp.app.getHttpServer())
      .get(`/api/boards/${board.id}/search?assignee=${alice.userId}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(byAssignee.body.items.map((card: { id: string }) => card.id)).toEqual([urgent.id]);

    const withDeadline = await request(testApp.app.getHttpServer())
      .get(`/api/boards/${board.id}/search?hasDeadline=true`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(withDeadline.body.items.map((card: { id: string }) => card.id)).toEqual([urgent.id]);

    const withoutDeadline = await request(testApp.app.getHttpServer())
      .get(`/api/boards/${board.id}/search?hasDeadline=false`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(withoutDeadline.body.items.map((card: { id: string }) => card.id)).toEqual([plain.id]);
  });

  it('searches globally across the user boards only', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const aliceBoard = await createBoard(testApp.app, alice, 'Alice Board');
    const aliceColumn = await createColumn(testApp.app, alice, aliceBoard.id, 'To Do');
    const aliceCard = await createCard(testApp.app, alice, aliceColumn.id, 'Alice secret plan');

    const bob = await registerUser(testApp.app, 'bob@example.com');
    const bobBoard = await createBoard(testApp.app, bob, 'Bob Board');
    const bobColumn = await createColumn(testApp.app, bob, bobBoard.id, 'To Do');
    await createCard(testApp.app, bob, bobColumn.id, 'Alice secret from bob');

    const global = await request(testApp.app.getHttpServer())
      .get('/api/search?q=secret')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(global.body.total).toBe(1);
    expect(global.body.items[0].id).toBe(aliceCard.id);
  });

  it('scopes board search to the owner (404 for another board)', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const aliceBoard = await createBoard(testApp.app, alice, 'Alice Board');
    const aliceColumn = await createColumn(testApp.app, alice, aliceBoard.id, 'To Do');
    await createCard(testApp.app, alice, aliceColumn.id, 'Task');

    const bob = await registerUser(testApp.app, 'bob@example.com');

    const response = await request(testApp.app.getHttpServer())
      .get(`/api/boards/${aliceBoard.id}/search?q=task`)
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(404);
    expect(response.body).toMatchObject({ error: 'BOARD_NOT_FOUND' });
  });
});
