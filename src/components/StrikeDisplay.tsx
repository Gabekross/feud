import styles from './StrikeDisplay.module.scss';

export default function StrikeDisplay({ count }: { count: number }) {
  return (
    <div className={styles.strikes}>
      {'X'.repeat(count)}
    </div>
  );
}
