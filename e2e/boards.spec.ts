import { expect, test, type Page } from '@playwright/test';

/** Unique title so tests don't depend on each other's data. */
const unique = (base: string) =>
  `${base} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

async function createBoard(page: Page, title: string) {
  await page.goto('/');
  const newButton = page.getByRole('button', { name: /new board|create your first board/i });
  await newButton.click();
  await page.getByLabel('New board title').fill(title);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(boardTile(page, title)).toBeVisible();
}

const boardTile = (page: Page, title: string) =>
  page.getByRole('list', { name: 'Boards' }).getByRole('listitem').filter({ hasText: title });

test('creates a board and it survives a reload', async ({ page }) => {
  const title = unique('Roadmap');
  await createBoard(page, title);
  await page.reload();
  await expect(boardTile(page, title)).toBeVisible();
});

test('cancels board creation with Escape', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /new board|create your first board/i }).click();
  const input = page.getByLabel('New board title');
  await input.fill('Should not exist');
  await input.press('Escape');
  await expect(input).toBeHidden();
  await expect(page.getByText('Should not exist')).toHaveCount(0);
});

test('renames a board from the boards page', async ({ page }) => {
  const title = unique('Old name');
  const renamed = unique('New name');
  await createBoard(page, title);

  await page.getByRole('button', { name: `Rename board ${title}` }).click();
  const input = page.getByLabel('Board title');
  await input.fill(renamed);
  await input.press('Enter');

  await expect(boardTile(page, renamed)).toBeVisible();
  await page.reload();
  await expect(boardTile(page, renamed)).toBeVisible();
  await expect(boardTile(page, title)).toHaveCount(0);
});

test('Escape discards a rename', async ({ page }) => {
  const title = unique('Keep me');
  await createBoard(page, title);

  await page.getByRole('button', { name: `Rename board ${title}` }).click();
  const input = page.getByLabel('Board title');
  await input.fill('Discarded');
  await input.press('Escape');

  await expect(boardTile(page, title)).toBeVisible();
  await page.reload();
  await expect(boardTile(page, title)).toBeVisible();
});

test('opens a board and renames it from its page', async ({ page }) => {
  const title = unique('Project');
  const renamed = unique('Project X');
  await createBoard(page, title);

  await page.getByRole('link', { name: title }).click();
  await expect(page).toHaveURL(/\/boards\/[0-9a-f-]{36}$/);
  await expect(page).toHaveTitle(`${title} · Kanban`);

  await page.getByRole('heading', { level: 1 }).getByRole('button', { name: title }).click();
  const input = page.getByLabel('Board title');
  await input.fill(renamed);
  await input.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(renamed);

  await page.getByRole('link', { name: 'Back to boards' }).click();
  await expect(boardTile(page, renamed)).toBeVisible();
});

test('deletes a board from the boards page after confirmation', async ({ page }) => {
  const title = unique('Temporary');
  await createBoard(page, title);

  await page.getByRole('button', { name: `Delete board ${title}` }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(`Delete board “${title}”?`);

  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await expect(boardTile(page, title)).toBeVisible();

  await page.getByRole('button', { name: `Delete board ${title}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete board' }).click();
  await expect(boardTile(page, title)).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Boards' })).toBeVisible();
  await expect(boardTile(page, title)).toHaveCount(0);
});

test('deletes a board from its own page', async ({ page }) => {
  const title = unique('Delete inside');
  await createBoard(page, title);
  await page.getByRole('link', { name: title }).click();
  await expect(page).toHaveURL(/\/boards\//);

  await page.getByRole('button', { name: 'Delete board', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete board' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(boardTile(page, title)).toHaveCount(0);
});

test('shows a not-found message for an unknown board', async ({ page }) => {
  await page.goto('/boards/00000000-0000-4000-8000-000000000000');
  await expect(page.getByText('This board doesn’t exist.')).toBeVisible();
});
