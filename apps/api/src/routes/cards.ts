import { and, asc, eq, getTableColumns, ne } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  boardParams,
  cardParams,
  cardSchema,
  createCardInput,
  listParams,
  moveCardInput,
  positionAt,
  updateCardInput,
} from '@kanban/shared';
import type { Tx } from '../db/client.js';
import { boards, cards, lists } from '../db/schema.js';
import { toCard } from '../dto.js';
import { HttpError, notFound } from '../errors.js';

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

        const positions = await cardPositions(tx, list.id);

        const [created] = await tx
          .insert(cards)
          .values({
            listId: list.id,
            title: req.body.title,
            description: req.body.description ?? '',
            position: positionAt(positions, positions.length),
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

  app.post(
    '/cards/:cardId/move',
    { schema: { params: cardParams, body: moveCardInput, response: { 200: cardSchema } } },
    async (req) => {
      const row = await app.db.transaction(async (tx) => {
        const [card] = await tx
          .select({ id: cards.id, boardId: lists.boardId })
          .from(cards)
          .innerJoin(lists, eq(cards.listId, lists.id))
          .where(eq(cards.id, req.params.cardId));
        if (!card) throw notFound('Card');

        // Lock the destination list: serializes appends and moves into it.
        const [target] = await tx
          .select({ id: lists.id, boardId: lists.boardId })
          .from(lists)
          .where(eq(lists.id, req.body.listId))
          .for('update');
        if (!target) throw notFound('List');
        if (target.boardId !== card.boardId) {
          throw new HttpError(400, 'Cannot move a card to another board');
        }

        const positions = await cardPositions(tx, target.id, card.id);
        const [moved] = await tx
          .update(cards)
          .set({ listId: target.id, position: positionAt(positions, req.body.index) })
          .where(eq(cards.id, card.id))
          .returning();
        if (!moved) throw notFound('Card');
        return moved;
      });
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

/** Sorted positions of a list's cards, optionally excluding one card. */
async function cardPositions(tx: Tx, listId: string, excludeId?: string) {
  const rows = await tx
    .select({ position: cards.position })
    .from(cards)
    .where(
      excludeId ? and(eq(cards.listId, listId), ne(cards.id, excludeId)) : eq(cards.listId, listId),
    )
    .orderBy(asc(cards.position));
  return rows.map((r) => r.position);
}
