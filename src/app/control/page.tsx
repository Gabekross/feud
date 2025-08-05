'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import LeftPane from '@/components/control/LeftPane';
import MiddlePane from '@/components/control/MiddlePane';
import RightPane from '@/components/control/RightPane';
import FastMoneyPane from '@/components/control/FastMoneyPane';
import styles from './ControlPanel.module.scss';

export default function ControlPanelPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isFastMoney, setIsFastMoney] = useState(false);

  // Load active session & current round
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('id, round')
        .eq('status', 'active')
        .single();

      if (error) {
        console.error('Load session failed:', error.message);
        return;
      }

      if (data) {
        setSessionId(data.id);
        setIsFastMoney(data.round === 'fast_money');
      }
    };
    load();
  }, []);

  // Realtime: react to round changes
  useEffect(() => {
    if (!sessionId) return;

    const ch = supabase
      .channel(`control_panel_round_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          setIsFastMoney(payload.new.round === 'fast_money');
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
