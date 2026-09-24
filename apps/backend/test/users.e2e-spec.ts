import request from 'supertest';
import { createTestApp, registerUser, truncateAllTables, type TestApp } from './utils';

const credentials = {
  email: 'alice@example.com',
  name: 'Alice',
  password: 'password123',
};

describe('Users (e2e)', () => {
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

  it('rejects requests without an access token', async () => {
    await request(testApp.app.getHttpServer()).get('/api/users').expect(401);
  });

  it('returns only the current user without a password', async () => {
    const alice = await registerUser(testApp.app, credentials.email, { name: credentials.name });

    const response = await request(testApp.app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ email: credentials.email, name: credentials.name });
    expect(response.body[0]).not.toHaveProperty('password');
  });

  it('updates the profile name', async () => {
    const alice = await registerUser(testApp.app, credentials.email, { name: credentials.name });

    const updated = await request(testApp.app.getHttpServer())
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'Alice Cooper' })
      .expect(200);

    expect(updated.body).toMatchObject({ name: 'Alice Cooper' });
    expect(updated.body).not.toHaveProperty('password');

    const list = await request(testApp.app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(list.body[0]).toMatchObject({ name: 'Alice Cooper' });
  });

  it('changes the password and invalidates existing refresh tokens', async () => {
    const agent = request.agent(testApp.app.getHttpServer());
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

    await request(testApp.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'newPassword123' })
      .expect(200);

    await request(testApp.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(401);
  });
});
