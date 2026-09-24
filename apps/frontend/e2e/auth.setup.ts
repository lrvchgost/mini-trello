import { expect, test as setup } from '@playwright/test';
import { authStatePath } from './env';

const ALICE_EMAIL = 'alice@example.com';
const SEED_PASSWORD = 'password123';

setup('authenticate as the seed user alice', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ALICE_EMAIL);
  await page.getByLabel('Пароль').fill(SEED_PASSWORD);
  await page.getByRole('button', { name: 'Войти' }).click();

  await expect(page.getByRole('heading', { name: 'Дашборд' })).toBeVisible();
  await page.context().storageState({ path: authStatePath });
});
