import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { byPosition, positionAt, type Card, type List } from '@kanban/shared';
import { api } from './client.js';
import { boardKeys } from './boards.js';

export const listKeys = {
  byBoard: (boardId: string) => [...boardKeys.detail(boardId), 'lists'] as const,
};

export const cardKeys = {
  byBoard: (boardId: string) => [...boardKeys.detail(boardId), 'cards'] as const,
};

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

/**
 * Moves a list to `index` among the other lists. The cache is updated synchronously
 * (so a drop doesn't flicker back) and re-synced from the server if the request fails.
 */
export function useMoveList(boardId: string) {
  const qc = useQueryClient();
  const key = listKeys.byBoard(boardId);
  const mutation = useMutation({
    mutationFn: ({ id, index }: { id: string; index: number }) => api.moveList(id, { index }),
    onSuccess: (list) => {
      qc.setQueryData<List[]>(key, (old) =>
        old?.map((l) => (l.id === list.id ? list : l)).sort(byPosition),
      );
    },
    onError: () => qc.invalidateQueries({ queryKey: key }),
  });

  return (vars: { id: string; index: number }) => {
    void qc.cancelQueries({ queryKey: key });
    qc.setQueryData<List[]>(key, (old) => {
      if (!old) return old;
      const others = old.filter((l) => l.id !== vars.id).map((l) => l.position);
      const position = positionAt(others, vars.index);
      return old.map((l) => (l.id === vars.id ? { ...l, position } : l)).sort(byPosition);
    });
    mutation.mutate(vars);
  };
}
