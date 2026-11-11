import type { Board, List } from '@kanban/shared';
import type { boards, lists } from './db/schema.js';

type BoardRow = typeof boards.$inferSelect;
type ListRow = typeof lists.$inferSelect;

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
