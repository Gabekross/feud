// src/components/TeamScore.tsx
'use client';

import styles from './TeamScore.module.scss';

type Props = {
  team1Name: string;
  team2Name: string;
  team1: number;
  team2: number;
};

export default function TeamScore({ team1Name, team2Name, team1, team2 }: Props) {
  return (
    <div className={styles.scoreBoard}>
      <div className={styles.team}>
        <div className={styles.name}>{team1Name}</div>
        <div className={styles.score}>{team1}</div>
      </div>
      <div className={styles.team}>
        <div className={styles.name}>{team2Name}</div>
        <div className={styles.score}>{team2}</div>
      </div>
    </div>
  );
}
