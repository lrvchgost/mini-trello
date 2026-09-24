import { expect, test } from '@playwright/test';
import { dragCardToColumn, openBoard } from './utils';

// The "Личное" board of alice: first 8 seed cards land in "To Do".
const CARD_TITLE = 'Подготовить квартальный отчёт';

test('moves a card between columns via drag and drop', async ({ page }) => {
  await openBoard(page, 'Личное');

  const source = page.getByRole('region', { name: 'To Do' });
  const target = page.getByRole('region', { name: 'In Progress' });

  await expect(source.getByText(CARD_TITLE)).toBeVisible();

  await dragCardToColumn(page, CARD_TITLE, 'In Progress');

  await expect(target.getByText(CARD_TITLE)).toBeVisible();
  await expect(source.getByText(CARD_TITLE)).toHaveCount(0);

  // Re-fetch after reload proves the move was persisted.
  await page.reload();
  await expect(
    page.getByRole('region', { name: 'In Progress' }).getByText(CARD_TITLE),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'To Do' }).getByText(CARD_TITLE)).toHaveCount(0);
});
