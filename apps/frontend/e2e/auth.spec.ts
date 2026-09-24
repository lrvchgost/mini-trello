import { expect, test } from '@playwright/test';

test.describe('authentication', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('registers a new account and lands on the dashboard', async ({ page }) => {
    const name = 'E2E Пользователь';
    const email = `e2e-${Date.now().toString(36)}@example.com`;

    await page.goto('/register');
    await page.getByLabel('Имя').fill(name);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Пароль').fill('password123');
    await page.getByRole('button', { name: 'Создать аккаунт' }).click();

    await expect(page.getByRole('heading', { name: 'Дашборд' })).toBeVisible();
    await expect(page.getByRole('button', { name })).toBeVisible();
  });

  test('rejects invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('alice@example.com');
    await page.getByLabel('Пароль').fill('wrong-password');
    await page.getByRole('button', { name: 'Войти' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
