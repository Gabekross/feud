import HiddenQuestionPlaceholder from './HiddenQuestionPlaceholder';
import styles from './QuestionDisplay.module.scss';

type Props = {
  question: string;
  /** When false, render the animated "GET READY…" placeholder instead of
   *  the question text. Defaults to true for back-compat with old call sites. */
  revealed?: boolean;
};

export default function QuestionDisplay({ question, revealed = true }: Props) {
  return (
    <div className={`${styles.question} ${revealed ? '' : styles.hidden}`}>
      <h2>{revealed ? question : <HiddenQuestionPlaceholder />}</h2>
    </div>
  );
}
