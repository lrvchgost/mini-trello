import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

export const TEST_PASSWORD = 'password123';

export interface TestSession {
  email: string;
  name: string;
  password: string;
  token: string;
  userId: string;
}

export function emailToName(email: string): string {
  return email.split('@')[0] ?? email;
}

export interface RegisterUserOverrides {
  name?: string;
  password?: string;
}

/**
 * Регистрирует пользователя и возвращает сессию (access-токен + id).
 * Используется как «логин» в интеграционных наборах, которым нужен владелец.
 */
export async function registerUser(
  app: INestApplication,
  email: string,
  overrides: RegisterUserOverrides = {},
): Promise<TestSession> {
  const name = overrides.name ?? emailToName(email);
  const password = overrides.password ?? TEST_PASSWORD;

  const response = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({ email, name, password })
    .expect(201);

  return {
    email,
    name,
    password,
    token: response.body.accessToken as string,
    userId: (response.body.user as { id: string }).id,
  };
}

/**
 * Логин существующего пользователя по `/api/auth/login`.
 * Возвращает access-токен.
 */
export async function loginAs(
  app: INestApplication,
  email: string,
  password: string = TEST_PASSWORD,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  return response.body.accessToken as string;
}
