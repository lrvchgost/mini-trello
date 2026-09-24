import { expect, test } from '@playwright/test';
import { uniqueTitle } from './utils';

test('creates a board with a column and a card', async ({ page }) => {
  const boardTitle = uniqueTitle('E2E Доска');
  const cardTitle = uniqueTitle('Карточка');

  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Новая доска' }).first().click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill(boardTitle);
  await dialog.getByRole('button', { name: 'Создать', exact: true }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole('link', { name: new RegExp(boardTitle) }).click();
  await expect(page).toHaveURL(/\/boards\/[^/]+$/);
  await expect(page.getByRole('heading', { name: boardTitle })).toBeVisible();

  await page.getByRole('button', { name: 'Добавить колонку' }).click();
  await page.getByLabel('Название новой колонки').fill('To Do');
  await page.getByRole('button', { name: 'Создать колонку' }).click();

  const column = page.getByRole('region', { name: 'To Do' });
  await expect(column).toBeVisible();

  await column.getByRole('button', { name: 'Добавить карточку' }).click();
  await column.getByLabel('Название новой карточки').fill(cardTitle);
  await column.getByRole('button', { name: 'Добавить', exact: true }).click();

  await expect(column.getByText(cardTitle)).toBeVisible();

  // The card must survive a reload (persisted server-side, not just optimistic).
  await page.reload();
  await expect(page.getByRole('region', { name: 'To Do' }).getByText(cardTitle)).toBeVisible();
});
