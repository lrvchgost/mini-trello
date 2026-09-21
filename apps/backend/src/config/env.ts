import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { parseServerEnv, type ServerEnv } from '@min-trello/shared';

export const APP_ENV = 'APP_ENV';

export type AppEnv = ServerEnv;

/**
 * Локальная разработка: `.env` лежит в корне монорепы, но backend запускается из
 * `apps/backend`. В Docker/CI переменные приходят из окружения, файл не нужен.
 */
function loadRootEnv(): void {
  const candidates = [resolve(process.cwd(), '.env'), resolve(__dirname, '../../../../.env')];

  const envFile = candidates.find((file) => existsSync(file));
  if (envFile) {
    loadDotenv({ path: envFile });
  }
}

export function loadEnv(): AppEnv {
  loadRootEnv();
  return parseServerEnv();
}
