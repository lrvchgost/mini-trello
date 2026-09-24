import request from 'supertest';
import { createTestApp, truncateAllTables, type TestApp } from './utils';

describe('Application (e2e)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  beforeEach(async () => {
    await truncateAllTables(testApp.prisma);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('GET /api/health reports ok with db up', async () => {
    const response = await request(testApp.app.getHttpServer()).get('/api/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      info: { db: { status: 'up' } },
    });
  });

  it('GET /api/docs serves Swagger UI', async () => {
    await request(testApp.app.getHttpServer()).get('/api/docs').expect(200);
  });

  it('unknown route returns 404 in ApiError format', async () => {
    const response = await request(testApp.app.getHttpServer()).get('/api/unknown').expect(404);

    expect(response.body).toMatchObject({ statusCode: 404, error: 'NOT_FOUND' });
  });
});
