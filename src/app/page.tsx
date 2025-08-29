import Link from 'next/link';
import styles from './Landing.module.scss';

const MAIN_PATH = '/main-screen';
const CONTROL_PATH = '/control';
const SETUP_PATH = '/admin/setup'; 
const VIEW_PATH = '/cards/slideshow'; 

export default function LandingPage() {
  return (
    <main className={styles.landing}>
      <header className={styles.header}>
        <h1>🎮 Gabekross Control Hub</h1>
        <p className={styles.tagline}>
          Run a full game: create a session, control rounds, and display the show screen.
        </p>
      </header>

      <section className={styles.grid}>
        <Link href={MAIN_PATH} className={styles.card}>
          <div className={styles.emoji}>📺</div>
          <h2>Main Screen</h2>
          <p>
            Audience display. Shows questions, answers, strikes, Fast Money, and scores in real time.
          </p>
          <span className={styles.cta}>Open</span>
        </Link>

        <Link href={SETUP_PATH} className={styles.card}>
          <div className={styles.emoji}>🛠️</div>
          <h2>Create Game Session</h2>
          <p>
            Pick questions for rounds 1–4, Sudden Death, and 5 Fast Money questions. Set team names.
          </p>
          <span className={styles.cta}>Create</span>
        </Link>

        <Link href={CONTROL_PATH} className={styles.card}>
          <div className={styles.emoji}>🎛️</div>
          <h2>Operator Panel</h2>
          <p>
            Reveal answers, track strikes, switch rounds, manage teams, and run Fast Money live.
          </p>
          <span className={styles.cta}>Launch</span>
        </Link>
         <Link href={VIEW_PATH} className={styles.card}>
          <div className={styles.emoji}>❓❓</div>
          <h2>Current Game Session Questions</h2>
          <p>
            Reveal Questions and answers for current game session.
          </p>
          <span className={styles.cta}>View</span>
        </Link>
      </section>

      <footer className={styles.footer}>
        <span>ⓘ Tip: Create a game session first, then open the Operator Panel and Main Screen.</span>
      </footer>
    </main>
  );
}
