import { dismissToast, useToasts } from '../toast.js';
import styles from './Toaster.module.css';

export function Toaster() {
  const toasts = useToasts();
  return (
    <div className={styles.region} role="status" aria-live="polite">
      {toasts.map((t) => (
        <button key={t.id} className={styles.toast} onClick={() => dismissToast(t.id)}>
          {t.message}
        </button>
      ))}
    </div>
  );
}
