// src/components/HiddenQuestionPlaceholder.tsx
//
// Shared "GET READY" placeholder used in place of the question text
// while it's still hidden — both for regular rounds (QuestionDisplay)
// and for Fast Money (FastMoneyBoard header).
//
// Renders inline so the parent can wrap it in <h2> or place it inside
// a flex/grid cell without an extra block-level container.

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
      <span className={styles.label}>&nbsp;GET&nbsp;READY&nbsp;</span>
      <span className={styles.dot}>•</span>
      <span className={styles.dot}>•</span>
      <span className={styles.dot}>•</span>
    </span>
  );
}
