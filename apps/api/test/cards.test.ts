import { afterAll, describe, expect, it } from 'vitest';
import type { Board, Card, List } from '@kanban/shared';
import { createTestApp } from './helpers.js';

const app = createTestApp();
afterAll(() => app.close());

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

async function createBoard(): Promise<Board> {
  const res = await app.inject({ method: 'POST', url: '/api/boards', payload: { title: 'B' } });
  return res.json<Board>();
}

async function createList(boardId: string, title = 'L'): Promise<List> {
  const res = await app.inject({
    method: 'POST',
    url: `/api/boards/${boardId}/lists`,
    payload: { title },
  });
  return res.json<List>();
}

async function createCard(listId: string, payload: object): Promise<Card> {
  const res = await app.inject({ method: 'POST', url: `/api/lists/${listId}/cards`, payload });
  expect(res.statusCode).toBe(201);
  return res.json<Card>();
}

async function boardCards(boardId: string): Promise<Card[]> {
  const res = await app.inject({ method: 'GET', url: `/api/boards/${boardId}/cards` });
  expect(res.statusCode).toBe(200);
  return res.json<Card[]>();
}

const patch = (cardId: string, payload: object) =>
  app.inject({ method: 'PATCH', url: `/api/cards/${cardId}`, payload });

describe('cards API', () => {
  it('creates a card with an empty description by default', async () => {
    const board = await createBoard();
    const list = await createList(board.id);
    const card = await createCard(list.id, { title: '  Write spec ' });
    expect(card).toMatchObject({ listId: list.id, title: 'Write spec', description: '' });
  });

  it('creates a card with a description', async () => {
    const board = await createBoard();
    const list = await createList(board.id);
    const card = await createCard(list.id, { title: 'A', description: 'Line 1\nLine 2' });
    expect(card.description).toBe('Line 1\nLine 2');
  });

  it('returns all cards of a board, ordered within each list', async () => {
    const board = await createBoard();
    const todo = await createList(board.id, 'To do');
    const done = await createList(board.id, 'Done');
    await createCard(todo.id, { title: 'one' });
    await createCard(done.id, { title: 'shipped' });
    await createCard(todo.id, { title: 'two' });
    await createCard(todo.id, { title: 'three' });

    const other = await createBoard();
    await createCard((await createList(other.id)).id, { title: 'elsewhere' });

    const cards = await boardCards(board.id);
    expect(cards).toHaveLength(4);
    expect(cards.filter((c) => c.listId === todo.id).map((c) => c.title)).toEqual([
      'one',
      'two',
      'three',
    ]);
    expect(cards.filter((c) => c.listId === done.id).map((c) => c.title)).toEqual(['shipped']);
  });

  it('gives distinct positions to concurrent appends', async () => {
    const board = await createBoard();
    const list = await createList(board.id);
    await Promise.all(Array.from({ length: 10 }, (_, i) => createCard(list.id, { title: `${i}` })));
    const cards = await boardCards(board.id);
    expect(new Set(cards.map((c) => c.position)).size).toBe(10);
  });

  it.each([{}, { title: ' ' }, { title: 'ok', description: 'x'.repeat(10_001) }])(
    'rejects invalid create input %j',
    async (payload) => {
      const board = await createBoard();
      const list = await createList(board.id);
      const res = await app.inject({ method: 'POST', url: `/api/lists/${list.id}/cards`, payload });
      expect(res.statusCode).toBe(400);
    },
  );

  it('updates title and description independently', async () => {
    const board = await createBoard();
    const list = await createList(board.id);
    const card = await createCard(list.id, { title: 'Old', description: 'Keep' });

    const t = await patch(card.id, { title: 'New' });
    expect(t.statusCode).toBe(200);
    expect(t.json()).toMatchObject({ title: 'New', description: 'Keep', position: card.position });

    const d = await patch(card.id, { description: '' });
    expect(d.statusCode).toBe(200);
    expect(d.json()).toMatchObject({ title: 'New', description: '' });
  });

  it.each([{}, { title: '' }])('rejects invalid update %j', async (payload) => {
    const board = await createBoard();
    const list = await createList(board.id);
    const card = await createCard(list.id, { title: 'A' });
    expect((await patch(card.id, payload)).statusCode).toBe(400);
  });

  it('deletes a card', async () => {
    const board = await createBoard();
    const list = await createList(board.id);
    const keep = await createCard(list.id, { title: 'keep' });
    const drop = await createCard(list.id, { title: 'drop' });
    const res = await app.inject({ method: 'DELETE', url: `/api/cards/${drop.id}` });
    expect(res.statusCode).toBe(204);
    expect((await boardCards(board.id)).map((c) => c.id)).toEqual([keep.id]);
  });

  it('deletes cards together with their list', async () => {
    const board = await createBoard();
    const list = await createList(board.id);
    await createCard(list.id, { title: 'gone' });
    await app.inject({ method: 'DELETE', url: `/api/lists/${list.id}` });
    expect(await boardCards(board.id)).toEqual([]);
  });

  it('returns 404 for missing parents and cards', async () => {
    const byBoard = await app.inject({ method: 'GET', url: `/api/boards/${MISSING_ID}/cards` });
    expect(byBoard.statusCode).toBe(404);
    const create = await app.inject({
      method: 'POST',
      url: `/api/lists/${MISSING_ID}/cards`,
      payload: { title: 'x' },
    });
    expect(create.json()).toMatchObject({ statusCode: 404, message: 'List not found' });
    expect((await patch(MISSING_ID, { title: 'x' })).statusCode).toBe(404);
    const del = await app.inject({ method: 'DELETE', url: `/api/cards/${MISSING_ID}` });
    expect(del.json()).toMatchObject({ statusCode: 404, message: 'Card not found' });
  });
});
