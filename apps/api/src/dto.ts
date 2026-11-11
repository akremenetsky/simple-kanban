import type { Board, Card, List } from '@kanban/shared';
import type { boards, cards, lists } from './db/schema.js';

type BoardRow = typeof boards.$inferSelect;
type ListRow = typeof lists.$inferSelect;
type CardRow = typeof cards.$inferSelect;

export const toBoard = (row: BoardRow): Board => ({
  id: row.id,
  title: row.title,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const toList = (row: ListRow): List => ({
  id: row.id,
  boardId: row.boardId,
  title: row.title,
  position: row.position,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const toCard = (row: CardRow): Card => ({
  id: row.id,
  listId: row.listId,
  title: row.title,
  description: row.description,
  position: row.position,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});
