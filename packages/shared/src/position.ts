import { generateKeyBetween } from 'fractional-indexing';

/**
 * Fractional-index key for inserting an item at `index` into a list of
 * sorted, distinct `positions` (the moved item itself must not be included).
 * Indexes past the end append.
 */
export function positionAt(positions: readonly string[], index: number): string {
  const i = Math.max(0, Math.min(index, positions.length));
  return generateKeyBetween(positions[i - 1] ?? null, positions[i] ?? null);
}

/** Orders by position key using code-unit comparison (matches Postgres COLLATE "C"). */
export const byPosition = (a: { position: string }, b: { position: string }) =>
  a.position < b.position ? -1 : a.position > b.position ? 1 : 0;
