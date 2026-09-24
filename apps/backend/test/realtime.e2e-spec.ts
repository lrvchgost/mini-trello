import request from 'supertest';
import { io, type Socket } from 'socket.io-client';
import {
  createBoard,
  createCard,
  createColumn,
  createTestApp,
  registerUser,
  truncateAllTables,
  type TestApp,
} from './utils';

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
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp({ listen: true });
  });

  beforeEach(async () => {
    await truncateAllTables(testApp.prisma);
  });

  afterEach(() => {
    while (sockets.length > 0) {
      sockets.pop()?.close();
    }
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('rejects a connection without an access token', async () => {
    await expect(connect(testApp.baseUrl)).rejects.toThrow();
  });

  it('rejects a connection with an invalid token', async () => {
    await expect(connect(testApp.baseUrl, 'not-a-jwt')).rejects.toThrow();
  });

  it("refuses to join another user's board with FORBIDDEN", async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'Private');
    const bob = await registerUser(testApp.app, 'bob@example.com');

    const socket = await connect(testApp.baseUrl, bob.token);
    const errorPromise = waitForEvent<{ code: string }>(socket, 'error');
    socket.emit('joinBoard', { boardId: board.id, clientId: 'tab-b' });

    await expect(errorPromise).resolves.toEqual({ code: 'FORBIDDEN' });
  });

  it('delivers card.moved from one tab to another on the same board', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const from = await createColumn(testApp.app, alice, board.id, 'To Do');
    const to = await createColumn(testApp.app, alice, board.id, 'Done');
    const card = await createCard(testApp.app, alice, from.id, 'First task');

    const tabA = await connect(testApp.baseUrl, alice.token);
    const tabB = await connect(testApp.baseUrl, alice.token);
    await joinBoard(tabA, board.id, 'tab-a');
    await joinBoard(tabB, board.id, 'tab-b');

    const received = waitForEvent<{
      cardId: string;
      targetColumnId: string;
      newOrder: number;
      actorId: string;
      clientId: string;
    }>(tabB, 'card.moved');

    await request(testApp.app.getHttpServer())
      .patch(`/api/cards/${card.id}/move`)
      .set('Authorization', `Bearer ${alice.token}`)
      .set('X-Client-Id', 'tab-a')
      .send({ columnId: to.id, order: 0 })
      .expect(200);

    await expect(received).resolves.toEqual({
      cardId: card.id,
      targetColumnId: to.id,
      newOrder: 0,
      actorId: alice.userId,
      clientId: 'tab-a',
    });
  }, 15_000);
});
