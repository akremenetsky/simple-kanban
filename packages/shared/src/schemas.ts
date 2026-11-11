import { z } from 'zod';

/**
 * Shared domain contracts between API and web.
 * Request input schemas are used for validation on the server and typing on the client.
 */

const title = z.string().trim().min(1).max(200);
const id = z.uuid();

// ---- Entities (API responses) ----

export const boardSchema = z.object({
  id,
  title: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Board = z.infer<typeof boardSchema>;

export const listSchema = z.object({
  id,
  boardId: id,
  title: z.string(),
  position: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type List = z.infer<typeof listSchema>;

export const cardSchema = z.object({
  id,
  listId: id,
  title: z.string(),
  description: z.string(),
  position: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Card = z.infer<typeof cardSchema>;

// ---- Inputs ----

export const createBoardInput = z.object({ title });
export type CreateBoardInput = z.infer<typeof createBoardInput>;

export const updateBoardInput = z.object({ title });
export type UpdateBoardInput = z.infer<typeof updateBoardInput>;

export const healthSchema = z.object({
  status: z.literal('ok'),
  db: z.literal('ok'),
});
export type Health = z.infer<typeof healthSchema>;

export const boardParams = z.object({ boardId: id });
export type BoardParams = z.infer<typeof boardParams>;

export const errorSchema = z.object({
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
});
export type ApiErrorBody = z.infer<typeof errorSchema>;
