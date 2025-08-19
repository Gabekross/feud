// 'use client';

// import { useEffect, useState } from 'react';
// import styles from './CountdownTimer.module.scss';

// export default function CountdownTimer({ seconds }: { seconds: number }) {
//   const [timeLeft, setTimeLeft] = useState(seconds);

//   useEffect(() => {
//     const interval = setInterval(() => {
//       setTimeLeft((t) => (t > 0 ? t - 1 : 0));
//     }, 1000);
//     return () => clearInterval(interval);
//   }, []);

//   return (
//     <div className={styles.timer}>
//       <div className={styles.circle}>
//         <span>{timeLeft}</span>
//       </div>
//     </div>
//   );
// }


'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import useActiveSession from '@/hooks/useActiveSession';

export default function CountdownTimer() {
  const sessionId = useActiveSession();

  // DB-backed state
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null); // ISO
  const [duration, setDuration] = useState<number>(20);            // seconds (remaining)

  // local tick
  const [now, setNow] = useState<number>(() => Date.now());
  const rafRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // initial fetch
  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      const { data } = await supabase
        .from('game_sessions')
        .select('fm_timer_running, fm_timer_started_at, fm_timer_duration, fast_money_seconds')
        .eq('id', sessionId)
        .single();

      setRunning(!!data?.fm_timer_running);
      setStartedAt(data?.fm_timer_started_at ?? null);
      setDuration(data?.fm_timer_duration ?? data?.fast_money_seconds ?? 20);
    })();
  }, [sessionId]);

  // realtime: keep in sync with DB updates
  useEffect(() => {
    if (!sessionId) return;

    const ch = supabase
      .channel(`countdown_timer_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` },
        (payload: any) => {
          setRunning(!!payload.new.fm_timer_running);
          setStartedAt(payload.new.fm_timer_started_at ?? null);
          setDuration(payload.new.fm_timer_duration ?? payload.new.fast_money_seconds ?? 20);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [sessionId]);

  // local tick driver (smooth-ish)
  useEffect(() => {
    // use a lightweight interval; requestAnimationFrame fallback
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setNow(Date.now()), 200);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // compute remaining
  const remaining = useMemo(() => {
    if (!running || !startedAt) return Math.max(0, duration);
    const startMs = new Date(startedAt).getTime();
    const elapsed = Math.floor((now - startMs) / 1000);
    return Math.max(0, duration - elapsed);
  }, [running, startedAt, duration, now]);

  // show as mm:ss or just seconds if < 60 desired
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const text = mm > 0 ? `${mm}:${ss.toString().padStart(2, '0')}` : `${remaining}`;

  return (
    <div aria-label="Fast Money Timer" title="Fast Money Timer">
      {text}
    </div>
  );
}
