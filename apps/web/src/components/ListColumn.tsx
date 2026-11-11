import {
  useState,
  type CSSProperties,
  type KeyboardEventHandler,
  type PointerEvent,
  type PointerEventHandler,
  type ReactNode,
  type Ref,
} from 'react';
import type { DraggableAttributes } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { List } from '@kanban/shared';
import { AddCardForm } from './AddCardForm.js';
import { Button } from './Button.js';
import { Icon } from './Icon.js';
import { InlineEdit } from './InlineEdit.js';
import styles from './ListColumn.module.css';

interface DragHandle {
  attributes: DraggableAttributes;
  onPointerDown?: PointerEventHandler<HTMLElement>;
  onKeyDown?: KeyboardEventHandler<HTMLElement>;
}

interface ListColumnProps {
  list: List;
  children: ReactNode;
  onRename?: (title: string) => void;
  onDelete?: () => void;
  onAddCard?: (title: string, done: () => void) => void;
  addingCard?: boolean;
  /** Present when the column is sortable. */
  drag?: DragHandle;
  /** Ref for the keyboard drag handle (grip button). */
  activatorRef?: (el: HTMLElement | null) => void;
  nodeRef?: Ref<HTMLElement>;
  style?: CSSProperties;
  placeholder?: boolean;
  overlay?: boolean;
}

const isTextField = (el: EventTarget) =>
  el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;

/** A list column; `children` are the card <li> items. */
export function ListColumn({
  list,
  children,
  onRename,
  onDelete,
  onAddCard,
  addingCard = false,
  drag,
  activatorRef,
  nodeRef,
  style,
  placeholder = false,
  overlay = false,
}: ListColumnProps) {
  const [editing, setEditing] = useState(false);

  // The whole header starts a pointer drag, except text fields (rename input).
  const onHeaderPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (!isTextField(e.target)) drag?.onPointerDown?.(e);
  };

  const cls = [styles.column, placeholder && styles.placeholder, overlay && styles.overlay]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      ref={nodeRef}
      style={style}
      className={cls}
      aria-label={overlay ? undefined : list.title}
      aria-hidden={overlay || undefined}
    >
      <header
        className={`${styles.header} ${drag ? styles.draggable : ''}`}
        onPointerDown={drag ? onHeaderPointerDown : undefined}
      >
        {drag && (
          <button
            ref={activatorRef}
            type="button"
            className={styles.grip}
            {...drag.attributes}
            onKeyDown={drag.onKeyDown}
            aria-label={`Move list ${list.title}`}
            title="Drag to move"
          >
            <Icon name="grip" size={14} />
          </button>
        )}
        {editing && onRename ? (
          <h2 className={styles.title}>
            <InlineEdit
              value={list.title}
              ariaLabel="List title"
              onSave={onRename}
              onDone={() => setEditing(false)}
            />
          </h2>
        ) : (
          <h2 className={styles.title}>
            <button
              type="button"
              className={styles.titleButton}
              title="Click to rename"
              onClick={() => setEditing(true)}
            >
              {list.title}
            </button>
          </h2>
        )}
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          className={styles.action}
          aria-label={`Delete list ${list.title}`}
          title="Delete list"
          onClick={onDelete}
        >
          <Icon name="trash" />
        </Button>
      </header>
      <div className={styles.body}>
        <ul className={styles.cards} aria-label={`Cards in ${list.title}`}>
          {children}
        </ul>
      </div>
      <div className={styles.footer}>
        {onAddCard && <AddCardForm onCreate={onAddCard} pending={addingCard} />}
      </div>
    </section>
  );
}

type SortableListColumnProps = Omit<
  ListColumnProps,
  'drag' | 'activatorRef' | 'nodeRef' | 'style' | 'placeholder' | 'overlay'
>;

/** List column that can be reordered by dragging its header or grip. */
export function SortableListColumn(props: SortableListColumnProps) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.list.id, data: { type: 'list' } });

  return (
    <ListColumn
      {...props}
      nodeRef={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      placeholder={isDragging}
      activatorRef={setActivatorNodeRef}
      drag={{
        attributes,
        onPointerDown: listeners?.onPointerDown as PointerEventHandler<HTMLElement> | undefined,
        onKeyDown: listeners?.onKeyDown as KeyboardEventHandler<HTMLElement> | undefined,
      }}
    />
  );
}
