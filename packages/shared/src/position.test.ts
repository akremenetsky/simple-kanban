import { describe, expect, it } from 'vitest';
import { byPosition, positionAt } from './position.js';

describe('positionAt', () => {
  it('creates a first key for an empty list', () => {
    expect(typeof positionAt([], 0)).toBe('string');
  });

  it('inserts at the start, middle and end in order', () => {
    const a = positionAt([], 0);
    const c = positionAt([a], 1);
    const b = positionAt([a, c], 1);
    const start = positionAt([a, b, c], 0);
    expect([c, start, b, a].sort()).toEqual([start, a, b, c]);
  });

  it('clamps out-of-range indexes', () => {
    const a = positionAt([], 0);
    expect(positionAt([a], 99) > a).toBe(true);
    expect(positionAt([a], -5) < a).toBe(true);
  });

  it('sorts by code units, not locale', () => {
    const items = [{ position: 'a' }, { position: 'Z' }, { position: 'a0' }];
    expect(items.sort(byPosition).map((i) => i.position)).toEqual(['Z', 'a', 'a0']);
  });
});
