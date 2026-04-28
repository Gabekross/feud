// src/components/TeamScore.tsx
'use client';

import styles from './TeamScore.module.scss';

type Props = {
  team1Name: string;
  team2Name: string;
  team1: number;
  team2: number;
  activeTeam?: number; // 1 or 2 — highlights the playing team
};

export default function TeamScore({ team1Name, team2Name, team1, team2, activeTeam }: Props) {
  return (
    <div className={styles.scoreBoard}>
      {/* Team 1 */}
      <div className={`${styles.teamSide} ${activeTeam === 1 ? styles.activeTeam : ''}`}>
        <div className={styles.teamName}>{team1Name}</div>
        <div className={styles.teamScore}>{team1}</div>
      </div>

      {/* Center divider */}
      <div className={styles.divider} />

      {/* Team 2 */}
      <div className={`${styles.teamSide} ${activeTeam === 2 ? styles.activeTeam : ''}`}>
        <div className={styles.teamName}>{team2Name}</div>
        <div className={styles.teamScore}>{team2}</div>
      </div>
    </div>
  );
}
