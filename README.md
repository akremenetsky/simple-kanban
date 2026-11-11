# Simple Kanban

Minimalist kanban boards: React + Fastify + PostgreSQL.

## Quick start

```bash
cp .env.example .env
npm install
npm run db:up
npm run db:migrate
npm run dev        # http://localhost:5173
```

## Tests

```bash
npm test                          # unit + API
npx playwright install chromium   # once
npm run test:e2e                  # e2e
```
