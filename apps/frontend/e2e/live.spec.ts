import { expect, test } from '@playwright/test';
import { authStatePath } from './env';
import { openBoard, uniqueTitle } from './utils';

test('propagates a new card to a second browser context in real time', async ({
  browser,
  page,
}) => {
  await openBoard(page, 'Работа');
  const boardUrl = page.url();

  const secondContext = await browser.newContext({ storageState: authStatePath });
  const secondPage = await secondContext.newPage();
  // Wait for the second tab to open the realtime socket (it joins the board room on connect).
  const socketConnected = secondPage.waitForEvent('websocket', { timeout: 15_000 });

  try {
    await secondPage.goto(boardUrl);
    const secondColumn = secondPage.getByRole('region', { name: 'To Do' });
    await expect(secondColumn).toBeVisible();
    await socketConnected;

    const title = uniqueTitle('Live карточка');
    const firstColumn = page.getByRole('region', { name: 'To Do' });
    await firstColumn.getByRole('button', { name: 'Добавить карточку' }).click();
    await firstColumn.getByLabel('Название новой карточки').fill(title);
    await firstColumn.getByRole('button', { name: 'Добавить', exact: true }).click();

    await expect(firstColumn.getByText(title)).toBeVisible();
    // Arrives in the second tab through Socket.IO, not a manual refresh.
    await expect(secondColumn.getByText(title)).toBeVisible({ timeout: 15_000 });
  } finally {
    await secondContext.close();
  }
});
