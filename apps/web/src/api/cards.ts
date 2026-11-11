import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Card, UpdateCardInput } from '@kanban/shared';
import { api } from './client.js';
import { byPosition, cardKeys } from './lists.js';

export function useCards(boardId: string) {
  return useQuery({
    queryKey: cardKeys.byBoard(boardId),
    queryFn: () => api.listCards(boardId),
  });
}

/** Cards grouped by list id, each group sorted by position. */
export function useCardsByList(cards: Card[] | undefined) {
  return useMemo(() => {
    const map = new Map<string, Card[]>();
    for (const card of cards ?? []) {
      const group = map.get(card.listId);
      if (group) group.push(card);
      else map.set(card.listId, [card]);
    }
    for (const group of map.values()) group.sort(byPosition);
    return map;
  }, [cards]);
}

export function useCreateCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, title }: { listId: string; title: string }) =>
      api.createCard(listId, { title }),
    onSuccess: (card) => {
      qc.setQueryData<Card[]>(cardKeys.byBoard(boardId), (old) => [...(old ?? []), card]);
    },
  });
}

export function useUpdateCard(boardId: string) {
  const qc = useQueryClient();
  const key = cardKeys.byBoard(boardId);
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & UpdateCardInput) => api.updateCard(id, input),
    onMutate: async ({ id, ...input }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Card[]>(key);
      qc.setQueryData<Card[]>(key, (old) =>
        old?.map((c) => (c.id === id ? { ...c, ...input } : c)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(key, ctx?.prev),
    onSuccess: (card) => {
      qc.setQueryData<Card[]>(key, (old) => old?.map((c) => (c.id === card.id ? card : c)));
    },
  });
}

export function useDeleteCard(boardId: string) {
  const qc = useQueryClient();
  const key = cardKeys.byBoard(boardId);
  return useMutation({
    mutationFn: (id: string) => api.deleteCard(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Card[]>(key);
      qc.setQueryData<Card[]>(key, (old) => old?.filter((c) => c.id !== id));
      return { prev };
    },
    onError: (_err, _id, ctx) => qc.setQueryData(key, ctx?.prev),
  });
}
