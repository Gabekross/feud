'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
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

function AudioOperatorPageContent() {
  const searchParams = useSearchParams();
  const sessionId =
    searchParams.get('sessionId') ??
    searchParams.get('session') ??
    searchParams.get('sid');

  if (!sessionId) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <header className={styles.header}>
            <div>
              <Link href="/family-face-off" className={styles.backLink}>Control Hub</Link>
              <h1>Choose a Game Session</h1>
              <p>Open the Audio link from the game session you want to control.</p>
            </div>
          </header>
          <Link href="/sessions" className={styles.backLink}>Open My Game Sessions</Link>
        </section>
      </main>
    );
  }

  return (
    <SessionAccessGate surface="audio">
      <AudioOperatorContent />
    </SessionAccessGate>
  );
}

export default function AudioOperatorPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.page}>
          <section className={styles.shell}>
            <p>Loading audio controls...</p>
          </section>
        </main>
      }
    >
      <AudioOperatorPageContent />
    </Suspense>
  );
}
