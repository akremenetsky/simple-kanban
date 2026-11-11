import { afterAll, describe, expect, it } from 'vitest';
import { createTestApp } from './helpers.js';

describe('GET /api/health', () => {
  const app = createTestApp();
  afterAll(() => app.close());

  it('reports ok when the database is reachable', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', db: 'ok' });
  });
});
