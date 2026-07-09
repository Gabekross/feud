import styles from './HiddenQuestionPlaceholder.module.scss';

export default function HiddenQuestionPlaceholder() {
  return (
    <span
      className={styles.placeholder}
      role="status"
      aria-label="Waiting for question to be revealed"
    >
      <span className={styles.dot}>•</span>
      <span className={styles.dot}>•</span>
      <span className={styles.dot}>•</span>
      <span className={styles.label}>GET READY</span>
      <span className={styles.dot}>•</span>
      <span className={styles.dot}>•</span>
      <span className={styles.dot}>•</span>
    </span>
  );
}
