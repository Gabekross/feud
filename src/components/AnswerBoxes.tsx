'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './AnswerBoxes.module.scss';

type Answer = {
  text: string;
  points: number;
  revealed: boolean;
};

type Props = {
  answers: Answer[]; // exact number of answers for the current question
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
        const a = answers[num - 1];
        return a ?? { text: '', points: 0, revealed: false };
      }),
    [answers, slotNumbers]
  );

  const prevRevealedRef = useRef<boolean[]>([]);
  const [justRevealed, setJustRevealed] = useState<boolean[]>([]);

  // Load ding sound once
  const dingSoundRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    dingSoundRef.current = new Audio('/sounds/ding.mp3'); // place file in public/sounds/
    dingSoundRef.current.volume = 0.7;
  }, []);

  useEffect(() => {
    const prev = prevRevealedRef.current;
    const nextFlags = orderedAnswers.map((a, i) => !prev[i] && a.revealed);

    // Play sound for any newly revealed answer
    nextFlags.forEach((isNew) => {
      if (isNew && dingSoundRef.current) {
        dingSoundRef.current.currentTime = 0; // rewind if needed
        dingSoundRef.current.play().catch(() => {});
      }
    });

    setJustRevealed(nextFlags);
    prevRevealedRef.current = orderedAnswers.map((a) => a.revealed);
  }, [orderedAnswers]);

  return (
    <div className={styles.boardWrap}>
      <div
        className={styles.board}
        style={{
          gridTemplateRows: `repeat(${Math.ceil(totalSlots / 2)}, 80px)`,
        }}
      >
        {orderedAnswers.map((a, idx) => {
          const slotNumber = slotNumbers[idx];
          const flipClass = a.revealed ? styles.isRevealed : '';
          const justClass = justRevealed[idx] ? styles.justFlipped : '';

          return (
            <div key={idx} className={styles.cell}>
              <div className={`${styles.plate} ${flipClass} ${justClass}`}>
                <div className={`${styles.face} ${styles.front}`}>
                  <div className={styles.badge}>{slotNumber}</div>
                </div>
                <div className={`${styles.face} ${styles.back}`}>
                  <div className={styles.answerRow}>
                    <span className={styles.answerText}>{a.text || '—'}</span>
                    <span className={styles.points}>{a.points}</span>
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
