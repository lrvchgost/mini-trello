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

describe('Users (e2e)', () => {
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

  async function register(): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(credentials)
      .expect(201);

    return response.body.accessToken as string;
  }

  it('rejects requests without an access token', async () => {
    await request(app.getHttpServer()).get('/api/users').expect(401);
  });

  it('returns only the current user without a password', async () => {
    const token = await register();

    const response = await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ email: credentials.email, name: credentials.name });
    expect(response.body[0]).not.toHaveProperty('password');
  });

  it('updates the profile name', async () => {
    const token = await register();

    const updated = await request(app.getHttpServer())
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Alice Cooper' })
      .expect(200);

    expect(updated.body).toMatchObject({ name: 'Alice Cooper' });
    expect(updated.body).not.toHaveProperty('password');

    const list = await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body[0]).toMatchObject({ name: 'Alice Cooper' });
  });

  it('changes the password and invalidates existing refresh tokens', async () => {
    const agent = request.agent(app.getHttpServer());
    const registered = await agent.post('/api/auth/register').send(credentials).expect(201);
    const token = registered.body.accessToken as string;

    await agent
      .patch('/api/users/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: 'wrong-password', newPassword: 'newPassword123' })
      .expect(400);

    await agent
      .patch('/api/users/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: credentials.password, newPassword: 'newPassword123' })
      .expect(204);

    await agent.post('/api/auth/refresh').expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'newPassword123' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(401);
  });
});
