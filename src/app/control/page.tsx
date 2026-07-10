'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import useActiveSession from '@/hooks/useActiveSession';
import LeftPane from '@/components/control/LeftPane';
import MiddlePane from '@/components/control/MiddlePane';
import RightPane from '@/components/control/RightPane';
import FastMoneyPane from '@/components/control/FastMoneyPane';
import styles from './ControlPanel.module.scss';

export default function ControlPanelPage() {
  const sessionId = useActiveSession();
  const [isFastMoney, setIsFastMoney] = useState(false);

  // Load current round for the active session
  useEffect(() => {
    if (!sessionId) {
      setIsFastMoney(false);
      return;
    }

    const load = async () => {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('round')
        .eq('id', sessionId)
        .single();

      if (error) {
        console.error('Load session failed:', error.message);
        return;
      }

      setIsFastMoney(data?.round === 'fast_money');
    };
    load();
  }, [sessionId]);

  // Realtime: react to round changes
  useEffect(() => {
    if (!sessionId) return;

    const ch = supabase
      .channel(`control_panel_round_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          setIsFastMoney(payload.new.status === 'active' && payload.new.round === 'fast_money');
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch); // don't return a Promise from cleanup
    };
  }, [sessionId]);

  return (
    <div className={styles.controlPanel}>
      <LeftPane />
      <MiddlePane />
      <RightPane />

      {isFastMoney && (
        <div className={styles.fastMoneyBlock}>
          <FastMoneyPane />
        </div>
      )}
    </div>
  );
}
