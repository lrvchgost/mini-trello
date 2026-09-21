import { z } from 'zod';

const booleanFromEnv = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((value) => value === true || value === 'true' || value === '1');

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  DATABASE_URL_TEST: z.string().url().optional(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  REFRESH_GRACE_SECONDS: z.coerce.number().int().nonnegative().default(60),
  COOKIE_SECURE: booleanFromEnv.default(false),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  PORT: z.coerce.number().int().positive().default(3000),
});

export const clientEnvSchema = z.object({
  VITE_API_URL: z.string().default('/api'),
  VITE_WS_URL: z.string().default('/'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
