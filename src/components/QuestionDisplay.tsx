import styles from './QuestionDisplay.module.scss';

type Props = {
  question: string;
  /** When false, render an animated "GET READY…" placeholder instead of the
   *  question text. Defaults to true so existing call sites keep working. */
  revealed?: boolean;
};

export default function QuestionDisplay({ question, revealed = true }: Props) {
  return (
    <div className={`${styles.question} ${revealed ? '' : styles.hidden}`}>
      {revealed ? (
        <h2>{question}</h2>
      ) : (
        <h2 className={styles.placeholder} aria-label="Waiting for question to be revealed">
          <span className={styles.dot}>•</span>
          <span className={styles.dot}>•</span>
          <span className={styles.dot}>•</span>
          <span className={styles.placeholderLabel}>&nbsp;GET&nbsp;READY&nbsp;</span>
          <span className={styles.dot}>•</span>
          <span className={styles.dot}>•</span>
          <span className={styles.dot}>•</span>
        </h2>
      )}
    </div>
  );
}
