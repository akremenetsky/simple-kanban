import { expect, test, type Locator, type Page } from '@playwright/test';

const unique = (base: string) =>
  `${base} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Creates a board with lists and cards via the API and opens it. */
async function openBoard(page: Page, layout: Record<string, string[]>) {
  const post = async (url: string, data: object) =>
    (await (await page.request.post(url, { data })).json()) as { id: string };
  const board = await post('/api/boards', { title: unique('DnD board') });
  for (const [listTitle, cards] of Object.entries(layout)) {
    const list = await post(`/api/boards/${board.id}/lists`, { title: listTitle });
    for (const title of cards) await post(`/api/lists/${list.id}/cards`, { title });
  }
  await page.goto(`/boards/${board.id}`);
  await expect(page.getByRole('region', { name: Object.keys(layout).at(-1) })).toBeVisible();
}

const column = (page: Page, list: string) => page.getByRole('region', { name: list });
const cards = (page: Page, list: string) =>
  column(page, list)
    .getByRole('list', { name: `Cards in ${list}` })
    .getByRole('button');
const card = (page: Page, list: string, title: string) =>
  cards(page, list).filter({ hasText: title });
/** dnd-kit's screen-reader live region; reflects the current drag state. */
const announcement = (page: Page) => page.locator('[id^="DndLiveRegion"]');
/** dnd-kit's keyboard sensor attaches its key listeners on the next tick after pick-up. */
async function pickUp(page: Page, name: string) {
  await page.keyboard.press('Space');
  await expect(announcement(page)).toHaveText(`Picked up ${name}.`);
  await page.waitForTimeout(50);
}

const listTitles = (page: Page) => page.getByRole('region').getByRole('heading', { level: 2 });

/** Drags with the mouse in small steps so dnd-kit sees a real pointer drag. */
async function drag(page: Page, source: Locator, target: Locator, at: 'top' | 'bottom' | 'center') {
  const from = (await source.boundingBox())!;
  const to = (await target.boundingBox())!;
  const sx = from.x + from.width / 2;
  const sy = from.y + from.height / 2;
  const tx = to.x + to.width / 2;
  const ty =
    at === 'top' ? to.y + 4 : at === 'bottom' ? to.y + to.height - 4 : to.y + to.height / 2;

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 8, sy + 8, { steps: 4 });
  await page.mouse.move(tx, ty, { steps: 20 });
  await page.mouse.move(tx, ty + 1, { steps: 2 });
  await page.mouse.up();
}

/** Waits until all move requests have settled, then reloads. */
async function reloadAfterSave(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.reload();
}

test('reorders cards within a list', async ({ page }) => {
  await openBoard(page, { 'To do': ['First', 'Second', 'Third'] });

  await drag(page, card(page, 'To do', 'Third'), card(page, 'To do', 'First'), 'top');
  await expect(cards(page, 'To do')).toHaveText(['Third', 'First', 'Second']);

  await reloadAfterSave(page);
  await expect(cards(page, 'To do')).toHaveText(['Third', 'First', 'Second']);
});

test('moves a card to another list between existing cards', async ({ page }) => {
  await openBoard(page, { 'To do': ['a1', 'a2'], Done: ['b1', 'b2'] });

  await drag(page, card(page, 'To do', 'a1'), card(page, 'Done', 'b2'), 'top');
  await expect(cards(page, 'To do')).toHaveText(['a2']);
  await expect(cards(page, 'Done')).toHaveText(['b1', 'a1', 'b2']);

  await reloadAfterSave(page);
  await expect(cards(page, 'To do')).toHaveText(['a2']);
  await expect(cards(page, 'Done')).toHaveText(['b1', 'a1', 'b2']);
});

test('moves a card into an empty list', async ({ page }) => {
  await openBoard(page, { 'To do': ['Lonely'], Empty: [] });

  await drag(page, card(page, 'To do', 'Lonely'), column(page, 'Empty'), 'center');
  await expect(cards(page, 'Empty')).toHaveText(['Lonely']);
  await expect(cards(page, 'To do')).toHaveCount(0);

  await reloadAfterSave(page);
  await expect(cards(page, 'Empty')).toHaveText(['Lonely']);
});

test('reorders lists by dragging the header', async ({ page }) => {
  await openBoard(page, { 'To do': ['x'], Doing: [], Done: ['y'] });

  const header = (title: string) => column(page, title).getByRole('heading', { level: 2 });
  await drag(page, header('Done'), header('To do'), 'center');
  await expect(listTitles(page)).toHaveText(['Done', 'To do', 'Doing']);

  await reloadAfterSave(page);
  await expect(listTitles(page)).toHaveText(['Done', 'To do', 'Doing']);
  await expect(cards(page, 'Done')).toHaveText(['y']);
});

test('dragging a card does not open it, clicking does', async ({ page }) => {
  await openBoard(page, { 'To do': ['One', 'Two'] });

  await drag(page, card(page, 'To do', 'Two'), card(page, 'To do', 'One'), 'top');
  await expect(cards(page, 'To do')).toHaveText(['Two', 'One']);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // dnd-kit swallows clicks for 50ms after a drop; a real user can't click that fast.
  await page.waitForTimeout(100);
  await card(page, 'To do', 'One').click();
  await expect(page.getByRole('dialog', { name: 'Card details' })).toBeVisible();
});

test('moves a card with the keyboard', async ({ page }) => {
  await openBoard(page, { 'To do': ['First', 'Second'] });

  await card(page, 'To do', 'First').focus();
  await pickUp(page, 'First');
  await page.keyboard.press('ArrowDown');
  await expect(announcement(page)).toHaveText('First is over Second.');
  await page.keyboard.press('Space');
  await expect(announcement(page)).toHaveText('First was dropped.');

  await expect(cards(page, 'To do')).toHaveText(['Second', 'First']);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await reloadAfterSave(page);
  await expect(cards(page, 'To do')).toHaveText(['Second', 'First']);
});

test('moves a list with the keyboard using its grip', async ({ page }) => {
  await openBoard(page, { 'To do': [], Doing: [], Done: [] });

  await page.getByRole('button', { name: 'Move list To do' }).focus();
  await pickUp(page, 'To do');
  await page.keyboard.press('ArrowRight');
  await expect(announcement(page)).toHaveText('To do is over Doing.');
  await page.keyboard.press('Space');
  await expect(announcement(page)).toHaveText('To do was dropped.');

  await expect(listTitles(page)).toHaveText(['Doing', 'To do', 'Done']);
  await reloadAfterSave(page);
  await expect(listTitles(page)).toHaveText(['Doing', 'To do', 'Done']);
});

test('typing a space while renaming a list does not start a drag', async ({ page }) => {
  await openBoard(page, { Backlog: [] });

  await column(page, 'Backlog').getByRole('button', { name: 'Backlog', exact: true }).click();
  const input = page.getByLabel('List title');
  await input.press('End');
  await input.pressSequentially(' two');
  await input.press('Enter');
  await expect(listTitles(page)).toHaveText(['Backlog two']);
});
