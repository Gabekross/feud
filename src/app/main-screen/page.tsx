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
import CountdownTimer from '@/components/CountdownTimer';
import FastMoneyBoard from '@/components/FastMoneyBoard';
import styles from './MainScreen.module.scss';

export default function MainScreenPage() {
  const sessionId = useActiveSession();

  // 🆕 team names (live)
  const [team1Name, setTeam1Name] = useState('Team 1');
  const [team2Name, setTeam2Name] = useState('Team 2');

  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState<{ text: string; revealed: boolean; points: number }[]>([]);
  const [teamScores, setTeamScores] = useState({ team1: 0, team2: 0 });
  const [activeTeam, setActiveTeam] = useState<number | null>(null);
  const [strikes, setStrikes] = useState(0);
  const [showStrikeModal, setShowStrikeModal] = useState(false);
  const [isFastMoney, setIsFastMoney] = useState(false);

  const prevStrikesRef = useRef(0);

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

    setAnswers(
      (a ?? []).map((x) => ({ text: x.answer_text, points: x.points, revealed: x.revealed }))
    );
  };

  const loadInitial = async () => {
    if (!sessionId) return;

    const { data: session } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (session) {
      // 🆕 names
      setTeam1Name(session.team1_name ?? 'Team 1');
      setTeam2Name(session.team2_name ?? 'Team 2');

      setTeamScores({ team1: session.team1_score ?? 0, team2: session.team2_score ?? 0 });
      setActiveTeam(session.active_team ?? 1);
      setStrikes(session.strikes ?? 0);
      prevStrikesRef.current = session.strikes ?? 0;
      setIsFastMoney(session.round === 'fast_money');
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

  // Realtime: scores/strikes/active team + names + answer reveals
  useEffect(() => {
    if (!sessionId) return;

    const sub = supabase
      .channel(`main_screen_live_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          const s = payload.new;

          // 🆕 names
          if (typeof s.team1_name === 'string') setTeam1Name(s.team1_name);
          if (typeof s.team2_name === 'string') setTeam2Name(s.team2_name);

          // existing bits
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
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'answers' },
        (payload) => {
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
      void supabase.removeChannel(sub);
    };
  }, [sessionId]);

  // Realtime: round switch (is_current changed) — only relevant for normal rounds
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`main_screen_current_round_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'session_questions',
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
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

  return (
    <div className={styles.mainScreen}>
      {/* 🆕 pass names to TeamScore */}
      <TeamScore
        team1Name={team1Name}
        team2Name={team2Name}
        team1={teamScores.team1}
        team2={teamScores.team2}
      />

      <TeamControlIndicator activeTeam={activeTeam ?? 1} />

{isFastMoney ? (
  <>
    <div className={styles.fmTimer}>
      <CountdownTimer seconds={20} />
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
