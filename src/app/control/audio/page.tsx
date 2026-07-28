import Link from 'next/link';
import SessionAccessGate from '@/components/SessionAccessGate';
import MusicControls from '@/components/control/MusicControls';
import ScreenConnectionStatus from '@/components/control/ScreenConnectionStatus';
import styles from './AudioOperator.module.scss';

function AudioOperatorContent() {
  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <div>
            <Link href="/family-face-off" className={styles.backLink}>Control Hub</Link>
            <h1>Audio Operator</h1>
            <p>Music and crowd controls for the active game session.</p>
          </div>
          <ScreenConnectionStatus />
        </header>

        <MusicControls />
      </section>
    </main>
  );
}

export default function AudioOperatorPage() {
  return (
    <SessionAccessGate surface="audio">
      <AudioOperatorContent />
    </SessionAccessGate>
  );
}
