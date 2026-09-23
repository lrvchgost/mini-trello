import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { io, type Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/setup-app';
import { truncateAllTables } from './truncate';

interface Session {
  token: string;
  userId: string;
}

const sockets: Socket[] = [];

function connect(url: string, token?: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(url, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      reconnection: false,
    });
    sockets.push(socket);
    const timer = setTimeout(() => reject(new Error('connect timeout')), 5_000);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function waitForEvent<T>(socket: Socket, event: string, timeoutMs = 5_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for "${event}"`)),
      timeoutMs,
    );
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function joinBoard(socket: Socket, boardId: string, clientId: string): Promise<void> {
  return new Promise((resolve) => {
    socket.emit('joinBoard', { boardId, clientId }, () => resolve());
  });
}

describe('Realtime (e2e)', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address ? address.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  beforeEach(async () => {
    await truncateAllTables(app.get(PrismaService));
  });

  afterEach(() => {
    while (sockets.length > 0) {
      sockets.pop()?.close();
    }
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

  it('rejects a connection without an access token', async () => {
    await expect(connect(baseUrl)).rejects.toThrow();
  });

  it('rejects a connection with an invalid token', async () => {
    await expect(connect(baseUrl, 'not-a-jwt')).rejects.toThrow();
  });

  it("refuses to join another user's board with FORBIDDEN", async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'Private');
    const bob = await register('bob@example.com');

    const socket = await connect(baseUrl, bob.token);
    const errorPromise = waitForEvent<{ code: string }>(socket, 'error');
    socket.emit('joinBoard', { boardId, clientId: 'tab-b' });

    await expect(errorPromise).resolves.toEqual({ code: 'FORBIDDEN' });
  });

  it('delivers card.moved from one tab to another on the same board', async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'My Board');
    const from = await createColumn(alice, boardId, 'To Do');
    const to = await createColumn(alice, boardId, 'Done');
    const cardId = await createCard(alice, from, 'First task');

    const tabA = await connect(baseUrl, alice.token);
    const tabB = await connect(baseUrl, alice.token);
    await joinBoard(tabA, boardId, 'tab-a');
    await joinBoard(tabB, boardId, 'tab-b');

    const received = waitForEvent<{
      cardId: string;
      targetColumnId: string;
      newOrder: number;
      actorId: string;
      clientId: string;
    }>(tabB, 'card.moved');

    await request(app.getHttpServer())
      .patch(`/api/cards/${cardId}/move`)
      .set('Authorization', `Bearer ${alice.token}`)
      .set('X-Client-Id', 'tab-a')
      .send({ columnId: to, order: 0 })
      .expect(200);

    await expect(received).resolves.toEqual({
      cardId,
      targetColumnId: to,
      newOrder: 0,
      actorId: alice.userId,
      clientId: 'tab-a',
    });
  }, 15_000);
});
