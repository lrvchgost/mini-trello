import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/setup-app';
import { truncateAllTables } from './truncate';

interface Session {
  token: string;
  userId: string;
}

describe('Comments (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(async () => {
    await truncateAllTables(app.get(PrismaService));
  });

  afterAll(async () => {
    await app.close();
  });

  async function register(email: string): Promise<Session> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, name: email.split('@')[0], password: 'password123' })
      .expect(201);

    return {
      token: response.body.accessToken as string,
      userId: (response.body.user as { id: string }).id,
    };
  }

  async function createBoard(session: Session, title: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/boards')
      .set('Authorization', `Bearer ${session.token}`)
      .send({ title })
      .expect(201);

    return response.body.id as string;
  }

  async function createColumn(session: Session, boardId: string, title: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`/api/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${session.token}`)
      .send({ title })
      .expect(201);

    return response.body.id as string;
  }

  async function createCard(session: Session, columnId: string, title: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`/api/columns/${columnId}/cards`)
      .set('Authorization', `Bearer ${session.token}`)
      .send({ title })
      .expect(201);

    return response.body.id as string;
  }

  async function createComment(
    session: Session,
    cardId: string,
    content: string,
  ): Promise<{ id: string; content: string; authorId: string; createdAt: string }> {
    const response = await request(app.getHttpServer())
      .post(`/api/cards/${cardId}/comments`)
      .set('Authorization', `Bearer ${session.token}`)
      .send({ content })
      .expect(201);

    return response.body as {
      id: string;
      content: string;
      authorId: string;
      createdAt: string;
    };
  }

  it('rejects requests without an access token', async () => {
    await request(app.getHttpServer()).get('/api/cards/x/comments').expect(401);
  });

  it('creates a comment with author and timestamp, then lists it', async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'My Board');
    const columnId = await createColumn(alice, boardId, 'To Do');
    const cardId = await createCard(alice, columnId, 'First');

    const created = await createComment(alice, cardId, 'ping');
    expect(created).toMatchObject({ content: 'ping', authorId: alice.userId });
    expect(typeof created.createdAt).toBe('string');

    const list = await request(app.getHttpServer())
      .get(`/api/cards/${cardId}/comments`)
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
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'My Board');
    const columnId = await createColumn(alice, boardId, 'To Do');
    const cardId = await createCard(alice, columnId, 'First');

    await createComment(alice, cardId, 'first');
    await createComment(alice, cardId, 'second');
    await createComment(alice, cardId, 'third');

    const page1 = await request(app.getHttpServer())
      .get(`/api/cards/${cardId}/comments?page=1&limit=2`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(page1.body).toMatchObject({ total: 3, page: 1, limit: 2 });
    expect(page1.body.items.map((item: { content: string }) => item.content)).toEqual([
      'third',
      'second',
    ]);

    const page2 = await request(app.getHttpServer())
      .get(`/api/cards/${cardId}/comments?page=2&limit=2`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(page2.body.items.map((item: { content: string }) => item.content)).toEqual(['first']);
  });

  it('deletes a comment authored by the current user', async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'My Board');
    const columnId = await createColumn(alice, boardId, 'To Do');
    const cardId = await createCard(alice, columnId, 'First');
    const comment = await createComment(alice, cardId, 'ping');

    await request(app.getHttpServer())
      .delete(`/api/comments/${comment.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(204);

    const list = await request(app.getHttpServer())
      .get(`/api/cards/${cardId}/comments`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(list.body.items).toEqual([]);
  });

  it('rejects empty content (422)', async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'My Board');
    const columnId = await createColumn(alice, boardId, 'To Do');
    const cardId = await createCard(alice, columnId, 'First');

    await request(app.getHttpServer())
      .post(`/api/cards/${cardId}/comments`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ content: '' })
      .expect(422);
  });

  it('returns 404 for a missing card or comment', async () => {
    const alice = await register('alice@example.com');

    const list = await request(app.getHttpServer())
      .get('/api/cards/missing/comments')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(404);
    expect(list.body).toMatchObject({ error: 'CARD_NOT_FOUND' });

    const remove = await request(app.getHttpServer())
      .delete('/api/comments/missing')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(404);
    expect(remove.body).toMatchObject({ error: 'COMMENT_NOT_FOUND' });
  });

  it("never exposes another user's card comments (404)", async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'Private');
    const columnId = await createColumn(alice, boardId, 'To Do');
    const cardId = await createCard(alice, columnId, 'Secret');
    const comment = await createComment(alice, cardId, 'ping');

    const bob = await register('bob@example.com');

    const list = await request(app.getHttpServer())
      .get(`/api/cards/${cardId}/comments`)
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(404);
    expect(list.body).toMatchObject({ error: 'BOARD_NOT_FOUND' });

    const create = await request(app.getHttpServer())
      .post(`/api/cards/${cardId}/comments`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ content: 'hack' })
      .expect(404);
    expect(create.body).toMatchObject({ error: 'BOARD_NOT_FOUND' });

    const remove = await request(app.getHttpServer())
      .delete(`/api/comments/${comment.id}`)
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(404);
    expect(remove.body).toMatchObject({ error: 'BOARD_NOT_FOUND' });
  });
});
