import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/setup-app';
import { truncateAllTables } from './truncate';

describe('Boards (e2e)', () => {
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

  async function createBoard(token: string, title: string): Promise<{ id: string }> {
    const response = await request(app.getHttpServer())
      .post('/api/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title })
      .expect(201);

    return response.body as { id: string };
  }

  it('rejects requests without an access token', async () => {
    await request(app.getHttpServer()).get('/api/boards').expect(401);
  });

  it('creates a board and returns it with columns and cards', async () => {
    const token = await register('alice@example.com');
    const board = await createBoard(token, 'My Board');

    const detail = await request(app.getHttpServer())
      .get(`/api/boards/${board.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(detail.body).toMatchObject({ id: board.id, title: 'My Board' });
    expect(detail.body.columns).toEqual([]);
  });

  it('lists only the owner boards with pagination metadata', async () => {
    const token = await register('alice@example.com');
    await createBoard(token, 'One');
    await createBoard(token, 'Two');
    await createBoard(token, 'Three');

    const page = await request(app.getHttpServer())
      .get('/api/boards?page=1&limit=2')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(page.body).toMatchObject({ total: 3, page: 1, limit: 2 });
    expect(page.body.items).toHaveLength(2);
  });

  it('filters boards by search term', async () => {
    const token = await register('alice@example.com');
    await createBoard(token, 'Roadmap');
    await createBoard(token, 'Groceries');

    const response = await request(app.getHttpServer())
      .get('/api/boards?search=road')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.items[0]).toMatchObject({ title: 'Roadmap' });
  });

  it('updates and deletes an owned board', async () => {
    const token = await register('alice@example.com');
    const board = await createBoard(token, 'Draft');

    const updated = await request(app.getHttpServer())
      .patch(`/api/boards/${board.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Final' })
      .expect(200);
    expect(updated.body).toMatchObject({ title: 'Final' });

    await request(app.getHttpServer())
      .delete(`/api/boards/${board.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/boards/${board.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it("never exposes another user's board (404)", async () => {
    const alice = await register('alice@example.com');
    const board = await createBoard(alice, 'Private');

    const bob = await register('bob@example.com');

    const read = await request(app.getHttpServer())
      .get(`/api/boards/${board.id}`)
      .set('Authorization', `Bearer ${bob}`)
      .expect(404);
    expect(read.body).toMatchObject({ error: 'BOARD_NOT_FOUND' });

    await request(app.getHttpServer())
      .patch(`/api/boards/${board.id}`)
      .set('Authorization', `Bearer ${bob}`)
      .send({ title: 'Hacked' })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/boards/${board.id}`)
      .set('Authorization', `Bearer ${bob}`)
      .expect(404);

    const bobList = await request(app.getHttpServer())
      .get('/api/boards')
      .set('Authorization', `Bearer ${bob}`)
      .expect(200);
    expect(bobList.body.total).toBe(0);
  });

  it('returns 404 for a non-existent board', async () => {
    const token = await register('alice@example.com');

    await request(app.getHttpServer())
      .get('/api/boards/clzzzzzzzzzzzzzzzzzzzzzzz')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});
