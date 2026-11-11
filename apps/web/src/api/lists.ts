import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Card, List } from '@kanban/shared';
import { api } from './client.js';
import { boardKeys } from './boards.js';

export const listKeys = {
  byBoard: (boardId: string) => [...boardKeys.detail(boardId), 'lists'] as const,
};

export const cardKeys = {
  byBoard: (boardId: string) => [...boardKeys.detail(boardId), 'cards'] as const,
};

/** Orders by fractional-index key using plain code-unit comparison (matches COLLATE "C"). */
export const byPosition = (a: { position: string }, b: { position: string }) =>
  a.position < b.position ? -1 : a.position > b.position ? 1 : 0;

export function useLists(boardId: string) {
  return useQuery({
    queryKey: listKeys.byBoard(boardId),
    queryFn: () => api.listLists(boardId),
  });
}

export function useCreateList(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => api.createList(boardId, { title }),
    onSuccess: (list) => {
      qc.setQueryData<List[]>(listKeys.byBoard(boardId), (old) =>
        [...(old ?? []), list].sort(byPosition),
      );
    },
  });
}

export function useRenameList(boardId: string) {
  const qc = useQueryClient();
  const key = listKeys.byBoard(boardId);
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => api.updateList(id, { title }),
    onMutate: async ({ id, title }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<List[]>(key);
      qc.setQueryData<List[]>(key, (old) => old?.map((l) => (l.id === id ? { ...l, title } : l)));
      return { prev };
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(key, ctx?.prev),
    onSuccess: (list) => {
      qc.setQueryData<List[]>(key, (old) => old?.map((l) => (l.id === list.id ? list : l)));
    },
  });
}

export function useDeleteList(boardId: string) {
  const qc = useQueryClient();
  const key = listKeys.byBoard(boardId);
  return useMutation({
    mutationFn: (id: string) => api.deleteList(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<List[]>(key);
      const prevCards = qc.getQueryData<Card[]>(cardKeys.byBoard(boardId));
      qc.setQueryData<List[]>(key, (old) => old?.filter((l) => l.id !== id));
      qc.setQueryData<Card[]>(cardKeys.byBoard(boardId), (old) =>
        old?.filter((c) => c.listId !== id),
      );
      return { prev, prevCards };
    },
    onError: (_err, _id, ctx) => {
      qc.setQueryData(key, ctx?.prev);
      qc.setQueryData(cardKeys.byBoard(boardId), ctx?.prevCards);
    },
  });
}
