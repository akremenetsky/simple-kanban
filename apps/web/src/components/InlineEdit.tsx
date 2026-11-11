import { useRef, useState, type KeyboardEvent } from 'react';
import styles from './InlineEdit.module.css';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  onDone: () => void;
  ariaLabel: string;
  className?: string;
  maxLength?: number;
}

/**
 * Text input for editing a title in place.
 * Enter or blur saves (if non-empty and changed), Escape cancels.
 */
export function InlineEdit({
  value,
  onSave,
  onDone,
  ariaLabel,
  className,
  maxLength = 200,
}: InlineEditProps) {
  const [draft, setDraft] = useState(value);
  // Guards against a second commit from the blur that follows Enter/Escape.
  const finished = useRef(false);

  const finish = (save: boolean) => {
    if (finished.current) return;
    finished.current = true;
    const next = draft.trim();
    if (save && next && next !== value) onSave(next);
    onDone();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finish(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finish(false);
    }
  };

  return (
    <input
      className={[styles.input, className].filter(Boolean).join(' ')}
      aria-label={ariaLabel}
      value={draft}
      maxLength={maxLength}
      autoFocus
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => finish(true)}
    />
  );
}
