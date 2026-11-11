import { afterAll, describe, expect, it } from 'vitest';
import type { Board } from '@kanban/shared';
import { createTestApp } from './helpers.js';

const app = createTestApp();
afterAll(() => app.close());

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

async function createBoard(title: string): Promise<Board> {
  const res = await app.inject({ method: 'POST', url: '/api/boards', payload: { title } });
  expect(res.statusCode).toBe(201);
  return res.json<Board>();
}

describe('boards API', () => {
  it('creates a board with a trimmed title', async () => {
    const board = await createBoard('  Roadmap  ');
    expect(board).toMatchObject({ title: 'Roadmap' });
    expect(board.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Date(board.createdAt).toString()).not.toBe('Invalid Date');
  });

  it.each([{}, { title: '' }, { title: '   ' }, { title: 'x'.repeat(201) }, { title: 42 }])(
    'rejects invalid input %j',
    async (payload) => {
      const res = await app.inject({ method: 'POST', url: '/api/boards', payload });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ statusCode: 400, error: 'Bad Request' });
    },
  );

  it('lists boards in creation order', async () => {
    await createBoard('First');
    await createBoard('Second');
    const res = await app.inject({ method: 'GET', url: '/api/boards' });
    expect(res.statusCode).toBe(200);
    expect(res.json<Board[]>().map((b) => b.title)).toEqual(['First', 'Second']);
  });

  it('gets a single board', async () => {
    const board = await createBoard('Single');
    const res = await app.inject({ method: 'GET', url: `/api/boards/${board.id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(board);
  });

  it('renames a board', async () => {
    const board = await createBoard('Old');
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/boards/${board.id}`,
      payload: { title: 'New' },
    });
    expect(res.statusCode).toBe(200);
    const updated = res.json<Board>();
    expect(updated.title).toBe('New');
    expect(updated.createdAt).toBe(board.createdAt);
    expect(new Date(updated.updatedAt) >= new Date(board.updatedAt)).toBe(true);
  });

  it('deletes a board', async () => {
    const board = await createBoard('Doomed');
    const del = await app.inject({ method: 'DELETE', url: `/api/boards/${board.id}` });
    expect(del.statusCode).toBe(204);
    const get = await app.inject({ method: 'GET', url: `/api/boards/${board.id}` });
    expect(get.statusCode).toBe(404);
  });

  it.each([
    ['GET', undefined],
    ['PATCH', { title: 'x' }],
    ['DELETE', undefined],
  ] as const)('returns 404 for %s on a missing board', async (method, payload) => {
    const res = await app.inject({ method, url: `/api/boards/${MISSING_ID}`, payload });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Board not found',
    });
  });

  it('returns 400 for a malformed id', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/boards/not-a-uuid' });
    expect(res.statusCode).toBe(400);
  });
});
