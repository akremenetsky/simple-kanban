import type {
  Board,
  CreateBoardInput,
  CreateListInput,
  Health,
  List,
  UpdateBoardInput,
  UpdateListInput,
} from '@kanban/shared';
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

  listLists: (boardId: string) => request<List[]>(`/boards/${boardId}/lists`),
  createList: (boardId: string, input: CreateListInput) =>
    request<List>(`/boards/${boardId}/lists`, { method: 'POST', body: json(input) }),
  updateList: (id: string, input: UpdateListInput) =>
    request<List>(`/lists/${id}`, { method: 'PATCH', body: json(input) }),
  deleteList: (id: string) => request<void>(`/lists/${id}`, { method: 'DELETE' }),
};
