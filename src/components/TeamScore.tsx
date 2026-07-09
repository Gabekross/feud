'use client';

import { useEffect, useState } from 'react';
import styles from './TeamScore.module.scss';

type Props = {
  team1Name: string;
  team2Name: string;
  team1: number;
  team2: number;
  activeTeam?: number;
};

function AnimatedScore({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    const start = displayValue;
    const change = value - start;
    const duration = 700;
    const startedAt = performance.now();
    let frame = 0;
    let clearPulse = 0;

    if (change === 0) return;

    setChanged(true);
    clearPulse = window.setTimeout(() => setChanged(false), 780);

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(start + change * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(clearPulse);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={`${styles.teamScore} ${changed ? styles.scoreChanged : ''}`}>
      {displayValue}
    </div>
  );
}

export default function TeamScore({ team1Name, team2Name, team1, team2, activeTeam }: Props) {
  return (
    <div className={styles.scoreBoard}>
      <div className={`${styles.teamSide} ${activeTeam === 1 ? styles.activeTeam : ''}`}>
        <div className={styles.teamName}>{team1Name}</div>
        <AnimatedScore value={team1} />
      </div>

      <div className={`${styles.teamSide} ${activeTeam === 2 ? styles.activeTeam : ''}`}>
        <div className={styles.teamName}>{team2Name}</div>
        <AnimatedScore value={team2} />
      </div>
    </div>
  );
}
