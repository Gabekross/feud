// src/components/TeamControlIndicator.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import useActiveSession from '@/hooks/useActiveSession';
import styles from './TeamControlIndicator.module.scss';

type Props = { activeTeam: number };

export default function TeamControlIndicator({ activeTeam }: Props) {
  const sessionId = useActiveSession();
  const [team1Name, setTeam1Name] = useState('Team 1');
  const [team2Name, setTeam2Name] = useState('Team 2');

  // Initial load
  useEffect(() => {
    (async () => {
      if (!sessionId) return;
      const { data, error } = await supabase
        .from('game_sessions')
        .select('team1_name, team2_name')
        .eq('id', sessionId)
        .single();

      if (!error && data) {
        setTeam1Name(data.team1_name ?? 'Team 1');
        setTeam2Name(data.team2_name ?? 'Team 2');
      }
    })();
  }, [sessionId]);

  // Realtime subscription
  useEffect(() => {
    if (!sessionId) return;

    const ch = supabase
      .channel(`team_names_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          const row = payload.new as { team1_name?: string; team2_name?: string };
          if (typeof row.team1_name === 'string') setTeam1Name(row.team1_name || 'Team 1');
          if (typeof row.team2_name === 'string') setTeam2Name(row.team2_name || 'Team 2');
        }
      )
      .subscribe();

    return () => {
      // important: don't return a Promise from cleanup
      void supabase.removeChannel(ch);
    };
  }, [sessionId]);

  return (
    <div className={styles.controlBar}>
      <span className={activeTeam === 1 ? styles.active : ''}>{team1Name}</span>
      <span className={activeTeam === 2 ? styles.active : ''}>{team2Name}</span>
    </div>
  );
}
