import { describe, expect, it } from 'vitest';
import { parseClientEnv, parseServerEnv } from './parse';

const validEnv = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/min_trello',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'super-secret-key-1234567890',
};

describe('parseServerEnv', () => {
  it('parses a valid environment and applies defaults', () => {
    const env = parseServerEnv(validEnv);

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.COOKIE_SECURE).toBe(false);
    expect(env.REFRESH_GRACE_SECONDS).toBe(60);
    expect(env.JWT_ACCESS_EXPIRES_IN).toBe('15m');
  });

  it('coerces numeric and boolean strings', () => {
    const env = parseServerEnv({ ...validEnv, PORT: '4000', COOKIE_SECURE: '1' });

    expect(env.PORT).toBe(4000);
    expect(env.COOKIE_SECURE).toBe(true);
  });

  it('treats COOKIE_SECURE=false as false (not the Boolean("false") trap)', () => {
    expect(parseServerEnv({ ...validEnv, COOKIE_SECURE: 'false' }).COOKIE_SECURE).toBe(false);
  });

  it('throws with the list of missing fields when env is empty', () => {
    expect(() => parseServerEnv({})).toThrowError(/Invalid server environment/);
    expect(() => parseServerEnv({})).toThrowError(/DATABASE_URL/);
    expect(() => parseServerEnv({})).toThrowError(/REDIS_URL/);
    expect(() => parseServerEnv({})).toThrowError(/JWT_SECRET/);
  });

  it('rejects a too-short JWT secret', () => {
    expect(() => parseServerEnv({ ...validEnv, JWT_SECRET: 'short' })).toThrowError(/JWT_SECRET/);
  });
});

describe('parseClientEnv', () => {
  it('applies same-origin defaults', () => {
    expect(parseClientEnv({})).toEqual({ VITE_API_URL: '/api', VITE_WS_URL: '/' });
  });

  it('reads client overrides', () => {
    const env = parseClientEnv({
      VITE_API_URL: 'http://localhost:3000/api',
      VITE_WS_URL: 'ws://localhost:3000',
    });

    expect(env.VITE_API_URL).toBe('http://localhost:3000/api');
    expect(env.VITE_WS_URL).toBe('ws://localhost:3000');
  });
});
