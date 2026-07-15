import Link from 'next/link';
import styles from './Landing.module.scss';

const games = [
  {
    name: 'Family Face Off',
    eyebrow: 'Live now',
    status: 'Ready to play',
    description: 'A premium family feud-style show board with regular rounds, a tie breaker, and Fast Money.',
    primaryHref: '/family-face-off',
    primaryLabel: 'Enter Game Suite',
  },
  {
    name: 'Clear the Board',
    eyebrow: 'Coming next',
    status: 'In planning',
    description: 'A fast-answer board-clearing challenge for teams, parties, and live audience play.',
    primaryHref: null,
    primaryLabel: 'Coming Soon',
  },
  {
    name: 'Speed Survey',
    eyebrow: 'Future game',
    status: 'Concept',
    description: 'Timed survey rounds built for quick turns, big reveals, and simple crowd-friendly scoring.',
    primaryHref: null,
    primaryLabel: 'Coming Soon',
  },
];

export default function LandingPage() {
  return (
    <main className={styles.landing}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.kicker}>Jemigah Family Games</p>
          <h1>Choose your game.</h1>
          <p className={styles.heroCopy}>
            Explore live family game experiences built for events, celebrations, and friendly competition.
          </p>
        </div>
      </section>

      <section className={styles.gamesSection} aria-label="Available games">
        <div className={styles.sectionHeading}>
          <p>Game Library</p>
          <h2>Live games and upcoming formats</h2>
        </div>

        <div className={styles.gameGrid}>
          {games.map((game) => (
            <article className={styles.gameCard} key={game.name}>
              <div className={styles.cardTopline}>
                <span>{game.eyebrow}</span>
                <em>{game.status}</em>
              </div>
              <h3>{game.name}</h3>
              <p>{game.description}</p>

              {game.primaryHref ? (
                <Link href={game.primaryHref} className={styles.cardPrimary}>
                  {game.primaryLabel}
                </Link>
              ) : (
                <span className={styles.cardDisabled}>{game.primaryLabel}</span>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
