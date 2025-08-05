import styles from './TeamControlIndicator.module.scss';

export default function TeamControlIndicator({ activeTeam }: { activeTeam: number }) {
  return (
    <div className={styles.controlBar}>
      <span className={activeTeam === 1 ? styles.active : ''}>Team 1</span>
      <span className={activeTeam === 2 ? styles.active : ''}>Team 2</span>
    </div>
  );
}
