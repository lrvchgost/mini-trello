import request from 'supertest';
import { createTestApp, registerUser, truncateAllTables, type TestApp } from './utils';

const credentials = {
  email: 'alice@example.com',
  name: 'Alice',
  password: 'password123',
};

describe('Auth (e2e)', () => {
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

  it('registers, refreshes without login, and logs out', async () => {
    const agent = request.agent(testApp.app.getHttpServer());

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
    await request(testApp.app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('returns 409 EMAIL_TAKEN for a duplicate registration', async () => {
    await registerUser(testApp.app, credentials.email, { name: credentials.name });

    const duplicate = await request(testApp.app.getHttpServer())
      .post('/api/auth/register')
      .send(credentials)
      .expect(409);

    expect(duplicate.body).toMatchObject({ error: 'EMAIL_TAKEN' });
  });

  it('logs in with valid credentials and rejects a wrong password', async () => {
    await registerUser(testApp.app, credentials.email, { name: credentials.name });

    await request(testApp.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'wrong-password' })
      .expect(401);

    const login = await request(testApp.app.getHttpServer())
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
