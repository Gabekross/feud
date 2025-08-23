// src/app/main/MainScreenPage.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import useActiveSession from '@/hooks/useActiveSession';
import QuestionDisplay from '@/components/QuestionDisplay';
import AnswerBoxes from '@/components/AnswerBoxes';
import TeamScore from '@/components/TeamScore';
import TeamControlIndicator from '@/components/TeamControlIndicator';
import StrikeDisplay from '@/components/StrikeDisplay';
import FastMoneyBoard from '@/components/FastMoneyBoard';
import FullscreenToggle from '@/components/FullscreenToggle';
import styles from './MainScreen.module.scss';

export default function MainScreenPage() {
  const sessionId = useActiveSession();

  // live names
  const [team1Name, setTeam1Name] = useState('Team 1');
  const [team2Name, setTeam2Name] = useState('Team 2');

  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState<{ text: string; revealed: boolean; points: number }[]>([]);
  const [teamScores, setTeamScores] = useState({ team1: 0, team2: 0 });
  const [activeTeam, setActiveTeam] = useState<number | null>(null);
  const [strikes, setStrikes] = useState(0);
  const [showStrikeModal, setShowStrikeModal] = useState(false);
  const [isFastMoney, setIsFastMoney] = useState(false);

  // Fast Money timer (synced to DB)
  const [fmRunning, setFmRunning] = useState(false);
  const [fmStartedAt, setFmStartedAt] = useState<string | null>(null);
  const [fmDuration, setFmDuration] = useState<number>(20);
  const [fmRemain, setFmRemain] = useState<number>(20);
  const rafRef = useRef<number | null>(null);

  const prevStrikesRef = useRef(0);

  const getTimerColor = () => {
  const ratio = fmRemain / fmDuration;
  if (ratio > 0.5) return "#4caf50"; // green
  if (ratio > 0.2) return "#ffeb3b"; // yellow
  return "#f44336"; // red
};


  const computeRemain = () => {
    if (fmRunning && fmStartedAt) {
      const start = new Date(fmStartedAt).getTime();
      const elapsed = Math.floor((Date.now() - start) / 1000);
      return Math.max(0, fmDuration - elapsed);
    }
    return Math.max(0, fmDuration);
  };

  const loadQAByQuestionId = async (qid: string) => {
    const { data: q } = await supabase
      .from('questions')
      .select('question_text')
      .eq('id', qid)
      .single();
    setQuestion(q?.question_text ?? '');

    const { data: a } = await supabase
      .from('answers')
      .select('answer_text, points, revealed, "order"')
      .eq('question_id', qid)
      .order('order', { ascending: true });

    setAnswers((a ?? []).map((x) => ({ text: x.answer_text, points: x.points, revealed: x.revealed })));
  };

  const loadInitial = async () => {
    if (!sessionId) return;

    const { data: session } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (session) {
      // names
      setTeam1Name(session.team1_name ?? 'Team 1');
      setTeam2Name(session.team2_name ?? 'Team 2');

      setTeamScores({ team1: session.team1_score ?? 0, team2: session.team2_score ?? 0 });
      setActiveTeam(session.active_team ?? 1);
      setStrikes(session.strikes ?? 0);
      prevStrikesRef.current = session.strikes ?? 0;

      setIsFastMoney(session.round === 'fast_money');

      // FM timer snapshot
      setFmRunning(!!session.fm_timer_running);
      setFmStartedAt(session.fm_timer_started_at ?? null);
      setFmDuration(session.fm_timer_duration ?? (session.fast_money_seconds ?? 20));
      setFmRemain(() => {
        if (session.fm_timer_running && session.fm_timer_started_at) {
          const start = new Date(session.fm_timer_started_at).getTime();
          const elapsed = Math.floor((Date.now() - start) / 1000);
          return Math.max(0, (session.fm_timer_duration ?? 0) - elapsed);
        }
        return Math.max(0, session.fm_timer_duration ?? (session.fast_money_seconds ?? 20));
      });
    }

    // only fetch normal round Q/A if not FM
    if (!session?.round || session.round !== 'fast_money') {
      const { data: sessionQ } = await supabase
        .from('session_questions')
        .select('question_id')
        .eq('session_id', sessionId)
        .eq('is_current', true)
        .single();

      if (sessionQ?.question_id) await loadQAByQuestionId(sessionQ.question_id);
    }
  };

  useEffect(() => {
    loadInitial();
  }, [sessionId]);

  // ticking for FM timer (requestAnimationFrame for smoothness)
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const loop = () => {
      setFmRemain(computeRemain());
      if (fmRunning) {
        rafRef.current = requestAnimationFrame(loop);
      }
    };

    if (fmRunning) {
      rafRef.current = requestAnimationFrame(loop);
    } else {
      setFmRemain(computeRemain());
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fmRunning, fmStartedAt, fmDuration]);

  // realtime: team names, scores, strikes, FM timer fields, answer reveals
  useEffect(() => {
    if (!sessionId) return;

    const sub = supabase
      .channel(`main_screen_live_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` },
        (payload: any) => {
          const s = payload.new;

          if (typeof s.team1_name === 'string') setTeam1Name(s.team1_name);
          if (typeof s.team2_name === 'string') setTeam2Name(s.team2_name);

          const newStrikes = s.strikes ?? 0;
          if (newStrikes > prevStrikesRef.current) {
            setShowStrikeModal(true);
            setTimeout(() => setShowStrikeModal(false), 1200);
          }
          prevStrikesRef.current = newStrikes;
          setStrikes(newStrikes);

          setTeamScores({ team1: s.team1_score, team2: s.team2_score });
          setActiveTeam(s.active_team);
          setIsFastMoney(s.round === 'fast_money');

          // FM timer live
          setFmRunning(!!s.fm_timer_running);
          setFmStartedAt(s.fm_timer_started_at ?? null);
          setFmDuration(s.fm_timer_duration ?? (s.fast_money_seconds ?? 20));
          setFmRemain(() => {
            if (s.fm_timer_running && s.fm_timer_started_at) {
              const start = new Date(s.fm_timer_started_at).getTime();
              const elapsed = Math.floor((Date.now() - start) / 1000);
              return Math.max(0, (s.fm_timer_duration ?? 0) - elapsed);
            }
            return Math.max(0, s.fm_timer_duration ?? (s.fast_money_seconds ?? 20));
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'answers' },
        (payload: any) => {
          const updated = payload.new;
          setAnswers((prev) =>
            prev.map((a) =>
              a.text === updated.answer_text ? { ...a, revealed: updated.revealed } : a
            )
          );
        }
      )
      .subscribe();

    return () => {
      // don't return the Promise
      void supabase.removeChannel(sub);
    };
  }, [sessionId]);

  // normal-round: react to is_current flipping
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`main_screen_current_round_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'session_questions', filter: `session_id=eq.${sessionId}` },
        async (payload: any) => {
          if (payload.new?.is_current) {
            await loadQAByQuestionId(payload.new.question_id as string);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);
  useEffect(() => {
  const tryFs = async () => {
    if (!document.fullscreenElement) {
      try { await document.documentElement.requestFullscreen(); } catch {}
    }
    window.removeEventListener('click', tryFs);
    window.removeEventListener('keydown', tryFs);
    window.removeEventListener('touchstart', tryFs);
  };
  window.addEventListener('click', tryFs, { once: true });
  window.addEventListener('keydown', tryFs, { once: true });
  window.addEventListener('touchstart', tryFs, { once: true });
  return () => {
    window.removeEventListener('click', tryFs);
    window.removeEventListener('keydown', tryFs);
    window.removeEventListener('touchstart', tryFs);
  };
}, []);


  return (
    <div className={styles.mainScreen}>
      <FullscreenToggle/>
      <TeamScore
        team1Name={team1Name}
        team2Name={team2Name}
        team1={teamScores.team1}
        team2={teamScores.team2}
      />

      <TeamControlIndicator activeTeam={activeTeam ?? 1} />

      {isFastMoney ? (
        <>
          {/* Top-right synced timer (styled via .fmTimerTopRight) */}
<div className={styles.fmTimerTopRight}>
  <svg viewBox="0 0 100 100" className={styles.timerSvg}>
    <circle className={styles.bg} cx="50" cy="50" r="45" />
    <circle
      className={styles.progress}
      cx="50"
      cy="50"
      r="45"
      style={{
        strokeDasharray: 2 * Math.PI * 45,
        strokeDashoffset: ((fmRemain / fmDuration) * 2 * Math.PI * 45),
        stroke: getTimerColor(), // dynamic ring color
      }}
    />
    <text x="50" y="54" textAnchor="middle" className={styles.time}>
      {fmRemain}
    </text>
  </svg>
</div>



          <FastMoneyBoard />
        </>
      ) : (
        <>
          <QuestionDisplay question={question} />
          <AnswerBoxes answers={answers} />
          <StrikeDisplay count={strikes} />
        </>
      )}

      {showStrikeModal && <div className={styles.strikeModal}>❌</div>}
    </div>
  );
}
