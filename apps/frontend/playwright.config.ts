import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';
import {
  authStatePath,
  backendOrigin,
  backendPort,
  frontendOrigin,
  repoRoot,
  testDatabaseUrl,
} from './e2e/env';

const isCI = Boolean(process.env.CI);

/**
 * Local dev uses the installed Google Chrome (the bundled Chromium is not
 * available on every host); CI installs the bundled browser via
 * `playwright install --with-deps chromium`. `PLAYWRIGHT_CHANNEL` overrides both.
 */
const browserUse: NonNullable<PlaywrightTestConfig['use']> = {
  baseURL: frontendOrigin,
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  ...(process.env.PLAYWRIGHT_CHANNEL
    ? { channel: process.env.PLAYWRIGHT_CHANNEL as 'chrome' }
    : isCI
      ? {}
      : { channel: 'chrome' }),
};

export default defineConfig({
  testDir: './e2e',
  // One worker keeps the shared test database deterministic; specs are independent.
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  globalSetup: './e2e/global-setup.ts',
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: browserUse,
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: authStatePath },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      name: 'backend',
      command: 'pnpm --filter @min-trello/backend e2e:serve',
      cwd: repoRoot,
      url: `${backendOrigin}/api/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        DATABASE_URL: testDatabaseUrl,
        DATABASE_URL_TEST: testDatabaseUrl,
        PORT: backendPort,
        CORS_ORIGIN: frontendOrigin,
      },
    },
    {
      name: 'frontend',
      command: 'pnpm --filter @min-trello/frontend dev:e2e',
      cwd: repoRoot,
      url: frontendOrigin,
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
