import pg from 'pg';
import { runMigrations } from '../apps/api/src/db/migrate.js';

/** Migrate the e2e database and wipe all data before the run. */
export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL ?? 'postgres://kanban:kanban@localhost:5433/kanban_e2e';
  await runMigrations(url);
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query('TRUNCATE boards, lists, cards CASCADE');
  await client.end();
}
