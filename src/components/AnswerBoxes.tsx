'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './AnswerBoxes.module.scss';

type Answer = {
  text: string;
  points: number;
  revealed: boolean;
};

type Props = {
  answers: Answer[];
};

export default function AnswerBoxes({ answers }: Props) {
  const totalSlots = answers.length;

  const slotNumbers = useMemo(() => {
    const left = Array.from({ length: Math.ceil(totalSlots / 2) }, (_, i) => i + 1);
    const right = Array.from(
      { length: Math.floor(totalSlots / 2) },
      (_, i) => i + 1 + Math.ceil(totalSlots / 2)
    );
    return left.flatMap((num, i) => [num, right[i]].filter(Boolean)) as number[];
  }, [totalSlots]);

  const orderedAnswers: Answer[] = useMemo(
    () =>
      slotNumbers.map((num) => {
        const answer = answers[num - 1];
        return answer ?? { text: '', points: 0, revealed: false };
      }),
    [answers, slotNumbers]
  );

  const prevRevealedRef = useRef<boolean[]>([]);
  const [justRevealed, setJustRevealed] = useState<boolean[]>([]);
  const dingSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    dingSoundRef.current = new Audio('/sounds/correct.mp3');
    dingSoundRef.current.volume = 0.7;
  }, []);

  useEffect(() => {
    const prev = prevRevealedRef.current;
    const nextFlags = orderedAnswers.map((answer, i) => !prev[i] && answer.revealed);

    nextFlags.forEach((isNew) => {
      if (isNew && dingSoundRef.current) {
        dingSoundRef.current.currentTime = 0;
        dingSoundRef.current.play().catch(() => {});
      }
    });

    setJustRevealed(nextFlags);
    prevRevealedRef.current = orderedAnswers.map((answer) => answer.revealed);
  }, [orderedAnswers]);

  return (
    <div className={styles.boardWrap}>
      <div
        className={styles.board}
        style={{
          gridTemplateRows: `repeat(${Math.ceil(totalSlots / 2)}, minmax(clamp(48px, 6vmin, 80px), 1fr))`,
        }}
      >
        {orderedAnswers.map((answer, idx) => {
          const slotNumber = slotNumbers[idx];
          const flipClass = answer.revealed ? styles.isRevealed : '';
          const justClass = justRevealed[idx] ? styles.justFlipped : '';

          return (
            <div key={idx} className={styles.cell}>
              <div className={`${styles.plate} ${flipClass} ${justClass}`}>
                <div className={`${styles.face} ${styles.front}`}>
                  <span className={styles.badge}>{slotNumber}</span>
                </div>
                <div className={`${styles.face} ${styles.back}`}>
                  <div className={styles.answerRow}>
                    <span className={styles.answerText}>{answer.text || '-'}</span>
                    <span className={styles.points}>{answer.points}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
