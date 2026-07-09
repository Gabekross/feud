import styles from './StrikeDisplay.module.scss';

export default function StrikeDisplay({ count, limit = 3 }: { count: number; limit?: number }) {
  const slots = Array.from({ length: Math.max(1, limit) }, (_, i) => i < count);

  return (
    <div className={styles.strikes} aria-label={`${count} of ${limit} strikes`}>
      {slots.map((active, index) => (
        <span
          key={index}
          className={`${styles.strikeSlot} ${active ? styles.active : ''}`}
        >
          X
        </span>
      ))}
    </div>
  );
}
