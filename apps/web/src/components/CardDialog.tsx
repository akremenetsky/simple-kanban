import { useEffect, useRef, useState } from 'react';
import type { Card, UpdateCardInput } from '@kanban/shared';
import { Button } from './Button.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import { Icon } from './Icon.js';
import styles from './CardDialog.module.css';

interface CardDialogProps {
  card: Card;
  listTitle: string;
  onSave: (input: UpdateCardInput) => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * Card details modal. Title and description are saved automatically
 * when a field loses focus and when the dialog closes.
 */
export function CardDialog({ card, listTitle, onSave, onDelete, onClose }: CardDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [confirming, setConfirming] = useState(false);
  // Last values sent to the server, so blur + close don't send the same change twice.
  const saved = useRef({ title: card.title, description: card.description });

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const save = () => {
    const input: UpdateCardInput = {};
    const nextTitle = title.trim();
    if (nextTitle && nextTitle !== saved.current.title) input.title = nextTitle;
    if (description !== saved.current.description) input.description = description;
    if (input.title === undefined && input.description === undefined) return;
    saved.current = { title: input.title ?? saved.current.title, description };
    onSave(input);
  };

  const close = () => {
    save();
    onClose();
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-label="Card details"
      onCancel={(e) => {
        e.preventDefault();
        if (!confirming) close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className={styles.body}>
        <div className={styles.top}>
          <span className={styles.list}>
            in list <strong className={styles.listName}>{listTitle}</strong>
          </span>
          <Button variant="ghost" size="sm" iconOnly aria-label="Close" onClick={close}>
            <Icon name="x" />
          </Button>
        </div>

        <textarea
          className={styles.title}
          aria-label="Card title"
          rows={1}
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value.replace(/\n/g, ' '))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          onBlur={() => {
            if (!title.trim()) setTitle(card.title);
            save();
          }}
        />

        <label className={styles.label} htmlFor="card-description">
          Description
        </label>
        <textarea
          id="card-description"
          className={styles.description}
          placeholder="Add a more detailed description…"
          rows={6}
          value={description}
          maxLength={10_000}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={save}
        />

        <div className={styles.footer}>
          <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
            <Icon name="trash" />
            Delete card
          </Button>
        </div>
      </div>

      {confirming && (
        <ConfirmDialog
          title={`Delete card “${card.title}”?`}
          confirmLabel="Delete card"
          onCancel={() => setConfirming(false)}
          onConfirm={onDelete}
        >
          This can’t be undone.
        </ConfirmDialog>
      )}
    </dialog>
  );
}
