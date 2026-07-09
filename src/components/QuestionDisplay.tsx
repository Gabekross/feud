import HiddenQuestionPlaceholder from './HiddenQuestionPlaceholder';
import styles from './QuestionDisplay.module.scss';

type Props = {
  question: string;
  revealed?: boolean;
};

export default function QuestionDisplay({ question, revealed = true }: Props) {
  return (
    <div className={`${styles.question} ${revealed ? styles.revealed : styles.hidden}`}>
      <div className={styles.inner}>
        <h2>{revealed ? question : <HiddenQuestionPlaceholder />}</h2>
      </div>
    </div>
  );
}
