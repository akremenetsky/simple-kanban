import type { Card } from '@kanban/shared';
import { Icon } from './Icon.js';
import styles from './CardItem.module.css';

export function CardItem({ card, onOpen }: { card: Card; onOpen: () => void }) {
  return (
    <button className={styles.card} onClick={onOpen}>
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
