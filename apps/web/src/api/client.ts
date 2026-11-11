import type { Board, CreateBoardInput, Health, UpdateBoardInput } from '@kanban/shared';
import { request } from './http.js';

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  health: () => request<Health>('/health'),

  listBoards: () => request<Board[]>('/boards'),
  getBoard: (id: string) => request<Board>(`/boards/${id}`),
  createBoard: (input: CreateBoardInput) =>
    request<Board>('/boards', { method: 'POST', body: json(input) }),
  updateBoard: (id: string, input: UpdateBoardInput) =>
    request<Board>(`/boards/${id}`, { method: 'PATCH', body: json(input) }),
  deleteBoard: (id: string) => request<void>(`/boards/${id}`, { method: 'DELETE' }),
};
