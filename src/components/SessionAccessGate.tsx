'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import useActiveSession from '@/hooks/useActiveSession';
import useAuthProfile from '@/hooks/useAuthProfile';
import { type AccessSurface, validateSessionAccess } from '@/lib/sessionAccess';

type SessionAccessGateProps = {
  surface: AccessSurface;
  children: React.ReactNode;
};

export default function SessionAccessGate({ surface, children }: SessionAccessGateProps) {
  const sessionId = useActiveSession();
  const { user, profile, loading: authLoading } = useAuthProfile();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading) return;
      if (!sessionId) {
        setAllowed(false);
        setChecking(false);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const ok = await validateSessionAccess(sessionId, surface, token, user?.id ?? null, profile);
      setAllowed(ok);
      setChecking(false);
    };

    setChecking(true);
    void checkAccess();
  }, [authLoading, profile, sessionId, surface, user?.id]);

  if (authLoading || checking) {
    return (
      <main style={{ padding: 32 }}>
        <p>Checking session access...</p>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main style={{ padding: 32 }}>
        <h1>Session Access Required</h1>
        <p>This link is missing the right session access token, or your account does not own this game.</p>
        <Link href="/sessions">Back to sessions</Link>
      </main>
    );
  }

  return <>{children}</>;
}
