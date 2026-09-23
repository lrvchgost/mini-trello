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

describe('Labels (e2e)', () => {
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

  async function createLabel(
    session: Session,
    boardId: string,
    name: string,
    color?: string,
  ): Promise<{ id: string; name: string; color: string; boardId: string }> {
    const response = await request(app.getHttpServer())
      .post(`/api/boards/${boardId}/labels`)
      .set('Authorization', `Bearer ${session.token}`)
      .send(color ? { name, color } : { name })
      .expect(201);

    return response.body as { id: string; name: string; color: string; boardId: string };
  }

  it('rejects requests without an access token', async () => {
    await request(app.getHttpServer()).get('/api/boards/x/labels').expect(401);
  });

  it('creates a label with the default color and lists it', async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'My Board');

    const label = await createLabel(alice, boardId, 'bug');
    expect(label).toMatchObject({ name: 'bug', color: '#6b7280', boardId });

    const list = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}/labels`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(list.body).toEqual([label]);
  });

  it('rejects a duplicate label name in the same board (409)', async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'My Board');

    await createLabel(alice, boardId, 'bug');

    const response = await request(app.getHttpServer())
      .post(`/api/boards/${boardId}/labels`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'bug' })
      .expect(409);

    expect(response.body).toMatchObject({ error: 'CONFLICT' });
  });

  it('deletes a label', async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'My Board');
    const label = await createLabel(alice, boardId, 'bug');

    await request(app.getHttpServer())
      .delete(`/api/labels/${label.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(204);

    const list = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}/labels`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(list.body).toEqual([]);
  });

  it('attaches a label to a card and detaches it', async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'My Board');
    const columnId = await createColumn(alice, boardId, 'To Do');
    const cardId = await createCard(alice, columnId, 'First');
    const label = await createLabel(alice, boardId, 'bug', '#f00');

    const attached = await request(app.getHttpServer())
      .post(`/api/cards/${cardId}/labels`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ labelId: label.id })
      .expect(200);
    expect(attached.body.labels).toEqual([label]);

    const detail = await request(app.getHttpServer())
      .get(`/api/cards/${cardId}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(detail.body.labels).toEqual([label]);

    await request(app.getHttpServer())
      .delete(`/api/cards/${cardId}/labels/${label.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(204);

    const cleared = await request(app.getHttpServer())
      .get(`/api/cards/${cardId}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(cleared.body.labels).toEqual([]);
  });

  it('refuses to attach a label from another board (422)', async () => {
    const alice = await register('alice@example.com');
    const aliceBoard = await createBoard(alice, 'Alice');
    const aliceColumn = await createColumn(alice, aliceBoard, 'To Do');
    const aliceCard = await createCard(alice, aliceColumn, 'Task');

    const bob = await register('bob@example.com');
    const bobBoard = await createBoard(bob, 'Bob');
    const bobLabel = await createLabel(bob, bobBoard, 'bug');

    const response = await request(app.getHttpServer())
      .post(`/api/cards/${aliceCard}/labels`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ labelId: bobLabel.id })
      .expect(422);

    expect(response.body).toMatchObject({ error: 'INVALID_LABEL' });
  });

  it("never exposes another user's labels (404)", async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'Private');
    const label = await createLabel(alice, boardId, 'bug');

    const bob = await register('bob@example.com');

    const list = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}/labels`)
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(404);
    expect(list.body).toMatchObject({ error: 'BOARD_NOT_FOUND' });

    await request(app.getHttpServer())
      .delete(`/api/labels/${label.id}`)
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(404);
  });
});
