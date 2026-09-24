import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { repoRoot, testDatabaseUrl } from './env';

/**
 * Resets the isolated e2e database (drop + migrate + seed) so every run starts
 * from the deterministic seed data, regardless of what previous runs created.
 */
export default function globalSetup(): void {
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'reset', '--force'], {
    cwd: resolve(repoRoot, 'apps', 'backend'),
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
      DATABASE_URL_TEST: testDatabaseUrl,
    },
  });
}
