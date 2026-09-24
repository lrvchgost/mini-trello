import { expect, test } from '@playwright/test';
import { openBoard, uniqueTitle } from './utils';

test('adds a comment to a card', async ({ page }) => {
  await openBoard(page, 'Личное');

  await page
    .getByRole('region', { name: 'To Do' })
    .getByText('Подготовить квартальный отчёт')
    .click();
  await expect(page).toHaveURL(/\/cards\/[^/]+/);

  const comments = page.getByRole('region', { name: 'Комментарии' });
  await expect(comments).toBeVisible();

  const text = uniqueTitle('E2E комментарий');
  await comments.getByLabel('Новый комментарий').fill(text);
  await comments.getByRole('button', { name: 'Отправить' }).click();

  await expect(comments.getByText(text)).toBeVisible();
});
