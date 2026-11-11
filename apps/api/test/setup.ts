import { afterAll, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDb } from '../src/db/client.js';
import { testDatabaseUrl } from './env.js';

export const testDb = createDb(testDatabaseUrl());

beforeEach(async () => {
  await testDb.db.execute(sql`TRUNCATE boards, lists, cards RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await testDb.pool.end();
});
