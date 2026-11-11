import { and, asc, eq, ne } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  boardParams,
  createListInput,
  listParams,
  listSchema,
  moveListInput,
  positionAt,
  updateListInput,
} from '@kanban/shared';
import type { Tx } from '../db/client.js';
import { boards, lists } from '../db/schema.js';
import { toList } from '../dto.js';
import { notFound } from '../errors.js';

export const listRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/boards/:boardId/lists',
    { schema: { params: boardParams, response: { 200: z.array(listSchema) } } },
    async (req) => {
      const board = await app.db.query.boards.findFirst({
        columns: { id: true },
        where: eq(boards.id, req.params.boardId),
      });
      if (!board) throw notFound('Board');
      const rows = await app.db
        .select()
        .from(lists)
        .where(eq(lists.boardId, board.id))
        .orderBy(asc(lists.position), asc(lists.id));
      return rows.map(toList);
    },
  );

  app.post(
    '/boards/:boardId/lists',
    { schema: { params: boardParams, body: createListInput, response: { 201: listSchema } } },
    async (req, reply) => {
      const row = await app.db.transaction(async (tx) => {
        // Lock the board row so concurrent appends get distinct positions.
        const [board] = await tx
          .select({ id: boards.id })
          .from(boards)
          .where(eq(boards.id, req.params.boardId))
          .for('update');
        if (!board) throw notFound('Board');

        const positions = await listPositions(tx, board.id);

        const [created] = await tx
          .insert(lists)
          .values({
            boardId: board.id,
            title: req.body.title,
            position: positionAt(positions, positions.length),
          })
          .returning();
        return created!;
      });
      return reply.code(201).send(toList(row));
    },
  );

  app.patch(
    '/lists/:listId',
    { schema: { params: listParams, body: updateListInput, response: { 200: listSchema } } },
    async (req) => {
      const [row] = await app.db
        .update(lists)
        .set({ title: req.body.title })
        .where(eq(lists.id, req.params.listId))
        .returning();
      if (!row) throw notFound('List');
      return toList(row);
    },
  );

  app.post(
    '/lists/:listId/move',
    { schema: { params: listParams, body: moveListInput, response: { 200: listSchema } } },
    async (req) => {
      const row = await app.db.transaction(async (tx) => {
        const list = await tx.query.lists.findFirst({
          columns: { id: true, boardId: true },
          where: eq(lists.id, req.params.listId),
        });
        if (!list) throw notFound('List');
        // Serialize all position changes within the board.
        await tx
          .select({ id: boards.id })
          .from(boards)
          .where(eq(boards.id, list.boardId))
          .for('update');

        const positions = await listPositions(tx, list.boardId, list.id);
        const [moved] = await tx
          .update(lists)
          .set({ position: positionAt(positions, req.body.index) })
          .where(eq(lists.id, list.id))
          .returning();
        if (!moved) throw notFound('List');
        return moved;
      });
      return toList(row);
    },
  );

  app.delete('/lists/:listId', { schema: { params: listParams } }, async (req, reply) => {
    const [row] = await app.db
      .delete(lists)
      .where(eq(lists.id, req.params.listId))
      .returning({ id: lists.id });
    if (!row) throw notFound('List');
    return reply.code(204).send();
  });
};

/** Sorted positions of a board's lists, optionally excluding one list. */
async function listPositions(tx: Tx, boardId: string, excludeId?: string) {
  const rows = await tx
    .select({ position: lists.position })
    .from(lists)
    .where(
      excludeId
        ? and(eq(lists.boardId, boardId), ne(lists.id, excludeId))
        : eq(lists.boardId, boardId),
    )
    .orderBy(asc(lists.position));
  return rows.map((r) => r.position);
}
