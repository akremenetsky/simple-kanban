import { buildApp } from '../src/app.js';
import { testDb } from './setup.js';

export function createTestApp() {
  return buildApp({ db: testDb.db });
}
