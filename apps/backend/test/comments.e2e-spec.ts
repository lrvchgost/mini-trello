import request from 'supertest';
import {
  createBoard,
  createCard,
  createColumn,
  createComment,
  createTestApp,
  registerUser,
  truncateAllTables,
  type TestApp,
} from './utils';

describe('Comments (e2e)', () => {
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
    await request(testApp.app.getHttpServer()).get('/api/cards/x/comments').expect(401);
  });

  it('creates a comment with author and timestamp, then lists it', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const column = await createColumn(testApp.app, alice, board.id, 'To Do');
    const card = await createCard(testApp.app, alice, column.id, 'First');

    const created = await createComment(testApp.app, alice, card.id, 'ping');
    expect(created).toMatchObject({ content: 'ping', authorId: alice.userId });
    expect(typeof created.createdAt).toBe('string');

    const list = await request(testApp.app.getHttpServer())
      .get(`/api/cards/${card.id}/comments`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(list.body.total).toBe(1);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]).toMatchObject({
      id: created.id,
      content: 'ping',
      authorId: alice.userId,
    });
    expect(list.body.items[0].author).toMatchObject({ id: alice.userId, name: 'alice' });
  });

  it('paginates comments newest first', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const column = await createColumn(testApp.app, alice, board.id, 'To Do');
    const card = await createCard(testApp.app, alice, column.id, 'First');

    await createComment(testApp.app, alice, card.id, 'first');
    await createComment(testApp.app, alice, card.id, 'second');
    await createComment(testApp.app, alice, card.id, 'third');

    const page1 = await request(testApp.app.getHttpServer())
      .get(`/api/cards/${card.id}/comments?page=1&limit=2`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(page1.body).toMatchObject({ total: 3, page: 1, limit: 2 });
    expect(page1.body.items.map((item: { content: string }) => item.content)).toEqual([
      'third',
      'second',
    ]);

    const page2 = await request(testApp.app.getHttpServer())
      .get(`/api/cards/${card.id}/comments?page=2&limit=2`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(page2.body.items.map((item: { content: string }) => item.content)).toEqual(['first']);
  });

  it('deletes a comment authored by the current user', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const column = await createColumn(testApp.app, alice, board.id, 'To Do');
    const card = await createCard(testApp.app, alice, column.id, 'First');
    const comment = await createComment(testApp.app, alice, card.id, 'ping');

    await request(testApp.app.getHttpServer())
      .delete(`/api/comments/${comment.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(204);

    const list = await request(testApp.app.getHttpServer())
      .get(`/api/cards/${card.id}/comments`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(list.body.items).toEqual([]);
  });

  it('rejects empty content (422)', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const column = await createColumn(testApp.app, alice, board.id, 'To Do');
    const card = await createCard(testApp.app, alice, column.id, 'First');

    await request(testApp.app.getHttpServer())
      .post(`/api/cards/${card.id}/comments`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ content: '' })
      .expect(422);
  });

  it('returns 404 for a missing card or comment', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');

    const list = await request(testApp.app.getHttpServer())
      .get('/api/cards/missing/comments')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(404);
    expect(list.body).toMatchObject({ error: 'CARD_NOT_FOUND' });

    const remove = await request(testApp.app.getHttpServer())
      .delete('/api/comments/missing')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(404);
    expect(remove.body).toMatchObject({ error: 'COMMENT_NOT_FOUND' });
  });

  it("never exposes another user's card comments (404)", async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'Private');
    const column = await createColumn(testApp.app, alice, board.id, 'To Do');
    const card = await createCard(testApp.app, alice, column.id, 'Secret');
    const comment = await createComment(testApp.app, alice, card.id, 'ping');

    const bob = await registerUser(testApp.app, 'bob@example.com');

    const list = await request(testApp.app.getHttpServer())
      .get(`/api/cards/${card.id}/comments`)
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(404);
    expect(list.body).toMatchObject({ error: 'BOARD_NOT_FOUND' });

    const create = await request(testApp.app.getHttpServer())
      .post(`/api/cards/${card.id}/comments`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ content: 'hack' })
      .expect(404);
    expect(create.body).toMatchObject({ error: 'BOARD_NOT_FOUND' });

    const remove = await request(testApp.app.getHttpServer())
      .delete(`/api/comments/${comment.id}`)
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(404);
    expect(remove.body).toMatchObject({ error: 'BOARD_NOT_FOUND' });
  });
});
