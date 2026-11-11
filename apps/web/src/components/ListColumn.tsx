import { useState } from 'react';
import type { Card, List } from '@kanban/shared';
import { AddCardForm } from './AddCardForm.js';
import { Button } from './Button.js';
import { CardItem } from './CardItem.js';
import { Icon } from './Icon.js';
import { InlineEdit } from './InlineEdit.js';
import styles from './ListColumn.module.css';

interface ListColumnProps {
  list: List;
  cards: Card[];
  onRename: (title: string) => void;
  onDelete: () => void;
  onAddCard: (title: string, done: () => void) => void;
  addingCard: boolean;
  onOpenCard: (card: Card) => void;
}

export function ListColumn({
  list,
  cards,
  onRename,
  onDelete,
  onAddCard,
  addingCard,
  onOpenCard,
}: ListColumnProps) {
  const [editing, setEditing] = useState(false);

  return (
    <section className={styles.column} aria-label={list.title}>
      <header className={styles.header}>
        {editing ? (
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
        {cards.length > 0 && (
          <ul className={styles.cards} aria-label={`Cards in ${list.title}`}>
            {cards.map((card) => (
              <li key={card.id}>
                <CardItem card={card} onOpen={() => onOpenCard(card)} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={styles.footer}>
        <AddCardForm onCreate={onAddCard} pending={addingCard} />
      </div>
    </section>
  );
}
