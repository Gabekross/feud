'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function MainScreenPresenceBeacon({ sessionId }: { sessionId: string | null }) {
  useEffect(() => {
    if (!sessionId) return;

    const sendHeartbeat = async () => {
      const { error } = await supabase
        .from('screen_presence')
        .upsert({
          session_id: sessionId,
          screen_name: 'main_screen',
          last_seen: new Date().toISOString(),
        });

      if (error) console.error('Main screen presence heartbeat failed:', error.message);
    };

    void sendHeartbeat();
    const timer = window.setInterval(() => {
      void sendHeartbeat();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [sessionId]);

  return null;
}
