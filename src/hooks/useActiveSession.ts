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
        .single();

      if (data) setSessionId(data.id);
    };

    getSession();
  }, []);

  return sessionId;
}
