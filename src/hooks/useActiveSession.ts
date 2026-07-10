// hooks/useActiveSession.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function useActiveSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase
        .from('game_sessions')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      setSessionId(data?.id ?? null);
    };

    getSession();

    const channel = supabase
      .channel(`active_session_watch_${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_sessions' },
        () => {
          void getSession();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return sessionId;
}
