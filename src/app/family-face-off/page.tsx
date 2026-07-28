import Link from 'next/link';
import HelpSection from '@/components/HelpSection';
import styles from './FamilyFaceOffHub.module.scss';

const MAIN_PATH = '/main-screen';
const CONTROL_PATH = '/control';
const SESSIONS_PATH = '/sessions';
const SETUP_PATH = '/admin/setup';
const QUESTIONS_PATH = '/admin/questions';
const TEMPLATES_PATH = '/admin/templates';
const USERS_PATH = '/admin/users';
const VIEW_PATH = '/cards/slideshow';
const RULES_PATH = '/rules';

export default function FamilyFaceOffHubPage() {
  return (
    <main className={styles.landing}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          Family Games
        </Link>
        <h1>Gabekross Control Hub</h1>
        <p className={styles.tagline}>
          Run a full game: create a session, control rounds, and display the show screen.
        </p>
      </header>

      <section className={styles.grid}>
        <Link href={SESSIONS_PATH} className={styles.card}>
          <div className={styles.emoji}>HOME</div>
          <h2>My Game Sessions</h2>
          <p>
            Open your saved games, launch session-specific screens, or create a new game.
          </p>
          <span className={styles.cta}>Open Dashboard</span>
        </Link>

        <Link href={MAIN_PATH} className={styles.card}>
          <div className={styles.emoji}>TV</div>
          <h2>Main Screen</h2>
          <p>
            Audience display. Shows questions, answers, strikes, Fast Money, and scores in real time.
          </p>
          <span className={styles.cta}>Open</span>
        </Link>

        <Link href={SETUP_PATH} className={styles.card}>
          <div className={styles.emoji}>SET</div>
          <h2>Create Game Session</h2>
          <p>
            Pick questions for rounds 1-4, Tie Breaker, and 5 Fast Money questions. Set team names.
          </p>
          <span className={styles.cta}>Create</span>
        </Link>

        <Link href={CONTROL_PATH} className={styles.card}>
          <div className={styles.emoji}>CTL</div>
          <h2>Operator Panel</h2>
          <p>
            Reveal answers, track strikes, switch rounds, manage teams, and run Fast Money live.
          </p>
          <span className={styles.cta}>Launch</span>
        </Link>

        <Link href={SESSIONS_PATH} className={styles.card}>
          <div className={styles.emoji}>AUD</div>
          <h2>Audio Operator</h2>
          <p>
            Choose a game session, then open its dedicated music and crowd controls.
          </p>
          <span className={styles.cta}>Choose Session</span>
        </Link>

        <Link href={QUESTIONS_PATH} className={styles.card}>
          <div className={styles.emoji}>Q+A</div>
          <h2>Question Admin</h2>
          <p>
            Add questions, answer rows, points, and round types to the Supabase question pool.
          </p>
          <span className={styles.cta}>Manage</span>
        </Link>

        <Link href={TEMPLATES_PATH} className={styles.card}>
          <div className={styles.emoji}>TPL</div>
          <h2>Template Manager</h2>
          <p>
            Manage ready-made games, publishable templates, and custom assigned game packages.
          </p>
          <span className={styles.cta}>Manage</span>
        </Link>

        <Link href={USERS_PATH} className={styles.card}>
          <div className={styles.emoji}>USR</div>
          <h2>User Manager</h2>
          <p>
            Review host accounts, promote admins, and monitor game activity by user.
          </p>
          <span className={styles.cta}>Manage</span>
        </Link>

        <Link href={VIEW_PATH} className={styles.card}>
          <div className={styles.emoji}>VIEW</div>
          <h2>Current Game Session Questions</h2>
          <p>
            Review questions and answers for the current game session.
          </p>
          <span className={styles.cta}>View</span>
        </Link>

        <Link href={RULES_PATH} className={styles.card}>
          <div className={styles.emoji}>RULES</div>
          <h2>Player Rules</h2>
          <p>
            Share a mobile-friendly How to Play page with contestants and guests before the game.
          </p>
          <span className={styles.cta}>Open Rules</span>
        </Link>
      </section>

      <HelpSection />

      <footer className={styles.footer}>
        <span>Tip: Create a game session first, then open the Operator Panel and Main Screen.</span>
      </footer>
    </main>
  );
}
