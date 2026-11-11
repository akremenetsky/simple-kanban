import { customType } from 'drizzle-orm/pg-core';

/**
 * Fractional-index ordering key. Uses the "C" collation so Postgres sorts
 * by byte value, matching the order produced by the `fractional-indexing` lib.
 */
export const position = customType<{ data: string }>({
  dataType() {
    return 'text COLLATE "C"';
  },
});
