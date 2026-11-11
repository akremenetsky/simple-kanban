import { useState, type FormEvent } from 'react';
import { Button } from './Button.js';
import { Icon } from './Icon.js';
import styles from './AddListForm.module.css';

interface AddListFormProps {
  onCreate: (title: string, done: () => void) => void;
  pending: boolean;
}

/** Collapsed "Add list" button that expands into a title form; stays open for quick entry. */
export function AddListForm({ onCreate, pending }: AddListFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  if (!open) {
    return (
      <button className={styles.trigger} onClick={() => setOpen(true)}>
        <Icon name="plus" />
        Add list
      </button>
    );
  }

  const close = () => {
    setOpen(false);
    setTitle('');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    onCreate(value, () => setTitle(''));
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      <input
        className={styles.input}
        placeholder="List title"
        aria-label="New list title"
        value={title}
        maxLength={200}
        autoFocus
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && close()}
      />
      <div className={styles.actions}>
        <Button type="submit" variant="primary" size="sm" disabled={!title.trim() || pending}>
          Add list
        </Button>
        <Button variant="ghost" size="sm" onClick={close}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
