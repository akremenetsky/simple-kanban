import { runMigrations } from '../src/db/migrate.js';
import { testDatabaseUrl } from './env.js';

export default async function setup() {
  await runMigrations(testDatabaseUrl());
}
