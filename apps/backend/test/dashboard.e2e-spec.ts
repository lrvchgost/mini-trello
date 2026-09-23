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

describe('Dashboard (e2e)', () => {
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

  async function setDone(session: Session, columnId: string): Promise<void> {
    await request(app.getHttpServer())
      .patch(`/api/columns/${columnId}`)
      .set('Authorization', `Bearer ${session.token}`)
      .send({ isDone: true })
      .expect(200);
  }

  async function createCard(
    session: Session,
    columnId: string,
    title: string,
    deadline?: string,
  ): Promise<void> {
    await request(app.getHttpServer())
      .post(`/api/columns/${columnId}/cards`)
      .set('Authorization', `Bearer ${session.token}`)
      .send({ title, ...(deadline ? { deadline } : {}) })
      .expect(201);
  }

  it('rejects requests without an access token', async () => {
    await request(app.getHttpServer()).get('/api/dashboard/stats').expect(401);
  });

  it('aggregates stats for the owner only', async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'My Board');
    const todo = await createColumn(alice, boardId, 'To Do');
    const done = await createColumn(alice, boardId, 'Done');
    await setDone(alice, done);

    const past = new Date(Date.now() - 86_400_000).toISOString();
    const future = new Date(Date.now() + 86_400_000).toISOString();

    await createCard(alice, todo, 'Overdue', past);
    await createCard(alice, todo, 'Future', future);
    await createCard(alice, todo, 'No deadline');
    await createCard(alice, done, 'Done but overdue', past);

    const response = await request(app.getHttpServer())
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(response.body).toEqual({
      totalBoards: 1,
      totalCards: 4,
      cardsByStatus: [
        { columnId: todo, columnTitle: 'To Do', count: 3 },
        { columnId: done, columnTitle: 'Done', count: 1 },
      ],
      overdueCards: 1,
    });
  });

  it('does not count other users boards', async () => {
    const alice = await register('alice@example.com');
    const aliceBoard = await createBoard(alice, 'Alice');
    const aliceColumn = await createColumn(alice, aliceBoard, 'To Do');
    await createCard(alice, aliceColumn, 'Alice card');

    const bob = await register('bob@example.com');
    const bobBoard = await createBoard(bob, 'Bob');
    const bobColumn = await createColumn(bob, bobBoard, 'To Do');
    await createCard(bob, bobColumn, 'Bob card');
    await createCard(bob, bobColumn, 'Bob card 2');

    const response = await request(app.getHttpServer())
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(response.body).toMatchObject({ totalBoards: 1, totalCards: 1 });
  });
});
