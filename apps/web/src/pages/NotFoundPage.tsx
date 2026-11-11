import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div style={{ padding: 'var(--space-6) var(--space-5)', color: 'var(--text-muted)' }}>
      <p>Page not found.</p>
      <Link to="/">Back to boards</Link>
    </div>
  );
}
