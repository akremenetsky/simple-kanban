import { expect, test, type Page } from '@playwright/test';

const unique = (base: string) =>
  `${base} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Creates a board with the given lists via the API and opens it. */
async function openBoardWithLists(page: Page, listTitles: string[]) {
  const board = (await (
    await page.request.post('/api/boards', { data: { title: unique('Cards board') } })
  ).json()) as { id: string };
  for (const title of listTitles) {
    await page.request.post(`/api/boards/${board.id}/lists`, { data: { title } });
  }
  await page.goto(`/boards/${board.id}`);
  await expect(page.getByRole('region', { name: listTitles.at(-1) })).toBeVisible();
}

const column = (page: Page, list: string) => page.getByRole('region', { name: list });
const cardTitles = (page: Page, list: string) =>
  column(page, list)
    .getByRole('list', { name: `Cards in ${list}` })
    .getByRole('button');

async function addCards(page: Page, list: string, titles: string[]) {
  await column(page, list).getByRole('button', { name: 'Add card' }).click();
  const input = column(page, list).getByLabel('New card title');
  for (const title of titles) {
    await input.fill(title);
    await input.press('Enter');
    await expect(cardTitles(page, list).filter({ hasText: title })).toBeVisible();
    await expect(input).toHaveValue('');
  }
  await input.press('Escape');
}

test('adds cards to a list in order and keeps them after reload', async ({ page }) => {
  await openBoardWithLists(page, ['To do', 'Done']);
  await addCards(page, 'To do', ['First', 'Second', 'Third']);
  await addCards(page, 'Done', ['Shipped']);

  await expect(cardTitles(page, 'To do')).toHaveText(['First', 'Second', 'Third']);
  await page.reload();
  await expect(cardTitles(page, 'To do')).toHaveText(['First', 'Second', 'Third']);
  await expect(cardTitles(page, 'Done')).toHaveText(['Shipped']);
});

test('edits card title and description in the card dialog', async ({ page }) => {
  await openBoardWithLists(page, ['To do']);
  await addCards(page, 'To do', ['Draft']);

  await cardTitles(page, 'To do').filter({ hasText: 'Draft' }).click();
  const dialog = page.getByRole('dialog', { name: 'Card details' });
  await expect(dialog).toContainText('in list To do');

  await dialog.getByLabel('Card title').fill('Final title');
  await dialog.getByLabel('Card title').press('Enter');
  await dialog.getByLabel('Description').fill('Some details\non two lines');
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();

  await expect(cardTitles(page, 'To do')).toHaveText(['Final titleHas description']);
  await page.reload();
  await cardTitles(page, 'To do').first().click();
  await expect(page.getByLabel('Card title')).toHaveValue('Final title');
  await expect(page.getByLabel('Description')).toHaveValue('Some details\non two lines');
});

test('Escape closes the dialog and keeps edits', async ({ page }) => {
  await openBoardWithLists(page, ['To do']);
  await addCards(page, 'To do', ['Card']);

  await cardTitles(page, 'To do').first().click();
  await page.getByLabel('Description').fill('Typed then escaped');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.reload();
  await cardTitles(page, 'To do').first().click();
  await expect(page.getByLabel('Description')).toHaveValue('Typed then escaped');
});

test('an empty title is not saved', async ({ page }) => {
  await openBoardWithLists(page, ['To do']);
  await addCards(page, 'To do', ['Keep title']);

  await cardTitles(page, 'To do').first().click();
  await page.getByLabel('Card title').fill('   ');
  await page.getByRole('button', { name: 'Close' }).click();

  await page.reload();
  await expect(cardTitles(page, 'To do')).toHaveText(['Keep title']);
});

test('deletes a card after confirmation', async ({ page }) => {
  await openBoardWithLists(page, ['To do']);
  await addCards(page, 'To do', ['Keep', 'Remove']);

  await cardTitles(page, 'To do').filter({ hasText: 'Remove' }).click();
  await page.getByRole('button', { name: 'Delete card' }).click();
  const confirm = page.getByRole('dialog', { name: 'Delete card “Remove”?' });
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  await expect(confirm).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Card details' })).toBeVisible();

  await page.getByRole('button', { name: 'Delete card' }).click();
  await page
    .getByRole('dialog', { name: 'Delete card “Remove”?' })
    .getByRole('button', { name: 'Delete card' })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(cardTitles(page, 'To do')).toHaveText(['Keep']);
  await page.reload();
  await expect(cardTitles(page, 'To do')).toHaveText(['Keep']);
});

test('deleting a list removes its cards', async ({ page }) => {
  await openBoardWithLists(page, ['Doomed', 'Other']);
  await addCards(page, 'Doomed', ['Goes away']);

  await page.getByRole('button', { name: 'Delete list Doomed' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete list' }).click();
  await expect(column(page, 'Doomed')).toHaveCount(0);
  await expect(page.getByText('Goes away')).toHaveCount(0);
});
