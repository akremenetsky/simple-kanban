import { useCallback, useMemo, useState } from 'react';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { Card, List } from '@kanban/shared';
import {
  useCards,
  useCardsByList,
  useCreateCard,
  useDeleteCard,
  useMoveCard,
  useUpdateCard,
} from '../api/cards.js';
import {
  useCreateList,
  useDeleteList,
  useLists,
  useMoveList,
  useRenameList,
} from '../api/lists.js';
import { AddListForm } from './AddListForm.js';
import { CardDialog } from './CardDialog.js';
import { CardItem, SortableCard } from './CardItem.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import { ListColumn, SortableListColumn } from './ListColumn.js';
import styles from './BoardCanvas.module.css';

/** listId -> ordered card ids. */
type Columns = Record<string, string[]>;

type Active = { type: 'card' | 'list'; id: string };

const typeOf = (data: { current?: Record<string, unknown> | undefined }) =>
  data.current?.type as Active['type'] | undefined;

const findListOf = (columns: Columns, cardId: UniqueIdentifier) =>
  Object.keys(columns).find((listId) => columns[listId]!.includes(String(cardId)));

export function BoardCanvas({ boardId }: { boardId: string }) {
  const lists = useLists(boardId);
  const cards = useCards(boardId);
  const cardsByList = useCardsByList(cards.data);
  const createList = useCreateList(boardId);
  const renameList = useRenameList(boardId);
  const deleteList = useDeleteList(boardId);
  const moveList = useMoveList(boardId);
  const createCard = useCreateCard(boardId);
  const updateCard = useUpdateCard(boardId);
  const deleteCard = useDeleteCard(boardId);
  const moveCard = useMoveCard(boardId);

  const [listToDelete, setListToDelete] = useState<List | null>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [active, setActive] = useState<Active | null>(null);
  // While a card is being dragged, its tentative placement lives here.
  const [dragColumns, setDragColumns] = useState<Columns | null>(null);

  const listIds = useMemo(() => (lists.data ?? []).map((l) => l.id), [lists.data]);
  const serverColumns = useMemo<Columns>(
    () =>
      Object.fromEntries(listIds.map((id) => [id, (cardsByList.get(id) ?? []).map((c) => c.id)])),
    [listIds, cardsByList],
  );
  const columns = dragColumns ?? serverColumns;
  const cardById = useMemo(() => new Map((cards.data ?? []).map((c) => [c.id, c])), [cards.data]);
  const listById = useMemo(() => new Map((lists.data ?? []).map((l) => [l.id, l])), [lists.data]);

  const sensors = useSensors(
    // A small distance keeps plain clicks working (open card, rename list).
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  );

  const collisionDetection = useCallback<CollisionDetection>(
    (args) => {
      const listContainers = args.droppableContainers.filter((c) => typeOf(c.data) === 'list');
      if (typeOf(args.active.data) === 'list') {
        return closestCenter({ ...args, droppableContainers: listContainers });
      }
      // Card: first find the column under the pointer, then the closest card in it.
      const listArgs = { ...args, droppableContainers: listContainers };
      const overList = pointerWithin(listArgs)[0] ?? rectIntersection(listArgs)[0];
      if (!overList) return [];
      const ids = columns[String(overList.id)] ?? [];
      const cardContainers = args.droppableContainers.filter((c) => ids.includes(String(c.id)));
      if (cardContainers.length === 0) return [overList];
      return closestCenter({ ...args, droppableContainers: cardContainers });
    },
    [columns],
  );

  const nameOf = (id: UniqueIdentifier) =>
    cardById.get(String(id))?.title ?? listById.get(String(id))?.title ?? 'item';

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}.`,
    onDragOver: ({ active, over }) => {
      if (!over) return `${nameOf(active.id)} is not over a list.`;
      if (over.id === active.id) return undefined;
      return `${nameOf(active.id)} is over ${nameOf(over.id)}.`;
    },
    onDragEnd: ({ active }) => `${nameOf(active.id)} was dropped.`,
    onDragCancel: ({ active }) => `Moving ${nameOf(active.id)} was cancelled.`,
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    const type = typeOf(active.data);
    if (!type) return;
    setActive({ type, id: String(active.id) });
    if (type === 'card') setDragColumns(serverColumns);
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || typeOf(active.data) !== 'card') return;
    setDragColumns((prev) => {
      const cols = prev ?? serverColumns;
      const from = findListOf(cols, active.id);
      const overIsList = typeOf(over.data) === 'list';
      const to = overIsList ? String(over.id) : findListOf(cols, over.id);
      if (!from || !to || from === to) return prev;

      const target = cols[to]!;
      let index = overIsList ? target.length : target.indexOf(String(over.id));
      if (!overIsList) {
        const dragged = active.rect.current.translated;
        if (dragged && dragged.top > over.rect.top + over.rect.height / 2) index += 1;
      }
      return {
        ...cols,
        [from]: cols[from]!.filter((id) => id !== active.id),
        [to]: [...target.slice(0, index), String(active.id), ...target.slice(index)],
      };
    });
  };

  const resetDrag = () => {
    setActive(null);
    setDragColumns(null);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const type = typeOf(active.data);
    const id = String(active.id);

    if (type === 'list') {
      resetDrag();
      if (!over || over.id === active.id) return;
      const from = listIds.indexOf(id);
      const to = listIds.indexOf(String(over.id));
      if (from !== -1 && to !== -1) moveList({ id, index: to });
      return;
    }

    if (type === 'card') {
      const cols = dragColumns ?? serverColumns;
      const listId = findListOf(cols, id);
      resetDrag();
      if (!listId) return;
      let items = cols[listId]!;
      if (over && typeOf(over.data) === 'card' && items.includes(String(over.id))) {
        items = arrayMove(items, items.indexOf(id), items.indexOf(String(over.id)));
      }
      const index = items.indexOf(id);
      const original = cardById.get(id);
      const originalIndex = original ? serverColumns[original.listId]!.indexOf(id) : -1;
      if (original?.listId === listId && originalIndex === index) return;
      moveCard({ id, listId, index });
    }
  };

  if (lists.isPending || cards.isPending) return <p className={styles.status}>Loading…</p>;
  if (lists.isError || cards.isError) {
    return <p className={styles.status}>Couldn’t load the board.</p>;
  }

  const openCard = openCardId ? cardById.get(openCardId) : undefined;
  const activeCard = active?.type === 'card' ? cardById.get(active.id) : undefined;
  const activeList = active?.type === 'list' ? listById.get(active.id) : undefined;
  const cardsOf = (listId: string) =>
    (columns[listId] ?? []).map((id) => cardById.get(id)).filter((c): c is Card => !!c);

  return (
    <div className={styles.canvas}>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        accessibility={{ announcements }}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={resetDrag}
      >
        <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
          {lists.data.map((list) => (
            <SortableListColumn
              key={list.id}
              list={list}
              onRename={(title) => renameList.mutate({ id: list.id, title })}
              onDelete={() => setListToDelete(list)}
              addingCard={createCard.isPending && createCard.variables.listId === list.id}
              onAddCard={(title, done) =>
                createCard.mutate({ listId: list.id, title }, { onSuccess: done })
              }
            >
              <SortableContext
                items={columns[list.id] ?? []}
                strategy={verticalListSortingStrategy}
              >
                {cardsOf(list.id).map((card) => (
                  <SortableCard key={card.id} card={card} onOpen={() => setOpenCardId(card.id)} />
                ))}
              </SortableContext>
            </SortableListColumn>
          ))}
        </SortableContext>

        <DragOverlay>
          {activeCard && <CardItem card={activeCard} overlay tabIndex={-1} />}
          {activeList && (
            <ListColumn list={activeList} overlay>
              {cardsOf(activeList.id).map((card) => (
                <li key={card.id}>
                  <CardItem card={card} tabIndex={-1} />
                </li>
              ))}
            </ListColumn>
          )}
        </DragOverlay>
      </DndContext>

      <AddListForm
        pending={createList.isPending}
        onCreate={(title, done) => createList.mutate(title, { onSuccess: done })}
      />

      {listToDelete && (
        <ConfirmDialog
          title={`Delete list “${listToDelete.title}”?`}
          confirmLabel="Delete list"
          onCancel={() => setListToDelete(null)}
          onConfirm={() => {
            deleteList.mutate(listToDelete.id);
            setListToDelete(null);
          }}
        >
          All its cards will be deleted too. This can’t be undone.
        </ConfirmDialog>
      )}

      {openCard && (
        <CardDialog
          key={openCard.id}
          card={openCard}
          listTitle={listById.get(openCard.listId)?.title ?? ''}
          onSave={(input) => updateCard.mutate({ id: openCard.id, ...input })}
          onDelete={() => {
            deleteCard.mutate(openCard.id);
            setOpenCardId(null);
          }}
          onClose={() => setOpenCardId(null)}
        />
      )}
    </div>
  );
}
