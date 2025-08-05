import styles from './QuestionDisplay.module.scss';

export default function QuestionDisplay({ question }: { question: string }) {
  return (
    <div className={styles.question}>
      <h2>{question}</h2>
    </div>
  );
}
