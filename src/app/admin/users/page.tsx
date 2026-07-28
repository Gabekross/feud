'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AuthGate from '@/components/AuthGate';
import useAuthProfile from '@/hooks/useAuthProfile';
import { supabase } from '@/lib/supabaseClient';
import styles from './UsersAdmin.module.scss';

type Role = 'admin' | 'host';

type ProfileRow = {
  id: string;
  email: string | null;
  role: Role;
  created_at: string | null;
};

type CountRow = {
  owner_user_id?: string | null;
  user_id?: string | null;
};

type UserStats = {
  sessions: number;
  activeSessions: number;
  assignments: number;
};

const emptyStats: UserStats = {
  sessions: 0,
  activeSessions: 0,
  assignments: 0,
};

const increment = (counts: Record<string, number>, key: string | null | undefined) => {
  if (!key) return;
  counts[key] = (counts[key] ?? 0) + 1;
};

function UsersAdminContent() {
  const { user } = useAuthProfile();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [stats, setStats] = useState<Record<string, UserStats>>({});
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setNotice('');

    const [
      { data: profileRows, error: profileError },
      { data: sessionRows, error: sessionError },
      { data: activeRows, error: activeError },
      { data: assignmentRows, error: assignmentError },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, role, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('game_sessions')
        .select('owner_user_id'),
      supabase
        .from('game_sessions')
        .select('owner_user_id')
        .eq('status', 'active'),
      supabase
        .from('game_template_assignments')
        .select('user_id'),
    ]);

    if (profileError) {
      console.error(profileError);
      setNotice('Could not load users.');
      setProfiles([]);
      setLoading(false);
      return;
    }

    if (sessionError) console.error('Session counts failed:', sessionError.message);
    if (activeError) console.error('Active session counts failed:', activeError.message);
    if (assignmentError) console.error('Assignment counts failed:', assignmentError.message);

    const sessionCounts: Record<string, number> = {};
    const activeCounts: Record<string, number> = {};
    const assignmentCounts: Record<string, number> = {};

    ((sessionRows ?? []) as CountRow[]).forEach((row) => increment(sessionCounts, row.owner_user_id));
    ((activeRows ?? []) as CountRow[]).forEach((row) => increment(activeCounts, row.owner_user_id));
    ((assignmentRows ?? []) as CountRow[]).forEach((row) => increment(assignmentCounts, row.user_id));

    const typedProfiles = (profileRows ?? []) as ProfileRow[];
    setProfiles(typedProfiles);
    setStats(Object.fromEntries(
      typedProfiles.map((profile) => [
        profile.id,
        {
          sessions: sessionCounts[profile.id] ?? 0,
          activeSessions: activeCounts[profile.id] ?? 0,
          assignments: assignmentCounts[profile.id] ?? 0,
        },
      ])
    ));
    setLoading(false);
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const summary = useMemo(() => {
    return {
      total: profiles.length,
      admins: profiles.filter((profile) => profile.role === 'admin').length,
      hosts: profiles.filter((profile) => profile.role === 'host').length,
      activeSessions: Object.values(stats).reduce((sum, item) => sum + item.activeSessions, 0),
    };
  }, [profiles, stats]);

  const updateRole = async (profile: ProfileRow, role: Role) => {
    if (profile.id === user?.id && role !== 'admin') {
      const otherAdmins = profiles.filter((item) => item.role === 'admin' && item.id !== profile.id);
      if (otherAdmins.length === 0) {
        setNotice('You cannot demote the only Platform Admin account.');
        return;
      }
    }

    const label = profile.email ?? profile.id;
    const confirmed = window.confirm(`Change ${label} to ${role}?`);
    if (!confirmed) return;

    const { error } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', profile.id);

    if (error) {
      console.error(error);
      setNotice('Could not update user role.');
      return;
    }

    setNotice(`Updated ${label} to ${role}.`);
    await loadUsers();
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link className={styles.backLink} href="/sessions">Back to sessions</Link>
          <h1>User Manager</h1>
          <p>Review host accounts, role access, game activity, and assigned custom games.</p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.headerLink} href="/admin/templates">Templates</Link>
          <Link className={styles.headerLink} href="/admin/questions">Question Bank</Link>
        </div>
      </header>

      {notice && <div className={styles.notice}>{notice}</div>}

      <section className={styles.summary}>
        <div className={styles.summaryCard}>
          <span>Total Users</span>
          <strong>{summary.total}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span>Admins</span>
          <strong>{summary.admins}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span>Hosts</span>
          <strong>{summary.hosts}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span>Active Games</span>
          <strong>{summary.activeSessions}</strong>
        </div>
      </section>

      {loading ? (
        <div className={styles.empty}>Loading users...</div>
      ) : profiles.length === 0 ? (
        <div className={styles.empty}>No user profiles found.</div>
      ) : (
        <section className={styles.table}>
          <div className={`${styles.row} ${styles.heading}`}>
            <span>User</span>
            <span>Role</span>
            <span>Sessions</span>
            <span>Active</span>
            <span>Assigned</span>
            <span>Actions</span>
          </div>

          {profiles.map((profile) => {
            const rowStats = stats[profile.id] ?? emptyStats;
            return (
              <article className={styles.row} key={profile.id}>
                <div className={styles.identity}>
                  <strong>{profile.email ?? 'No email'}</strong>
                  <span>{profile.id}</span>
                </div>
                <span className={`${styles.badge} ${profile.role === 'admin' ? styles.admin : styles.host}`}>
                  {profile.role}
                </span>
                <strong>{rowStats.sessions}</strong>
                <strong>{rowStats.activeSessions}</strong>
                <strong>{rowStats.assignments}</strong>
                <div className={styles.actions}>
                  {profile.role === 'host' ? (
                    <button className={styles.primary} onClick={() => updateRole(profile, 'admin')}>
                      Promote
                    </button>
                  ) : (
                    <button onClick={() => updateRole(profile, 'host')}>
                      Demote
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

export default function UsersAdminPage() {
  return (
    <AuthGate adminOnly>
      <UsersAdminContent />
    </AuthGate>
  );
}
