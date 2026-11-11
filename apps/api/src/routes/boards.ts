import { asc, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { boardParams, boardSchema, createBoardInput, updateBoardInput } from '@kanban/shared';
import { boards } from '../db/schema.js';
import { toBoard } from '../dto.js';
import { notFound } from '../errors.js';

export const boardRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/boards', { schema: { response: { 200: z.array(boardSchema) } } }, async () => {
    const rows = await app.db.select().from(boards).orderBy(asc(boards.createdAt), asc(boards.id));
    return rows.map(toBoard);
  });

  app.post(
    '/boards',
    { schema: { body: createBoardInput, response: { 201: boardSchema } } },
    async (req, reply) => {
      const [row] = await app.db.insert(boards).values({ title: req.body.title }).returning();
      return reply.code(201).send(toBoard(row!));
    },
  );

  app.get(
    '/boards/:boardId',
    { schema: { params: boardParams, response: { 200: boardSchema } } },
    async (req) => {
      const row = await app.db.query.boards.findFirst({
        where: eq(boards.id, req.params.boardId),
      });
      if (!row) throw notFound('Board');
      return toBoard(row);
    },
  );

  app.patch(
    '/boards/:boardId',
    { schema: { params: boardParams, body: updateBoardInput, response: { 200: boardSchema } } },
    async (req) => {
      const [row] = await app.db
        .update(boards)
        .set({ title: req.body.title })
        .where(eq(boards.id, req.params.boardId))
        .returning();
      if (!row) throw notFound('Board');
      return toBoard(row);
    },
  );

  app.delete('/boards/:boardId', { schema: { params: boardParams } }, async (req, reply) => {
    const [row] = await app.db
      .delete(boards)
      .where(eq(boards.id, req.params.boardId))
      .returning({ id: boards.id });
    if (!row) throw notFound('Board');
    return reply.code(204).send();
  });
};
