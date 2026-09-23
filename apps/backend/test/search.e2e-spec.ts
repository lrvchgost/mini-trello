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

interface CardOverrides {
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: string | null;
}

describe('Search (e2e)', () => {
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

  async function createCard(
    session: Session,
    columnId: string,
    title: string,
    overrides: CardOverrides = {},
  ): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`/api/columns/${columnId}/cards`)
      .set('Authorization', `Bearer ${session.token}`)
      .send({ title, ...overrides })
      .expect(201);
    return response.body.id as string;
  }

  async function createLabel(session: Session, boardId: string, name: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`/api/boards/${boardId}/labels`)
      .set('Authorization', `Bearer ${session.token}`)
      .send({ name, color: '#ff0000' })
      .expect(201);
    return response.body.id as string;
  }

  it('rejects requests without an access token', async () => {
    await request(app.getHttpServer()).get('/api/search').expect(401);
  });

  it('searches within a board and paginates', async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'My Board');
    const columnId = await createColumn(alice, boardId, 'To Do');
    const fix = await createCard(alice, columnId, 'Fix login');
    await createCard(alice, columnId, 'Write docs');

    const all = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}/search?page=1&limit=1`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(all.body).toMatchObject({ total: 2, page: 1, limit: 1 });
    expect(all.body.items).toHaveLength(1);

    const filtered = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}/search?q=fix`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(filtered.body.total).toBe(1);
    expect(filtered.body.items[0].id).toBe(fix);
  });

  it('applies priority, label, assignee and deadline filters', async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'My Board');
    const columnId = await createColumn(alice, boardId, 'To Do');
    const future = new Date(Date.now() + 86_400_000).toISOString();

    const urgent = await createCard(alice, columnId, 'Urgent task', {
      priority: 'high',
      deadline: future,
    });
    const plain = await createCard(alice, columnId, 'Plain task', { priority: 'low' });

    const label = await createLabel(alice, boardId, 'bug');
    await request(app.getHttpServer())
      .post(`/api/cards/${urgent}/labels`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ labelId: label })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/cards/${urgent}/assignee`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ assigneeId: alice.userId })
      .expect(200);

    const byPriority = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}/search?priority=high`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(byPriority.body.items.map((card: { id: string }) => card.id)).toEqual([urgent]);

    const byLabel = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}/search?label=${label}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(byLabel.body.items.map((card: { id: string }) => card.id)).toEqual([urgent]);

    const byAssignee = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}/search?assignee=${alice.userId}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(byAssignee.body.items.map((card: { id: string }) => card.id)).toEqual([urgent]);

    const withDeadline = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}/search?hasDeadline=true`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(withDeadline.body.items.map((card: { id: string }) => card.id)).toEqual([urgent]);

    const withoutDeadline = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}/search?hasDeadline=false`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(withoutDeadline.body.items.map((card: { id: string }) => card.id)).toEqual([plain]);
  });

  it('searches globally across the user boards only', async () => {
    const alice = await register('alice@example.com');
    const aliceBoard = await createBoard(alice, 'Alice Board');
    const aliceColumn = await createColumn(alice, aliceBoard, 'To Do');
    const aliceCard = await createCard(alice, aliceColumn, 'Alice secret plan');

    const bob = await register('bob@example.com');
    const bobBoard = await createBoard(bob, 'Bob Board');
    const bobColumn = await createColumn(bob, bobBoard, 'To Do');
    await createCard(bob, bobColumn, 'Alice secret from bob');

    const global = await request(app.getHttpServer())
      .get('/api/search?q=secret')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(global.body.total).toBe(1);
    expect(global.body.items[0].id).toBe(aliceCard);
  });

  it('scopes board search to the owner (404 for another board)', async () => {
    const alice = await register('alice@example.com');
    const aliceBoard = await createBoard(alice, 'Alice Board');
    const aliceColumn = await createColumn(alice, aliceBoard, 'To Do');
    await createCard(alice, aliceColumn, 'Task');

    const bob = await register('bob@example.com');

    const response = await request(app.getHttpServer())
      .get(`/api/boards/${aliceBoard}/search?q=task`)
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(404);
    expect(response.body).toMatchObject({ error: 'BOARD_NOT_FOUND' });
  });
});
