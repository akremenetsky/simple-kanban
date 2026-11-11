import { expect, test, type Page } from '@playwright/test';

const unique = (base: string) =>
  `${base} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Creates a board via the API and opens it. */
async function openNewBoard(page: Page) {
  const res = await page.request.post('/api/boards', { data: { title: unique('Lists board') } });
  expect(res.ok()).toBe(true);
  const board = (await res.json()) as { id: string };
  await page.goto(`/boards/${board.id}`);
  await expect(page.getByRole('button', { name: 'Add list' })).toBeVisible();
}

const columnTitles = (page: Page) => page.getByRole('region').getByRole('heading', { level: 2 });

async function addLists(page: Page, titles: string[]) {
  await page.getByRole('button', { name: 'Add list' }).click();
  const input = page.getByLabel('New list title');
  for (const title of titles) {
    await input.fill(title);
    await input.press('Enter');
    await expect(page.getByRole('region', { name: title })).toBeVisible();
    await expect(input).toHaveValue('');
  }
  await input.press('Escape');
}

test('adds lists in order and keeps them after reload', async ({ page }) => {
  await openNewBoard(page);
  await addLists(page, ['To do', 'Doing', 'Done']);

  await expect(columnTitles(page)).toHaveText(['To do', 'Doing', 'Done']);
  await page.reload();
  await expect(columnTitles(page)).toHaveText(['To do', 'Doing', 'Done']);
});

test('renames a list', async ({ page }) => {
  await openNewBoard(page);
  await addLists(page, ['Backlog']);

  await page
    .getByRole('region', { name: 'Backlog' })
    .getByRole('button', { name: 'Backlog', exact: true })
    .click();
  const input = page.getByLabel('List title');
  await input.fill('Icebox');
  await input.press('Enter');

  await expect(columnTitles(page)).toHaveText(['Icebox']);
  await page.reload();
  await expect(columnTitles(page)).toHaveText(['Icebox']);
});

test('deletes a list after confirmation', async ({ page }) => {
  await openNewBoard(page);
  await addLists(page, ['Keep', 'Remove']);

  await page.getByRole('button', { name: 'Delete list Remove' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Delete list “Remove”?');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(columnTitles(page)).toHaveText(['Keep', 'Remove']);

  await page.getByRole('button', { name: 'Delete list Remove' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete list' }).click();
  await expect(columnTitles(page)).toHaveText(['Keep']);
  await page.reload();
  await expect(columnTitles(page)).toHaveText(['Keep']);
});

test('cancelling the add-list form does not create a list', async ({ page }) => {
  await openNewBoard(page);
  await page.getByRole('button', { name: 'Add list' }).click();
  await page.getByLabel('New list title').fill('Nope');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(columnTitles(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add list' })).toBeVisible();
});
