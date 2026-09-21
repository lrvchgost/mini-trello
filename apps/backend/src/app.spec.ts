import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { configureApp } from './setup-app';

describe('Application bootstrap (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/min_trello';
    process.env.REDIS_URL ??= 'redis://localhost:6379';
    process.env.JWT_SECRET ??= 'test-secret-key-1234567890';
    process.env.CORS_ORIGIN ??= 'http://localhost:5173';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health returns 200 with status ok', async () => {
    const response = await request(app.getHttpServer()).get('/api/health').expect(200);

    expect(response.body).toMatchObject({ status: 'ok' });
  });

  it('GET /api/docs serves Swagger UI', async () => {
    await request(app.getHttpServer()).get('/api/docs').expect(200);
  });

  it('unknown route returns 404 in ApiError format', async () => {
    const response = await request(app.getHttpServer()).get('/api/does-not-exist').expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      error: 'NOT_FOUND',
      path: '/api/does-not-exist',
    });
    expect(typeof response.body.message).toBe('string');
    expect(typeof response.body.timestamp).toBe('string');
  });
});
