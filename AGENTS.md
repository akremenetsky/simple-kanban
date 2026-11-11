# Simple Kanban

A pet project: a web app for kanban boards. The user is the product owner and describes features.
The AI agent acts as developer, tester and designer.

## v1 scope

No authentication and no multi-tenancy — all boards are shared. CRUD for boards, lists and cards,
drag & drop of cards between lists, minimalist UI, data stored in PostgreSQL, web only.

## Stack

- TypeScript everywhere, npm workspaces monorepo, Node 24
- `apps/web` — React 19 + Vite, TanStack Query, dnd-kit, CSS Modules + CSS variables (`src/styles/global.css`)
- `apps/api` — Fastify 5 + fastify-type-provider-zod, Drizzle ORM (node-postgres)
- `packages/shared` — Zod schemas and types shared by API and web (consumed as TS sources, no build step)
- PostgreSQL 17 via docker compose, host port **5433**
- Tests: Vitest (unit and API tests against a real DB), Playwright (e2e)
- TypeScript is pinned to `~6.0`: typescript-eslint does not support TS 7 yet

## Commands (from the repo root)

```bash
npm run db:up         # start Postgres (creates DBs kanban, kanban_test, kanban_e2e)
npm run db:migrate    # apply migrations to the dev DB
npm run db:generate   # generate a migration after changing apps/api/src/db/schema.ts
npm run dev           # API :3000 + web :5173 (Vite proxies /api to the API)
npm test              # vitest in all workspaces
npm run test:e2e      # Playwright: starts its own API :3100 (DB kanban_e2e) and web :5174
npm run check         # typecheck + lint + format:check + test (run before finishing a task)
npm run format        # prettier
```

If `http_proxy` is set in the environment (e.g. in an agent sandbox), run e2e tests and curl
against localhost with `NO_PROXY=127.0.0.1,localhost no_proxy=127.0.0.1,localhost`.

## Conventions

- Change the DB schema only in `apps/api/src/db/schema.ts`, then run `npm run db:generate`. Never hand-edit generated migrations in `apps/api/drizzle/`.
- DB columns are snake_case, TS fields are camelCase (`casing: 'snake_case'`).
- List and card order is stored in the `position` column (text, `COLLATE "C"`) as a fractional-indexing key (`fractional-indexing` library). Moving an item updates only that item's position.
- API contracts (inputs and responses) are Zod schemas in `packages/shared`, used as `schema` in Fastify routes.
- API routes live under the `/api` prefix as separate plugins in `apps/api/src/routes/`, registered in `src/app.ts`.
- `buildApp({ db })` does not start a server. API tests use `app.inject()` and the test DB, which is truncated before each test (`test/setup.ts`).
- Relative imports use the `.js` extension; type-only imports use `import type`.
- UI: minimalist, neutral palette, light and dark themes via CSS variables. No UI frameworks.
- Cover every feature with API tests, and key UI flows with a Playwright e2e test.
- All documentation (README, AGENTS.md, other docs) and code comments are written in English.

## Git

- Do not credit the AI agent as a co-author in commits (no `Co-Authored-By`). In PR descriptions, do not add "Generated with ..." lines or a "Test plan" section.
