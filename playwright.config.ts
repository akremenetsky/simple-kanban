import { defineConfig, devices } from '@playwright/test';
import { loadEnvFile } from 'node:process';

try {
  loadEnvFile('.env');
} catch {
  // optional
}

const E2E_API_PORT = 3100;
const E2E_WEB_PORT = 5174;
const e2eDb = process.env.E2E_DATABASE_URL ?? 'postgres://kanban:kanban@localhost:5433/kanban_e2e';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: `http://127.0.0.1:${E2E_WEB_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run start -w @kanban/api',
      url: `http://127.0.0.1:${E2E_API_PORT}/api/health`,
      env: { DATABASE_URL: e2eDb, API_PORT: String(E2E_API_PORT), LOG_LEVEL: 'warn' },
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -w @kanban/web',
      url: `http://127.0.0.1:${E2E_WEB_PORT}`,
      env: { API_PORT: String(E2E_API_PORT), WEB_PORT: String(E2E_WEB_PORT) },
      reuseExistingServer: false,
    },
  ],
});
