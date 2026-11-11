import { asc, desc, eq, getTableColumns } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { generateKeyBetween } from 'fractional-indexing';
import { z } from 'zod';
import {
  boardParams,
  cardParams,
  cardSchema,
  createCardInput,
  listParams,
  updateCardInput,
} from '@kanban/shared';
import { boards, cards, lists } from '../db/schema.js';
import { toCard } from '../dto.js';
import { notFound } from '../errors.js';

export const cardRoutes: FastifyPluginAsyncZod = async (app) => {
  // All cards of a board in one request; the client groups them by listId.
  app.get(
    '/boards/:boardId/cards',
    { schema: { params: boardParams, response: { 200: z.array(cardSchema) } } },
    async (req) => {
      const board = await app.db.query.boards.findFirst({
        columns: { id: true },
        where: eq(boards.id, req.params.boardId),
      });
      if (!board) throw notFound('Board');
      const rows = await app.db
        .select(getTableColumns(cards))
        .from(cards)
        .innerJoin(lists, eq(cards.listId, lists.id))
        .where(eq(lists.boardId, board.id))
        .orderBy(asc(cards.listId), asc(cards.position), asc(cards.id));
      return rows.map(toCard);
    },
  );

  app.post(
    '/lists/:listId/cards',
    { schema: { params: listParams, body: createCardInput, response: { 201: cardSchema } } },
    async (req, reply) => {
      const row = await app.db.transaction(async (tx) => {
        // Lock the list row so concurrent appends get distinct positions.
        const [list] = await tx
          .select({ id: lists.id })
          .from(lists)
          .where(eq(lists.id, req.params.listId))
          .for('update');
        if (!list) throw notFound('List');

        const [last] = await tx
          .select({ position: cards.position })
          .from(cards)
          .where(eq(cards.listId, list.id))
          .orderBy(desc(cards.position))
          .limit(1);

        const [created] = await tx
          .insert(cards)
          .values({
            listId: list.id,
            title: req.body.title,
            description: req.body.description ?? '',
            position: generateKeyBetween(last?.position ?? null, null),
          })
          .returning();
        return created!;
      });
      return reply.code(201).send(toCard(row));
    },
  );

  app.patch(
    '/cards/:cardId',
    { schema: { params: cardParams, body: updateCardInput, response: { 200: cardSchema } } },
    async (req) => {
      const { title, description } = req.body;
      const [row] = await app.db
        .update(cards)
        .set({ title, description })
        .where(eq(cards.id, req.params.cardId))
        .returning();
      if (!row) throw notFound('Card');
      return toCard(row);
    },
  );

  app.delete('/cards/:cardId', { schema: { params: cardParams } }, async (req, reply) => {
    const [row] = await app.db
      .delete(cards)
      .where(eq(cards.id, req.params.cardId))
      .returning({ id: cards.id });
    if (!row) throw notFound('Card');
    return reply.code(204).send();
  });
};
