import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

/**
 * globalSetup интеграционных тестов: применяет миграции к тестовой БД
 * (DATABASE_URL_TEST) до запуска тестов.
 */
export default function globalSetup(): void {
  const rootEnv = resolve(__dirname, '../../../.env');
  if (existsSync(rootEnv)) {
    config({ path: rootEnv });
  }

  const databaseUrl = process.env.DATABASE_URL_TEST;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL_TEST is required for integration tests');
  }

  execSync('pnpm exec prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
