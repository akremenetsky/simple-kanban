import { useState } from 'react';
import type { List } from '@kanban/shared';
import { Button } from './Button.js';
import { Icon } from './Icon.js';
import { InlineEdit } from './InlineEdit.js';
import styles from './ListColumn.module.css';

interface ListColumnProps {
  list: List;
  onRename: (title: string) => void;
  onDelete: () => void;
}

export function ListColumn({ list, onRename, onDelete }: ListColumnProps) {
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
        <p className={styles.empty}>No cards yet</p>
      </div>
    </section>
  );
}
