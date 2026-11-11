import type { ButtonHTMLAttributes } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card } from '@kanban/shared';
import { Icon } from './Icon.js';
import styles from './CardItem.module.css';

interface CardItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  card: Card;
  overlay?: boolean;
}

/** Visual card tile. Extra props (e.g. drag listeners) go to the underlying button. */
export function CardItem({ card, overlay = false, className, ...rest }: CardItemProps) {
  return (
    <button
      type="button"
      className={[styles.card, overlay && styles.overlay, className].filter(Boolean).join(' ')}
      {...rest}
    >
      <span className={styles.title}>{card.title}</span>
      {card.description.trim() && (
        <span className={styles.meta} title="This card has a description">
          <Icon name="text" size={14} />
          <span className={styles.srOnly}>Has description</span>
        </span>
      )}
    </button>
  );
}

/** Card inside a list that can be dragged within and between lists. */
export function SortableCard({ card, onOpen }: { card: Card; onOpen: () => void }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card' },
  });

  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }}>
      <CardItem
        card={card}
        className={isDragging ? styles.placeholder : undefined}
        onClick={onOpen}
        {...attributes}
        {...listeners}
      />
    </li>
  );
}
