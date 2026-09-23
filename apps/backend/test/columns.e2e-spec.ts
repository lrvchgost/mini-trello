import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/setup-app';
import { truncateAllTables } from './truncate';

describe('Columns (e2e)', () => {
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

  async function register(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, name: email.split('@')[0], password: 'password123' })
      .expect(201);

    return response.body.accessToken as string;
  }

  async function createBoard(token: string, title: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title })
      .expect(201);

    return response.body.id as string;
  }

  async function createColumn(
    token: string,
    boardId: string,
    title: string,
  ): Promise<{ id: string; order: number }> {
    const response = await request(app.getHttpServer())
      .post(`/api/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title })
      .expect(201);

    return response.body as { id: string; order: number };
  }

  async function boardColumnIds(token: string, boardId: string): Promise<string[]> {
    const response = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    return (response.body.columns as Array<{ id: string }>).map((column) => column.id);
  }

  it('rejects requests without an access token', async () => {
    await request(app.getHttpServer()).post('/api/boards/x/columns').expect(401);
  });

  it('creates three columns with sequential order 0, 1, 2', async () => {
    const token = await register('alice@example.com');
    const boardId = await createBoard(token, 'My Board');

    const first = await createColumn(token, boardId, 'To Do');
    const second = await createColumn(token, boardId, 'In Progress');
    const third = await createColumn(token, boardId, 'Done');

    expect([first.order, second.order, third.order]).toEqual([0, 1, 2]);
    expect(await boardColumnIds(token, boardId)).toEqual([first.id, second.id, third.id]);
  });

  it('updates a column title and isDone flag', async () => {
    const token = await register('alice@example.com');
    const boardId = await createBoard(token, 'My Board');
    const column = await createColumn(token, boardId, 'To Do');

    const updated = await request(app.getHttpServer())
      .patch(`/api/columns/${column.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Done', isDone: true })
      .expect(200);

    expect(updated.body).toMatchObject({ id: column.id, title: 'Done', isDone: true, order: 0 });
  });

  it('reorders columns without gaps or duplicates', async () => {
    const token = await register('alice@example.com');
    const boardId = await createBoard(token, 'My Board');
    const first = await createColumn(token, boardId, 'To Do');
    const second = await createColumn(token, boardId, 'In Progress');
    const third = await createColumn(token, boardId, 'Done');

    await request(app.getHttpServer())
      .patch(`/api/columns/${third.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ order: 0 })
      .expect(200);

    expect(await boardColumnIds(token, boardId)).toEqual([third.id, first.id, second.id]);

    const reordered = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const orders = (reordered.body.columns as Array<{ order: number }>).map((c) => c.order);
    expect(orders).toEqual([0, 1, 2]);
  });

  it('deletes a column', async () => {
    const token = await register('alice@example.com');
    const boardId = await createBoard(token, 'My Board');
    const column = await createColumn(token, boardId, 'To Do');

    await request(app.getHttpServer())
      .delete(`/api/columns/${column.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    expect(await boardColumnIds(token, boardId)).toEqual([]);
  });

  it('returns 404 for a non-existent column', async () => {
    const token = await register('alice@example.com');

    const response = await request(app.getHttpServer())
      .patch('/api/columns/clzzzzzzzzzzzzzzzzzzzzzzz')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Ghost' })
      .expect(404);

    expect(response.body).toMatchObject({ error: 'COLUMN_NOT_FOUND' });
  });

  it('returns 404 when creating a column in a non-existent board', async () => {
    const token = await register('alice@example.com');

    const response = await request(app.getHttpServer())
      .post('/api/boards/clzzzzzzzzzzzzzzzzzzzzzzz/columns')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Orphan' })
      .expect(404);

    expect(response.body).toMatchObject({ error: 'BOARD_NOT_FOUND' });
  });

  it("never exposes another user's columns (404)", async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'Private');
    const column = await createColumn(alice, boardId, 'To Do');

    const bob = await register('bob@example.com');

    await request(app.getHttpServer())
      .post(`/api/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${bob}`)
      .send({ title: 'Intruder' })
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/columns/${column.id}`)
      .set('Authorization', `Bearer ${bob}`)
      .send({ title: 'Hacked' })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/columns/${column.id}`)
      .set('Authorization', `Bearer ${bob}`)
      .expect(404);

    expect(await boardColumnIds(alice, boardId)).toEqual([column.id]);
  });
});
