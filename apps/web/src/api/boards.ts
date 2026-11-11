import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Board } from '@kanban/shared';
import { api } from './client.js';

export const boardKeys = {
  all: ['boards'] as const,
  detail: (id: string) => ['boards', id] as const,
};

export function useBoards() {
  return useQuery({ queryKey: boardKeys.all, queryFn: api.listBoards });
}

export function useBoard(id: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: boardKeys.detail(id),
    queryFn: () => api.getBoard(id),
    initialData: () => qc.getQueryData<Board[]>(boardKeys.all)?.find((b) => b.id === id),
    retry: (count, err) =>
      !(err instanceof Error && 'status' in err && err.status === 404) && count < 1,
  });
}

export function useCreateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => api.createBoard({ title }),
    onSuccess: (board) => {
      qc.setQueryData<Board[]>(boardKeys.all, (old) => [...(old ?? []), board]);
      qc.setQueryData(boardKeys.detail(board.id), board);
    },
  });
}

export function useRenameBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => api.updateBoard(id, { title }),
    onMutate: async ({ id, title }) => {
      await qc.cancelQueries({ queryKey: boardKeys.all });
      const prevList = qc.getQueryData<Board[]>(boardKeys.all);
      const prevBoard = qc.getQueryData<Board>(boardKeys.detail(id));
      qc.setQueryData<Board[]>(boardKeys.all, (old) =>
        old?.map((b) => (b.id === id ? { ...b, title } : b)),
      );
      qc.setQueryData<Board>(boardKeys.detail(id), (old) => old && { ...old, title });
      return { prevList, prevBoard };
    },
    onError: (_err, { id }, ctx) => {
      qc.setQueryData(boardKeys.all, ctx?.prevList);
      qc.setQueryData(boardKeys.detail(id), ctx?.prevBoard);
    },
    onSuccess: (board) => {
      qc.setQueryData<Board[]>(boardKeys.all, (old) =>
        old?.map((b) => (b.id === board.id ? board : b)),
      );
      qc.setQueryData(boardKeys.detail(board.id), board);
    },
  });
}

export function useDeleteBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteBoard(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: boardKeys.all });
      const prevList = qc.getQueryData<Board[]>(boardKeys.all);
      qc.setQueryData<Board[]>(boardKeys.all, (old) => old?.filter((b) => b.id !== id));
      return { prevList };
    },
    onError: (_err, _id, ctx) => qc.setQueryData(boardKeys.all, ctx?.prevList),
    onSuccess: (_data, id) => qc.removeQueries({ queryKey: boardKeys.detail(id) }),
  });
}
