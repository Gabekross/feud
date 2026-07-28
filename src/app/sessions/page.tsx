'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import useAuthProfile from '@/hooks/useAuthProfile';
import {
  archiveGameSession,
  duplicateGameSession,
  launchTemplateSession,
  publishSessionAsTemplate,
} from '@/lib/gameTemplates';
import { buildSessionLink } from '@/lib/sessionAccess';
import { supabase } from '@/lib/supabaseClient';
import styles from './SessionsPage.module.scss';

type GameSession = {
  id: string;
  status: string | null;
  round: string | null;
  team1_name: string | null;
  team2_name: string | null;
  event_title: string | null;
  owner_user_id: string | null;
  operator_token: string | null;
  screen_token: string | null;
  audio_token: string | null;
  cards_token: string | null;
};

type GameTemplate = {
  id: string;
  title: string;
  description: string | null;
  visibility: string | null;
};

const formatRound = (round: string | null) =>
  (round ?? 'not started').replace(/_/g, ' ');

function SessionsContent() {
  const router = useRouter();
  const { user, profile, isAdmin, signOut } = useAuthProfile();
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [templates, setTemplates] = useState<GameTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyMessage, setBusyMessage] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user) return;

      setLoading(true);
      let query = supabase
        .from('game_sessions')
        .select('id, status, round, team1_name, team2_name, event_title, owner_user_id, operator_token, screen_token, audio_token, cards_token')
        .limit(50);

      if (!isAdmin) {
        query = query.eq('owner_user_id', user.id);
      }

      if (!showArchived) {
        query = query.neq('status', 'completed');
      }

      const [{ data, error }, { data: templateRows, error: templateError }] = await Promise.all([
        query,
        supabase
          .from('game_templates')
          .select('id, title, description, visibility')
          .eq('status', 'active')
          .order('title', { ascending: true }),
      ]);

      if (error) {
        console.error('Load sessions failed:', error.message);
        setSessions([]);
      } else {
        setSessions((data ?? []) as GameSession[]);
      }

      if (templateError) {
        console.error('Load templates failed:', templateError.message);
        setTemplates([]);
      } else {
        setTemplates((templateRows ?? []) as GameTemplate[]);
      }

      setLoading(false);
    };

    void loadDashboard();
  }, [user, isAdmin, showArchived]);

  const handleLaunchTemplate = async (templateId: string) => {
    if (!user) return;
    setBusyMessage('Creating your private game copy...');
    try {
      const sessionId = await launchTemplateSession(templateId, user.id);
      router.push(`/control?sessionId=${sessionId}`);
    } catch (error) {
      console.error(error);
      setBusyMessage(error instanceof Error ? error.message : 'Could not launch template.');
    }
  };

  const handlePublishTemplate = async (session: GameSession) => {
    if (!user || !isAdmin) return;
    const title = window.prompt('Template title', session.event_title ?? 'Ready-Made Game');
    if (!title?.trim()) return;

    setBusyMessage('Publishing ready-made game...');
    try {
      await publishSessionAsTemplate(session.id, title.trim(), user.id);
      setBusyMessage('Template published.');
      const { data } = await supabase
        .from('game_templates')
        .select('id, title, description, visibility')
        .eq('status', 'active')
        .order('title', { ascending: true });
      setTemplates((data ?? []) as GameTemplate[]);
    } catch (error) {
      console.error(error);
      setBusyMessage(error instanceof Error ? error.message : 'Could not publish template.');
    }
  };

  const handleDuplicateSession = async (session: GameSession) => {
    if (!user) return;
    setBusyMessage('Duplicating game session...');
    try {
      const sessionId = await duplicateGameSession(session.id, user.id);
      router.push(`/control?sessionId=${sessionId}`);
    } catch (error) {
      console.error(error);
      setBusyMessage(error instanceof Error ? error.message : 'Could not duplicate session.');
    }
  };

  const handleArchiveSession = async (session: GameSession) => {
    const confirmed = window.confirm(`Archive this game session?\n\n${session.event_title ?? 'Untitled Game'}`);
    if (!confirmed) return;

    setBusyMessage('Archiving game session...');
    try {
      await archiveGameSession(session.id);
      setSessions((current) => current.filter((item) => item.id !== session.id));
      setBusyMessage('Game session archived.');
    } catch (error) {
      console.error(error);
      setBusyMessage(error instanceof Error ? error.message : 'Could not archive session.');
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Game Sessions</h1>
          <p>
            {isAdmin
              ? 'Platform Admin view: open or support any game session.'
              : 'Open your games without disturbing another live game.'}
          </p>
          <p>Signed in as {profile?.email ?? user?.email} ({profile?.role ?? 'host'}).</p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.createLink} href="/admin/setup">
            Create Game
          </Link>
          {isAdmin && (
            <>
              <Link className={styles.createLink} href="/admin/templates">
                Templates
              </Link>
              <Link className={styles.createLink} href="/admin/users">
                Users
              </Link>
              <Link className={styles.createLink} href="/admin/questions">
                Question Bank
              </Link>
            </>
          )}
          <button className={styles.signOut} onClick={signOut}>
            Sign Out
          </button>
        </div>
      </header>

      {loading ? (
        <div className={styles.empty}>Loading sessions...</div>
      ) : (
        <>
          {busyMessage && <div className={styles.notice}>{busyMessage}</div>}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>My Games</h2>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(event) => setShowArchived(event.target.checked)}
                />
                Show archived
              </label>
            </div>
            {sessions.length === 0 ? (
              <div className={styles.empty}>No game sessions found.</div>
            ) : (
              <div className={styles.grid}>
                {sessions.map((session) => (
                  <article className={styles.card} key={session.id}>
                    <div className={styles.meta}>
                      <span className={`${styles.badge} ${session.status === 'active' ? styles.active : ''}`}>
                        {session.status ?? 'unknown'}
                      </span>
                      <span className={styles.badge}>{formatRound(session.round)}</span>
                    </div>
                    <h2>{session.event_title || 'Untitled Game'}</h2>
                    <p>{session.team1_name || 'Team 1'} vs {session.team2_name || 'Team 2'}</p>
                    <div className={styles.actions}>
                      <Link href={buildSessionLink('/control', session.id, 'operator', session.operator_token)}>Control</Link>
                      <Link href={buildSessionLink('/main-screen', session.id, 'screen', session.screen_token)}>Main Screen</Link>
                      <Link href={buildSessionLink('/control/audio', session.id, 'audio', session.audio_token)}>Audio</Link>
                      <Link href={buildSessionLink('/cards', session.id, 'cards', session.cards_token)}>Cards</Link>
                      <button onClick={() => handleDuplicateSession(session)}>
                        Duplicate
                      </button>
                      {session.status !== 'completed' && (
                        <button onClick={() => handleArchiveSession(session)}>
                          Archive
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => handlePublishTemplate(session)}>
                          Publish Template
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Ready-Made Games</h2>
            </div>
            {templates.length === 0 ? (
              <div className={styles.empty}>No ready-made games are available yet.</div>
            ) : (
              <div className={styles.grid}>
                {templates.map((template) => (
                  <article className={styles.card} key={template.id}>
                    <div className={styles.meta}>
                      <span className={styles.badge}>{template.visibility ?? 'template'}</span>
                    </div>
                    <h2>{template.title}</h2>
                    <p>{template.description ?? 'Launch a private copy of this ready-made game.'}</p>
                    <div className={styles.actions}>
                      <button onClick={() => handleLaunchTemplate(template.id)}>
                        Use This Game
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default function SessionsPage() {
  return (
    <AuthGate>
      <SessionsContent />
    </AuthGate>
  );
}
