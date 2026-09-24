import request from 'supertest';
import {
  createBoard,
  createCard,
  createColumn,
  createTestApp,
  registerUser,
  truncateAllTables,
  type TestApp,
  type TestSession,
} from './utils';

describe('Dashboard (e2e)', () => {
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

  async function setDone(session: TestSession, columnId: string): Promise<void> {
    await request(testApp.app.getHttpServer())
      .patch(`/api/columns/${columnId}`)
      .set('Authorization', `Bearer ${session.token}`)
      .send({ isDone: true })
      .expect(200);
  }

  it('rejects requests without an access token', async () => {
    await request(testApp.app.getHttpServer()).get('/api/dashboard/stats').expect(401);
  });

  it('aggregates stats for the owner only', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const todo = await createColumn(testApp.app, alice, board.id, 'To Do');
    const done = await createColumn(testApp.app, alice, board.id, 'Done');
    await setDone(alice, done.id);

    const past = new Date(Date.now() - 86_400_000).toISOString();
    const future = new Date(Date.now() + 86_400_000).toISOString();

    await createCard(testApp.app, alice, todo.id, { title: 'Overdue', deadline: past });
    await createCard(testApp.app, alice, todo.id, { title: 'Future', deadline: future });
    await createCard(testApp.app, alice, todo.id, { title: 'No deadline' });
    await createCard(testApp.app, alice, done.id, { title: 'Done but overdue', deadline: past });

    const response = await request(testApp.app.getHttpServer())
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(response.body).toEqual({
      totalBoards: 1,
      totalCards: 4,
      cardsByStatus: [
        { columnId: todo.id, columnTitle: 'To Do', count: 3 },
        { columnId: done.id, columnTitle: 'Done', count: 1 },
      ],
      overdueCards: 1,
    });
  });

  it('does not count other users boards', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const aliceBoard = await createBoard(testApp.app, alice, 'Alice');
    const aliceColumn = await createColumn(testApp.app, alice, aliceBoard.id, 'To Do');
    await createCard(testApp.app, alice, aliceColumn.id, 'Alice card');

    const bob = await registerUser(testApp.app, 'bob@example.com');
    const bobBoard = await createBoard(testApp.app, bob, 'Bob');
    const bobColumn = await createColumn(testApp.app, bob, bobBoard.id, 'To Do');
    await createCard(testApp.app, bob, bobColumn.id, 'Bob card');
    await createCard(testApp.app, bob, bobColumn.id, 'Bob card 2');

    const response = await request(testApp.app.getHttpServer())
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(response.body).toMatchObject({ totalBoards: 1, totalCards: 1 });
  });
});
