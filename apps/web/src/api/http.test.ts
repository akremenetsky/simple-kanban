import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request } from './http.js';

describe('request', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('throws ApiError on non-2xx responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 404 })),
    );
    await expect(request('/x')).rejects.toEqual(new ApiError(404, 'nope'));
  });

  it('uses the message from a JSON error body', async () => {
    const body = JSON.stringify({
      statusCode: 404,
      error: 'Not Found',
      message: 'Board not found',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(body, { status: 404 })),
    );
    await expect(request('/x')).rejects.toEqual(new ApiError(404, 'Board not found'));
  });

  it('returns undefined for 204', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 204 })),
    );
    await expect(request('/x', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});
