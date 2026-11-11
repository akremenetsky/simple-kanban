import { afterAll, describe, expect, it } from 'vitest';
import type { Board, Card, List } from '@kanban/shared';
import { createTestApp } from './helpers.js';

const app = createTestApp();
afterAll(() => app.close());

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

async function post<T>(url: string, payload: object): Promise<T> {
  const res = await app.inject({ method: 'POST', url, payload });
  expect(res.statusCode, res.body).toBeLessThan(300);
  return res.json<T>();
}

const createBoard = () => post<Board>('/api/boards', { title: 'B' });
const createList = (boardId: string, title: string) =>
  post<List>(`/api/boards/${boardId}/lists`, { title });
const createCard = (listId: string, title: string) =>
  post<Card>(`/api/lists/${listId}/cards`, { title });

const moveCard = (cardId: string, payload: object) =>
  app.inject({ method: 'POST', url: `/api/cards/${cardId}/move`, payload });
const moveList = (listId: string, payload: object) =>
  app.inject({ method: 'POST', url: `/api/lists/${listId}/move`, payload });

async function titlesByList(boardId: string, listIds: string[]) {
  const res = await app.inject({ method: 'GET', url: `/api/boards/${boardId}/cards` });
  const cards = res.json<Card[]>();
  return listIds.map((id) => cards.filter((c) => c.listId === id).map((c) => c.title));
}

async function listTitles(boardId: string) {
  const res = await app.inject({ method: 'GET', url: `/api/boards/${boardId}/lists` });
  return res.json<List[]>().map((l) => l.title);
}

async function setup() {
  const board = await createBoard();
  const a = await createList(board.id, 'A');
  const b = await createList(board.id, 'B');
  const cards: Record<string, Card> = {};
  for (const t of ['a1', 'a2', 'a3']) cards[t] = await createCard(a.id, t);
  for (const t of ['b1', 'b2']) cards[t] = await createCard(b.id, t);
  return { board, a, b, cards };
}

describe('POST /api/cards/:cardId/move', () => {
  it.each([
    ['a3', 0, ['a3', 'a1', 'a2']],
    ['a1', 2, ['a2', 'a3', 'a1']],
    ['a1', 1, ['a2', 'a1', 'a3']],
    ['a2', 1, ['a1', 'a2', 'a3']],
    ['a1', 99, ['a2', 'a3', 'a1']],
  ] as const)('reorders %s to index %i within its list', async (title, index, expected) => {
    const { board, a, b, cards } = await setup();
    const res = await moveCard(cards[title]!.id, { listId: a.id, index });
    expect(res.statusCode).toBe(200);
    expect(await titlesByList(board.id, [a.id, b.id])).toEqual([expected, ['b1', 'b2']]);
  });

  it.each([
    [0, ['a2', 'b1', 'b2']],
    [1, ['b1', 'a2', 'b2']],
    [2, ['b1', 'b2', 'a2']],
  ] as const)('moves a card to another list at index %i', async (index, expected) => {
    const { board, a, b, cards } = await setup();
    const res = await moveCard(cards.a2!.id, { listId: b.id, index });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: cards.a2!.id, listId: b.id, title: 'a2' });
    expect(await titlesByList(board.id, [a.id, b.id])).toEqual([['a1', 'a3'], expected]);
  });

  it('moves a card into an empty list', async () => {
    const { board, a, cards } = await setup();
    const empty = await createList(board.id, 'Empty');
    await moveCard(cards.a1!.id, { listId: empty.id, index: 0 });
    expect(await titlesByList(board.id, [a.id, empty.id])).toEqual([['a2', 'a3'], ['a1']]);
  });

  it('keeps positions distinct under concurrent moves into one list', async () => {
    const { board, a, b, cards } = await setup();
    await Promise.all(
      ['a1', 'a2', 'a3'].map((t) => moveCard(cards[t]!.id, { listId: b.id, index: 0 })),
    );
    const res = await app.inject({ method: 'GET', url: `/api/boards/${board.id}/cards` });
    const inB = res.json<Card[]>().filter((c) => c.listId === b.id);
    expect(inB).toHaveLength(5);
    expect(new Set(inB.map((c) => c.position)).size).toBe(5);
    expect((await titlesByList(board.id, [a.id]))[0]).toEqual([]);
  });

  it('rejects moving a card to another board', async () => {
    const { cards } = await setup();
    const other = await createBoard();
    const foreign = await createList(other.id, 'X');
    const res = await moveCard(cards.a1!.id, { listId: foreign.id, index: 0 });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ message: 'Cannot move a card to another board' });
  });

  it.each([
    { index: 0 },
    { listId: MISSING_ID },
    { listId: MISSING_ID, index: -1 },
    { listId: MISSING_ID, index: 1.5 },
  ])('rejects invalid input %j', async (payload) => {
    const { cards } = await setup();
    expect((await moveCard(cards.a1!.id, payload)).statusCode).toBe(400);
  });

  it('returns 404 for a missing card or list', async () => {
    const { a, cards } = await setup();
    const noCard = await moveCard(MISSING_ID, { listId: a.id, index: 0 });
    expect(noCard.json()).toMatchObject({ statusCode: 404, message: 'Card not found' });
    const noList = await moveCard(cards.a1!.id, { listId: MISSING_ID, index: 0 });
    expect(noList.json()).toMatchObject({ statusCode: 404, message: 'List not found' });
  });
});

describe('POST /api/lists/:listId/move', () => {
  async function threeLists() {
    const board = await createBoard();
    const lists: Record<string, List> = {};
    for (const t of ['A', 'B', 'C']) lists[t] = await createList(board.id, t);
    return { board, lists };
  }

  it.each([
    ['C', 0, ['C', 'A', 'B']],
    ['A', 2, ['B', 'C', 'A']],
    ['A', 1, ['B', 'A', 'C']],
    ['B', 1, ['A', 'B', 'C']],
    ['A', 50, ['B', 'C', 'A']],
  ] as const)('moves list %s to index %i', async (title, index, expected) => {
    const { board, lists } = await threeLists();
    const res = await moveList(lists[title]!.id, { index });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: lists[title]!.id, title });
    expect(await listTitles(board.id)).toEqual(expected);
  });

  it('keeps cards attached to a moved list', async () => {
    const { board, lists } = await threeLists();
    await createCard(lists.A!.id, 'card');
    await moveList(lists.A!.id, { index: 2 });
    expect(await titlesByList(board.id, [lists.A!.id])).toEqual([['card']]);
  });

  it('validates input and returns 404 for a missing list', async () => {
    const { lists } = await threeLists();
    expect((await moveList(lists.A!.id, { index: -1 })).statusCode).toBe(400);
    expect((await moveList(lists.A!.id, {})).statusCode).toBe(400);
    expect((await moveList(MISSING_ID, { index: 0 })).statusCode).toBe(404);
  });
});
