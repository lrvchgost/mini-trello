import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const e2eDir = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(e2eDir, '..', '..', '..');
export const authStatePath = resolve(e2eDir, '.auth', 'alice.json');

function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) {
    return {};
  }

  const values: Record<string, string> = {};
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const separator = line.indexOf('=');
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) {
      values[key] = value;
    }
  }
  return values;
}

const rootEnv = readEnvFile(resolve(repoRoot, '.env'));

function required(name: string): string {
  const value = process.env[name] ?? rootEnv[name];
  if (!value) {
    throw new Error(`${name} is required for Playwright e2e (see .env.example)`);
  }
  return value;
}

/** Dedicated test database, wiped and re-seeded before every run. */
export const testDatabaseUrl = required('DATABASE_URL_TEST');

/** The e2e backend listens on its own port so a running dev server is not disturbed. */
export const backendPort = process.env.E2E_BACKEND_PORT ?? '3001';
export const backendOrigin = `http://localhost:${backendPort}`;

/** Vite dev server port, matching `apps/frontend/vite.config.ts`. */
export const frontendOrigin = process.env.E2E_FRONTEND_ORIGIN ?? 'http://localhost:5174';
