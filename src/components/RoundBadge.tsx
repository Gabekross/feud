// src/components/RoundBadge.tsx
//
// Game-show style pill that tells the audience which round is active.
// Color-coded so it reads at a glance from across the room:
//   • Regular rounds 1–4: blue/electric (informational)
//   • Sudden Death:        red (high tension)
//   • Fast Money:          gold + pulsing glow (climactic)
//   • Winner:              deep gold (celebratory)

import styles from './RoundBadge.module.scss';

export type Round =
  | 'round1' | 'round2' | 'round3' | 'round4'
  | 'sudden_death' | 'fast_money' | 'winner'
  | null | undefined;

const LABELS: Record<string, string> = {
  round1:       'ROUND 1',
  round2:       'ROUND 2',
  round3:       'ROUND 3',
  round4:       'ROUND 4',
  sudden_death: 'SUDDEN DEATH',
  fast_money:   'FAST MONEY',
  winner:       'GAME OVER',
};

export default function RoundBadge({ round }: { round: Round }) {
  if (!round) return null;
  const label = LABELS[round];
  if (!label) return null;

  const variant =
    round === 'fast_money'   ? styles.fastMoney   :
    round === 'sudden_death' ? styles.suddenDeath :
    round === 'winner'       ? styles.winner      :
                               styles.regular;

  return (
    <div className={`${styles.badge} ${variant}`} role="status" aria-live="polite">
      {label}
    </div>
  );
}
