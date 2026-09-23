import type { ReadableStreamDefaultReader, ReadableStreamReadResult } from 'node:stream/web';
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

  it('rejects requests without an access token', async () => {
    await request(app.getHttpServer()).get('/api/boards/x/activity').expect(401);
  });

  it("never exposes another user's board activity (404)", async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'Private');

    const bob = await register('bob@example.com');

    const response = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}/activity`)
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(404);

    expect(response.body).toMatchObject({ error: 'BOARD_NOT_FOUND' });
  });

  it('logs board, card and comment activity with the actor and paginates', async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'My Board');
    const columnId = await createColumn(alice, boardId, 'To Do');
    const cardId = await createCard(alice, columnId, 'First task');
    await request(app.getHttpServer())
      .post(`/api/cards/${cardId}/comments`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ content: 'ping' })
      .expect(201);

    const page = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}/activity?page=1&limit=2`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(page.body).toMatchObject({ total: 3, page: 1, limit: 2 });
    expect(page.body.items).toHaveLength(2);
    expect(page.body.items[0]).toMatchObject({
      action: 'comment.created',
      boardId,
      userId: alice.userId,
      cardId,
    });

    const all = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}/activity`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(all.body.items.map((item: { action: string }) => item.action)).toEqual([
      'comment.created',
      'card.created',
      'board.created',
    ]);
  });

  it('streams activity and heartbeat over SSE', async () => {
    const alice = await register('alice@example.com');
    const boardId = await createBoard(alice, 'My Board');
    const columnId = await createColumn(alice, boardId, 'To Do');

    const controller = new AbortController();
    const response = await fetch(`${baseUrl}/api/boards/${boardId}/activity/stream`, {
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

    await createCard(alice, columnId, 'Live task');

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
