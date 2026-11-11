import { Link, Outlet } from 'react-router';
import { Toaster } from './Toaster.js';
import styles from './Layout.module.css';

export function Layout() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          <LogoMark />
          Kanban
        </Link>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}

function LogoMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="currentColor" />
      <rect x="7" y="8" width="5" height="16" rx="1.5" fill="var(--bg)" />
      <rect x="13.5" y="8" width="5" height="11" rx="1.5" fill="var(--bg)" opacity=".75" />
      <rect x="20" y="8" width="5" height="7" rx="1.5" fill="var(--bg)" opacity=".5" />
    </svg>
  );
}
