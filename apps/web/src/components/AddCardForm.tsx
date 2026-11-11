import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from './Button.js';
import { Icon } from './Icon.js';
import styles from './AddCardForm.module.css';

interface AddCardFormProps {
  onCreate: (title: string, done: () => void) => void;
  pending: boolean;
}

/** "Add card" button that expands into a title form; stays open for quick entry. */
export function AddCardForm({ onCreate, pending }: AddCardFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  if (!open) {
    return (
      <button className={styles.trigger} onClick={() => setOpen(true)}>
        <Icon name="plus" />
        Add card
      </button>
    );
  }

  const close = () => {
    setOpen(false);
    setTitle('');
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const value = title.trim();
    if (!value || pending) return;
    onCreate(value, () => setTitle(''));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      close();
    }
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      <textarea
        className={styles.input}
        placeholder="Card title"
        aria-label="New card title"
        rows={2}
        value={title}
        maxLength={200}
        autoFocus
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className={styles.actions}>
        <Button type="submit" variant="primary" size="sm" disabled={!title.trim() || pending}>
          Add card
        </Button>
        <Button variant="ghost" size="sm" onClick={close}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
