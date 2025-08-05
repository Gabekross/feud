'use client';

import { useEffect, useState } from 'react';
import styles from './CountdownTimer.module.scss';

export default function CountdownTimer({ seconds }: { seconds: number }) {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.timer}>
      <div className={styles.circle}>
        <span>{timeLeft}</span>
      </div>
    </div>
  );
}
