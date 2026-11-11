import type { Board } from '@kanban/shared';
import type { boards } from './db/schema.js';

type BoardRow = typeof boards.$inferSelect;

export const toBoard = (row: BoardRow): Board => ({
  id: row.id,
  title: row.title,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});
