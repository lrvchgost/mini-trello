import { expect, test } from '@playwright/test';
import { openBoard } from './utils';

test('filters board cards by search text and priority', async ({ page }) => {
  await openBoard(page, 'Личное');

  await page.getByLabel('Поиск по карточкам').fill('квартальный');
  await expect(page.getByText('Найдено карточек: 1')).toBeVisible();
  await expect(page.getByText('Подготовить квартальный отчёт')).toBeVisible();
  await expect(page.getByText('Обновить зависимости проекта')).toHaveCount(0);
  await expect(page).toHaveURL(/[?&]q=/);

  // Resetting restores the kanban view.
  await page.getByRole('button', { name: 'Сбросить' }).click();
  await expect(page.getByRole('region', { name: 'To Do' })).toBeVisible();

  // Priority filter: the personal board has exactly five urgent cards.
  await page.getByLabel('Приоритет').selectOption('urgent');
  await expect(page.getByText('Найдено карточек: 5')).toBeVisible();
  await expect(page.getByText('Починить падение на логине')).toBeVisible();
  await expect(page.getByText('Подготовить квартальный отчёт')).toHaveCount(0);
  await expect(page).toHaveURL(/[?&]priority=urgent/);
});
