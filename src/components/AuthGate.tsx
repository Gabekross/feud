'use client';

import Link from 'next/link';
import useAuthProfile from '@/hooks/useAuthProfile';
import styles from './AuthGate.module.scss';

type AuthGateProps = {
  children: React.ReactNode;
  adminOnly?: boolean;
};

export default function AuthGate({ children, adminOnly = false }: AuthGateProps) {
  const { user, profile, loading, isAdmin } = useAuthProfile();

  if (loading) {
    return (
      <main className={styles.page}>
        <section className={styles.panel}>
          <p className={styles.eyebrow}>Jemigah Family Games</p>
          <h1>Checking Game Suite access</h1>
          <p>One moment while we confirm your account and permissions.</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={styles.page}>
        <section className={styles.panel}>
          <p className={styles.eyebrow}>Game Suite Access</p>
          <h1>Enter the Game Suite</h1>
          <p>
            This area is for hosts and Platform Admins. Sign in to create games, open your sessions,
            launch ready-made templates, and manage live show links.
          </p>
          <ol className={styles.steps}>
            <li>Sign in or create your host account.</li>
            <li>Open your Sessions Dashboard.</li>
            <li>Use the generated Control, Main Screen, Audio, and Cards links for each game.</li>
          </ol>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/auth">Enter Game Suite</Link>
            <Link className={styles.secondary} href="/">Back to public site</Link>
          </div>
        </section>
      </main>
    );
  }

  if (adminOnly && !isAdmin) {
    return (
      <main className={styles.page}>
        <section className={styles.panel}>
          <p className={styles.eyebrow}>Platform Admin Only</p>
          <h1>Admin access required</h1>
          <p>
            Your account is signed in as {profile?.role ?? 'host'}. Hosts can run games and use
            ready-made templates, but this management page is reserved for Platform Admins.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/sessions">Back to sessions</Link>
            <Link className={styles.secondary} href="/">Public site</Link>
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
