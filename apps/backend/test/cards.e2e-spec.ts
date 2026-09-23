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

interface BoardColumn {
  id: string;
  cards: Array<{ id: string; order: number }>;
}

describe('Cards (e2e)', () => {
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
  ): Promise<{ id: string; order: number }> {
    const response = await request(app.getHttpServer())
      .post(`/api/columns/${columnId}/cards`)
      .set('Authorization', `Bearer ${session.token}`)
      .send({ title })
      .expect(201);

    return response.body as { id: string; order: number };
  }

  async function boardColumns(session: Session, boardId: string): Promise<BoardColumn[]> {
    const response = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${session.token}`)
      .expect(200);

    return (response.body.columns as BoardColumn[]).map((column) => ({
      id: column.id,
      cards: column.cards.map((card) => ({ id: card.id, order: card.order })),
    }));
  }

  it('rejects requests without an access token', async () => {
    await request(app.getHttpServer()).get('/api/cards/x').expect(401);
  });

  it('creates cards with sequential order 0, 1', async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'My Board');
    const columnId = await createColumn(alice, boardId, 'To Do');

    const first = await createCard(alice, columnId, 'First');
    const second = await createCard(alice, columnId, 'Second');

    expect([first.order, second.order]).toEqual([0, 1]);
  });

  it('returns a card with assignee and labels', async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'My Board');
    const columnId = await createColumn(alice, boardId, 'To Do');
    const card = await createCard(alice, columnId, 'First');

    const response = await request(app.getHttpServer())
      .get(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: card.id,
      title: 'First',
      priority: 'medium',
      assignee: null,
      labels: [],
    });
  });

  it('updates a card', async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'My Board');
    const columnId = await createColumn(alice, boardId, 'To Do');
    const card = await createCard(alice, columnId, 'First');

    const response = await request(app.getHttpServer())
      .patch(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ title: 'Renamed', priority: 'high', description: 'Details' })
      .expect(200);

    expect(response.body).toMatchObject({
      id: card.id,
      title: 'Renamed',
      priority: 'high',
      description: 'Details',
    });
  });

  it('rejects a stale expectedUpdatedAt with 409', async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'My Board');
    const columnId = await createColumn(alice, boardId, 'To Do');
    const card = await createCard(alice, columnId, 'First');

    const detail = await request(app.getHttpServer())
      .get(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    await new Promise((resolve) => setTimeout(resolve, 5));

    await request(app.getHttpServer())
      .patch(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ title: 'First edit', expectedUpdatedAt: detail.body.updatedAt })
      .expect(200);

    const conflict = await request(app.getHttpServer())
      .patch(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ title: 'Second edit', expectedUpdatedAt: detail.body.updatedAt })
      .expect(409);

    expect(conflict.body).toMatchObject({ error: 'CONFLICT' });
  });

  it('reorders cards within a column without gaps', async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'My Board');
    const columnId = await createColumn(alice, boardId, 'To Do');
    const first = await createCard(alice, columnId, 'First');
    const second = await createCard(alice, columnId, 'Second');
    const third = await createCard(alice, columnId, 'Third');

    await request(app.getHttpServer())
      .patch(`/api/cards/${third.id}/move`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ columnId, order: 0 })
      .expect(200);

    const [column] = await boardColumns(alice, boardId);
    expect(column!.cards.map((c) => c.id)).toEqual([third.id, first.id, second.id]);
    expect(column!.cards.map((c) => c.order)).toEqual([0, 1, 2]);
  });

  it('renumbers both columns when moving a card across them', async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'My Board');
    const todo = await createColumn(alice, boardId, 'To Do');
    const doing = await createColumn(alice, boardId, 'Doing');

    const todoA = await createCard(alice, todo, 'A');
    const todoB = await createCard(alice, todo, 'B');
    const doingX = await createCard(alice, doing, 'X');
    const doingY = await createCard(alice, doing, 'Y');

    await request(app.getHttpServer())
      .patch(`/api/cards/${todoA.id}/move`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ columnId: doing, order: 1 })
      .expect(200);

    const columns = await boardColumns(alice, boardId);
    const [todoColumn, doingColumn] = columns;

    expect(todoColumn!.cards.map((c) => c.id)).toEqual([todoB.id]);
    expect(todoColumn!.cards.map((c) => c.order)).toEqual([0]);
    expect(doingColumn!.cards.map((c) => c.id)).toEqual([doingX.id, todoA.id, doingY.id]);
    expect(doingColumn!.cards.map((c) => c.order)).toEqual([0, 1, 2]);
  });

  it('moves a card into an empty column', async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'My Board');
    const todo = await createColumn(alice, boardId, 'To Do');
    const done = await createColumn(alice, boardId, 'Done');
    const card = await createCard(alice, todo, 'A');

    await request(app.getHttpServer())
      .patch(`/api/cards/${card.id}/move`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ columnId: done, order: 0 })
      .expect(200);

    const [, doneColumn] = await boardColumns(alice, boardId);
    expect(doneColumn!.cards.map((c) => c.id)).toEqual([card.id]);
    expect(doneColumn!.cards.map((c) => c.order)).toEqual([0]);
  });

  it('assigns the board owner and clears the assignee', async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'My Board');
    const columnId = await createColumn(alice, boardId, 'To Do');
    const card = await createCard(alice, columnId, 'First');

    const assigned = await request(app.getHttpServer())
      .patch(`/api/cards/${card.id}/assignee`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ assigneeId: alice.userId })
      .expect(200);
    expect(assigned.body.assigneeId).toBe(alice.userId);

    const cleared = await request(app.getHttpServer())
      .patch(`/api/cards/${card.id}/assignee`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ assigneeId: null })
      .expect(200);
    expect(cleared.body.assigneeId).toBeNull();
  });

  it('rejects an assignee that is not the board owner with 422', async () => {
    const alice = await register('alice@example.com');
    const bob = await register('bob@example.com');
    const boardId = await createBoard(alice, 'My Board');
    const columnId = await createColumn(alice, boardId, 'To Do');
    const card = await createCard(alice, columnId, 'First');

    const response = await request(app.getHttpServer())
      .patch(`/api/cards/${card.id}/assignee`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ assigneeId: bob.userId })
      .expect(422);

    expect(response.body).toMatchObject({ error: 'INVALID_ASSIGNEE' });
  });

  it('deletes a card', async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'My Board');
    const columnId = await createColumn(alice, boardId, 'To Do');
    const card = await createCard(alice, columnId, 'First');

    await request(app.getHttpServer())
      .delete(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(404);
  });

  it("never exposes another user's cards (404)", async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'Private');
    const columnId = await createColumn(alice, boardId, 'To Do');
    const card = await createCard(alice, columnId, 'Secret');

    const bob = await register('bob@example.com');

    const read = await request(app.getHttpServer())
      .get(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(404);
    expect(read.body).toMatchObject({ error: 'BOARD_NOT_FOUND' });

    await request(app.getHttpServer())
      .patch(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ title: 'Hacked' })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(404);
  });

  it('refuses to move a card into a column of another board (404)', async () => {
    const alice = await register('alice@example.com');
    const bob = await register('bob@example.com');

    const aliceBoard = await createBoard(alice, 'Alice');
    const aliceColumn = await createColumn(alice, aliceBoard, 'To Do');
    const card = await createCard(alice, aliceColumn, 'Task');

    const bobBoard = await createBoard(bob, 'Bob');
    const bobColumn = await createColumn(bob, bobBoard, 'To Do');

    const response = await request(app.getHttpServer())
      .patch(`/api/cards/${card.id}/move`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ columnId: bobColumn, order: 0 })
      .expect(404);

    expect(response.body).toMatchObject({ error: 'COLUMN_NOT_FOUND' });
  });
});
