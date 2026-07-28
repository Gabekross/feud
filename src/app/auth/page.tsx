'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import styles from './AuthPage.module.scss';

export default function AuthPage() {
  const router = useRouter();
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
    router.push('/sessions');
  };

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <h1>{mode === 'signin' ? 'Sign In' : 'Create Account'}</h1>
        <p>
          {mode === 'signin'
            ? 'Open your games, create sessions, and manage live events.'
            : 'The first account created becomes Platform Admin; later accounts become hosts.'}
        </p>

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
        <Link className={styles.backLink} href="/family-face-off">Back to hub</Link>
      </section>
    </main>
  );
}
