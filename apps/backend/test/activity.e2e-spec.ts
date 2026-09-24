import type { ReadableStreamDefaultReader, ReadableStreamReadResult } from 'node:stream/web';
import request from 'supertest';
import {
  createBoard,
  createCard,
  createColumn,
  createTestApp,
  registerUser,
  truncateAllTables,
  type TestApp,
} from './utils';

async function readChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs = 10_000,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  return Promise.race([
    reader.read(),
    new Promise<never>((_resolve, reject) =>
      setTimeout(() => reject(new Error('Timed out waiting for SSE data')), timeoutMs),
    ),
  ]);
}

describe('Activity (e2e)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp({ listen: true });
  });

  beforeEach(async () => {
    await truncateAllTables(testApp.prisma);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('rejects requests without an access token', async () => {
    await request(testApp.app.getHttpServer()).get('/api/boards/x/activity').expect(401);
  });

  it("never exposes another user's board activity (404)", async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'Private');

    const bob = await registerUser(testApp.app, 'bob@example.com');

    const response = await request(testApp.app.getHttpServer())
      .get(`/api/boards/${board.id}/activity`)
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(404);

    expect(response.body).toMatchObject({ error: 'BOARD_NOT_FOUND' });
  });

  it('logs board, card and comment activity with the actor and paginates', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const column = await createColumn(testApp.app, alice, board.id, 'To Do');
    const card = await createCard(testApp.app, alice, column.id, 'First task');
    await request(testApp.app.getHttpServer())
      .post(`/api/cards/${card.id}/comments`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ content: 'ping' })
      .expect(201);

    const page = await request(testApp.app.getHttpServer())
      .get(`/api/boards/${board.id}/activity?page=1&limit=2`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(page.body).toMatchObject({ total: 3, page: 1, limit: 2 });
    expect(page.body.items).toHaveLength(2);
    expect(page.body.items[0]).toMatchObject({
      action: 'comment.created',
      boardId: board.id,
      userId: alice.userId,
      cardId: card.id,
    });

    const all = await request(testApp.app.getHttpServer())
      .get(`/api/boards/${board.id}/activity`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(all.body.items.map((item: { action: string }) => item.action)).toEqual([
      'comment.created',
      'card.created',
      'board.created',
    ]);
  });

  it('streams activity and heartbeat over SSE', async () => {
    const alice = await registerUser(testApp.app, 'alice@example.com');
    const board = await createBoard(testApp.app, alice, 'My Board');
    const column = await createColumn(testApp.app, alice, board.id, 'To Do');

    const controller = new AbortController();
    const response = await fetch(`${testApp.baseUrl}/api/boards/${board.id}/activity/stream`, {
      headers: { Authorization: `Bearer ${alice.token}` },
      signal: controller.signal,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(response.headers.get('x-accel-buffering')).toBe('no');

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('SSE response has no body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    await createCard(testApp.app, alice, column.id, 'Live task');

    const activityEvent = await (async () => {
      const deadline = Date.now() + 10_000;
      while (Date.now() < deadline) {
        const chunk = await readChunk(reader, deadline - Date.now());
        if (chunk.done) {
          break;
        }
        buffer += decoder.decode(chunk.value, { stream: true });
        if (buffer.includes('event: activity')) {
          return buffer;
        }
      }
      return buffer;
    })();

    expect(activityEvent).toContain('event: activity');
    expect(activityEvent).toContain('"action":"card.created"');

    const pingEvent = await (async () => {
      const deadline = Date.now() + 20_000;
      while (Date.now() < deadline) {
        const chunk = await readChunk(reader, deadline - Date.now());
        if (chunk.done) {
          break;
        }
        buffer += decoder.decode(chunk.value, { stream: true });
        if (buffer.includes('event: ping')) {
          return buffer;
        }
      }
      return buffer;
    })();

    expect(pingEvent).toContain('event: ping');

    controller.abort();
  }, 30_000);
});
