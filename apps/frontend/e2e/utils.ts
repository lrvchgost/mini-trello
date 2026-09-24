import { expect, type Locator, type Page } from '@playwright/test';

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Unique title so repeated runs never collide with each other. */
export function uniqueTitle(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Opens a board from the dashboard by its title and waits for it to render. */
export async function openBoard(page: Page, title: string): Promise<void> {
  await page.goto('/dashboard');
  const link = page.getByRole('link', { name: new RegExp(escapeRegExp(title)) });
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/boards\/[^/]+$/);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
}

/**
 * Drag & drop via mouse events. `@hello-pangea/dnd` is pointer based (it does not
 * use the native HTML5 drag&drop API), so `locator.dragTo` is not enough.
 */
export async function dragCardToColumn(
  page: Page,
  cardTitle: string,
  targetColumn: string,
): Promise<void> {
  const card: Locator = page.getByText(cardTitle, { exact: false }).first();
  const target = page.getByRole('region', { name: targetColumn });

  await card.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();

  const cardBox = await card.boundingBox();
  const targetBox = await target.boundingBox();
  if (!cardBox || !targetBox) {
    throw new Error('Could not resolve drag source or drop target bounds');
  }

  const startX = cardBox.x + cardBox.width / 2;
  const startY = cardBox.y + cardBox.height / 2;
  const endX = targetBox.x + targetBox.width / 2;
  const endY = targetBox.y + 64;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Exceed the drag activation threshold, then travel to the target in steps.
  await page.mouse.move(startX, startY + 10, { steps: 6 });
  await page.mouse.move(endX, endY, { steps: 24 });
  await page.mouse.up();
}
