import { afterAll, describe, expect, it } from 'vitest';
import type { Board, List } from '@kanban/shared';
import { createTestApp } from './helpers.js';

const app = createTestApp();
afterAll(() => app.close());

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

async function createBoard(title = 'Board'): Promise<Board> {
  const res = await app.inject({ method: 'POST', url: '/api/boards', payload: { title } });
  return res.json<Board>();
}

async function createList(boardId: string, title: string): Promise<List> {
  const res = await app.inject({
    method: 'POST',
    url: `/api/boards/${boardId}/lists`,
    payload: { title },
  });
  expect(res.statusCode).toBe(201);
  return res.json<List>();
}

async function getLists(boardId: string): Promise<List[]> {
  const res = await app.inject({ method: 'GET', url: `/api/boards/${boardId}/lists` });
  expect(res.statusCode).toBe(200);
  return res.json<List[]>();
}

describe('lists API', () => {
  it('returns an empty array for a new board', async () => {
    const board = await createBoard();
    expect(await getLists(board.id)).toEqual([]);
  });

  it('appends lists to the end in creation order', async () => {
    const board = await createBoard();
    const todo = await createList(board.id, ' To do ');
    await createList(board.id, 'Doing');
    await createList(board.id, 'Done');

    expect(todo).toMatchObject({ boardId: board.id, title: 'To do' });
    const lists = await getLists(board.id);
    expect(lists.map((l) => l.title)).toEqual(['To do', 'Doing', 'Done']);
    const positions = lists.map((l) => l.position);
    expect([...positions].sort()).toEqual(positions);
    expect(new Set(positions).size).toBe(3);
  });

  it('gives distinct positions to concurrent appends', async () => {
    const board = await createBoard();
    await Promise.all(Array.from({ length: 10 }, (_, i) => createList(board.id, `L${i}`)));
    const lists = await getLists(board.id);
    expect(new Set(lists.map((l) => l.position)).size).toBe(10);
  });

  it('keeps lists of different boards separate', async () => {
    const a = await createBoard('A');
    const b = await createBoard('B');
    await createList(a.id, 'Only in A');
    expect(await getLists(b.id)).toEqual([]);
  });

  it('rejects invalid titles', async () => {
    const board = await createBoard();
    const res = await app.inject({
      method: 'POST',
      url: `/api/boards/${board.id}/lists`,
      payload: { title: '  ' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 for lists of a missing board', async () => {
    const get = await app.inject({ method: 'GET', url: `/api/boards/${MISSING_ID}/lists` });
    expect(get.statusCode).toBe(404);
    const post = await app.inject({
      method: 'POST',
      url: `/api/boards/${MISSING_ID}/lists`,
      payload: { title: 'x' },
    });
    expect(post.statusCode).toBe(404);
    expect(post.json()).toMatchObject({ message: 'Board not found' });
  });

  it('renames a list without moving it', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'Old');
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/lists/${list.id}`,
      payload: { title: 'New' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: list.id, title: 'New', position: list.position });
  });

  it('deletes a list', async () => {
    const board = await createBoard();
    const keep = await createList(board.id, 'Keep');
    const drop = await createList(board.id, 'Drop');
    const res = await app.inject({ method: 'DELETE', url: `/api/lists/${drop.id}` });
    expect(res.statusCode).toBe(204);
    expect((await getLists(board.id)).map((l) => l.id)).toEqual([keep.id]);
  });

  it('deletes lists together with their board', async () => {
    const board = await createBoard();
    const list = await createList(board.id, 'Gone');
    await app.inject({ method: 'DELETE', url: `/api/boards/${board.id}` });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/lists/${list.id}`,
      payload: { title: 'x' },
    });
    expect(res.statusCode).toBe(404);
  });

  it.each([
    ['PATCH', { title: 'x' }],
    ['DELETE', undefined],
  ] as const)('returns 404 for %s on a missing list', async (method, payload) => {
    const res = await app.inject({ method, url: `/api/lists/${MISSING_ID}`, payload });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ message: 'List not found' });
  });
});
