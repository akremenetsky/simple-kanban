import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { position } from './position.js';

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => sql`now()`),
};

export const boards = pgTable('boards', {
  id: uuid().primaryKey().defaultRandom(),
  title: text().notNull(),
  ...timestamps,
});

export const lists = pgTable(
  'lists',
  {
    id: uuid().primaryKey().defaultRandom(),
    boardId: uuid()
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    position: position().notNull(),
    ...timestamps,
  },
  (t) => [index().on(t.boardId, t.position)],
);

export const cards = pgTable(
  'cards',
  {
    id: uuid().primaryKey().defaultRandom(),
    listId: uuid()
      .notNull()
      .references(() => lists.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    description: text().notNull().default(''),
    position: position().notNull(),
    ...timestamps,
  },
  (t) => [index().on(t.listId, t.position)],
);
