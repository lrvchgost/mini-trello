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

describe('Labels (e2e)', () => {
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
    await request(testApp.app.getHttpServer()).get('/api/boards/x/labels').expect(401);
  });

  it('creates a label with the default color and lists it', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');

    const label = await createLabel(testApp.app, alice, board.id, 'bug');
    expect(label).toMatchObject({ name: 'bug', color: '#6b7280', boardId: board.id });

    const list = await request(testApp.app.getHttpServer())
      .get(`/api/boards/${board.id}/labels`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(list.body).toEqual([label]);
  });

  it('rejects a duplicate label name in the same board (409)', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');

    await createLabel(testApp.app, alice, board.id, 'bug');

    const response = await request(testApp.app.getHttpServer())
      .post(`/api/boards/${board.id}/labels`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'bug' })
      .expect(409);

    expect(response.body).toMatchObject({ error: 'CONFLICT' });
  });

  it('deletes a label', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const label = await createLabel(testApp.app, alice, board.id, 'bug');

    await request(testApp.app.getHttpServer())
      .delete(`/api/labels/${label.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(204);

    const list = await request(testApp.app.getHttpServer())
      .get(`/api/boards/${board.id}/labels`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(list.body).toEqual([]);
  });

  it('attaches a label to a card and detaches it', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const column = await createColumn(testApp.app, alice, board.id, 'To Do');
    const card = await createCard(testApp.app, alice, column.id, 'First');
    const label = await createLabel(testApp.app, alice, board.id, 'bug', '#f00');

    const attached = await request(testApp.app.getHttpServer())
      .post(`/api/cards/${card.id}/labels`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ labelId: label.id })
      .expect(200);
    expect(attached.body.labels).toEqual([label]);

    const detail = await request(testApp.app.getHttpServer())
      .get(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(detail.body.labels).toEqual([label]);

    await request(testApp.app.getHttpServer())
      .delete(`/api/cards/${card.id}/labels/${label.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(204);

    const cleared = await request(testApp.app.getHttpServer())
      .get(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(cleared.body.labels).toEqual([]);
  });

  it('refuses to attach a label from another board (422)', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const aliceBoard = await createBoard(testApp.app, alice, 'Alice');
    const aliceColumn = await createColumn(testApp.app, alice, aliceBoard.id, 'To Do');
    const aliceCard = await createCard(testApp.app, alice, aliceColumn.id, 'Task');

    const bob = await registerUser(testApp.app, 'bob@example.com');
    const bobBoard = await createBoard(testApp.app, bob, 'Bob');
    const bobLabel = await createLabel(testApp.app, bob, bobBoard.id, 'bug');

    const response = await request(testApp.app.getHttpServer())
      .post(`/api/cards/${aliceCard.id}/labels`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ labelId: bobLabel.id })
      .expect(422);

    expect(response.body).toMatchObject({ error: 'INVALID_LABEL' });
  });

  it("never exposes another user's labels (404)", async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'Private');
    const label = await createLabel(testApp.app, alice, board.id, 'bug');

    const bob = await registerUser(testApp.app, 'bob@example.com');

    const list = await request(testApp.app.getHttpServer())
      .get(`/api/boards/${board.id}/labels`)
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(404);
    expect(list.body).toMatchObject({ error: 'BOARD_NOT_FOUND' });

    await request(testApp.app.getHttpServer())
      .delete(`/api/labels/${label.id}`)
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(404);
  });
});
