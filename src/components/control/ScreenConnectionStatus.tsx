'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import useActiveSession from '@/hooks/useActiveSession';
import styles from './ScreenConnectionStatus.module.scss';

const CONNECTED_WINDOW_MS = 12000;

const formatLastSeen = (lastSeen: string | null) => {
  if (!lastSeen) return 'No heartbeat yet';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000));
  if (seconds < 2) return 'Just now';
  return `${seconds}s ago`;
};

export default function ScreenConnectionStatus() {
  const sessionId = useActiveSession();
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setLastSeen(null);
      return;
    }

    const loadPresence = async () => {
      const { data, error } = await supabase
        .from('screen_presence')
        .select('last_seen')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (error) {
        console.error('Load screen presence failed:', error.message);
        return;
      }

      setLastSeen(data?.last_seen ?? null);
    };

    void loadPresence();

    const channel = supabase
      .channel(`screen_presence_${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'screen_presence', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setLastSeen((payload.new as { last_seen?: string })?.last_seen ?? null);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const connected = useMemo(() => {
    if (!lastSeen) return false;
    return now - new Date(lastSeen).getTime() <= CONNECTED_WINDOW_MS;
  }, [lastSeen, now]);

  return (
    <div className={`${styles.status} ${connected ? styles.connected : styles.disconnected}`}>
      <span>{connected ? 'Main Screen Connected' : 'Main Screen Not Connected'}</span>
      <em>{formatLastSeen(lastSeen)}</em>
    </div>
  );
}
