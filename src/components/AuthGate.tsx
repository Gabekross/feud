'use client';

import Link from 'next/link';
import useAuthProfile from '@/hooks/useAuthProfile';

type AuthGateProps = {
  children: React.ReactNode;
  adminOnly?: boolean;
};

export default function AuthGate({ children, adminOnly = false }: AuthGateProps) {
  const { user, profile, loading, isAdmin } = useAuthProfile();

  if (loading) {
    return (
      <main style={{ padding: 32 }}>
        <p>Checking account...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main style={{ padding: 32 }}>
        <h1>Sign in required</h1>
        <p>Please sign in to continue.</p>
        <Link href="/auth">Sign in</Link>
      </main>
    );
  }

  if (adminOnly && !isAdmin) {
    return (
      <main style={{ padding: 32 }}>
        <h1>Platform Admin Only</h1>
        <p>Your account is signed in as {profile?.role ?? 'host'}, so question-bank management is locked.</p>
        <Link href="/sessions">Back to sessions</Link>
      </main>
    );
  }

  return <>{children}</>;
}
