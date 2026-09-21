import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/setup-app';
import { truncateAllTables } from './truncate';

const credentials = {
  email: 'alice@example.com',
  name: 'Alice',
  password: 'password123',
};

describe('Auth (e2e)', () => {
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

  it('registers, refreshes without login, and logs out', async () => {
    const agent = request.agent(app.getHttpServer());

    const registered = await agent.post('/api/auth/register').send(credentials).expect(201);
    expect(registered.body).toMatchObject({
      user: { email: credentials.email, name: credentials.name },
      accessToken: expect.any(String),
    });
    expect(registered.body.user).not.toHaveProperty('password');

    const refreshed = await agent.post('/api/auth/refresh').expect(200);
    expect(refreshed.body.accessToken).toEqual(expect.any(String));

    const current = await agent
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${refreshed.body.accessToken}`)
      .expect(200);
    expect(current.body).toMatchObject({ email: credentials.email });
    expect(current.body).not.toHaveProperty('password');

    await agent.post('/api/auth/logout').expect(204);
    await agent.post('/api/auth/refresh').expect(401);
  });

  it('rejects requests without an access token', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('returns 409 EMAIL_TAKEN for a duplicate registration', async () => {
    await request(app.getHttpServer()).post('/api/auth/register').send(credentials).expect(201);

    const duplicate = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(credentials)
      .expect(409);

    expect(duplicate.body).toMatchObject({ error: 'EMAIL_TAKEN' });
  });

  it('logs in with valid credentials and rejects a wrong password', async () => {
    await request(app.getHttpServer()).post('/api/auth/register').send(credentials).expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'wrong-password' })
      .expect(401);

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);

    expect(login.body).toMatchObject({
      user: { email: credentials.email },
      accessToken: expect.any(String),
    });
    expect(login.body.user).not.toHaveProperty('password');
  });
});
