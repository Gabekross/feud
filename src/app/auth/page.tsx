'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useAuthProfile from '@/hooks/useAuthProfile';
import { supabase } from '@/lib/supabaseClient';
import styles from './AuthPage.module.scss';

export default function AuthPage() {
  const router = useRouter();
  const { user, loading } = useAuthProfile();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setStatus('');

    const credentials = {
      email: email.trim(),
      password,
    };

    const { error } = mode === 'signin'
      ? await supabase.auth.signInWithPassword(credentials)
      : await supabase.auth.signUp(credentials);

    if (error) {
      setStatus(error.message);
      setSaving(false);
      return;
    }

    setStatus(mode === 'signup' ? 'Account created. Check your email if confirmation is enabled.' : 'Signed in.');
    setSaving(false);
    router.push('/family-face-off');
  };

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Jemigah Family Games</p>
        <h1>{mode === 'signin' ? 'Enter Game Suite' : 'Create Host Account'}</h1>
        <p>
          {mode === 'signin'
            ? 'Sign in to enter the Gabekross Control Hub, then choose sessions, templates, admin tools, or live show links.'
            : 'Create an account to host games. The first account becomes Platform Admin; later accounts start as hosts.'}
        </p>
        <div className={styles.infoBox}>
          <strong>What happens after sign-in?</strong>
          <span>You will enter the Gabekross Control Hub. From there, open My Game Sessions to use each game&apos;s Control, Main Screen, Audio, and Cards links.</span>
        </div>

        {!loading && user && (
          <div className={styles.status}>
            You are already signed in. <Link href="/family-face-off">Open Gabekross Control Hub</Link>.
          </div>
        )}

        <form className={styles.form} onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={6}
              required
            />
          </label>

          <div className={styles.actions}>
            <button className={styles.primary} type="submit" disabled={saving}>
              {saving ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
            <button
              className={styles.secondary}
              type="button"
              onClick={() => {
                setStatus('');
                setMode(mode === 'signin' ? 'signup' : 'signin');
              }}
            >
              {mode === 'signin' ? 'Create account' : 'Sign in instead'}
            </button>
          </div>
        </form>

        {status && <div className={styles.status}>{status}</div>}
        <Link className={styles.backLink} href="/">Back to public site</Link>
      </section>
    </main>
  );
}
