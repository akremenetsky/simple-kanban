import { sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { healthSchema } from '@kanban/shared';

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/health', { schema: { response: { 200: healthSchema } } }, async () => {
    await app.db.execute(sql`select 1`);
    return { status: 'ok', db: 'ok' } as const;
  });
};
