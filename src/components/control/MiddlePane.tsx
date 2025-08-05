'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import useActiveSession from '@/hooks/useActiveSession';
import styles from './MiddlePane.module.scss';

type AnswerRow = {
  id: string;
  answer_text: string;
  points: number;
  revealed: boolean;
  order: number;
  question_id: string;
};

export default function MiddlePane() {
  const sessionId = useActiveSession();
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const strikeAudio = typeof Audio !== 'undefined' ? new Audio('/sounds/buzzer.mp3') : null;
  const revealDingRef = useRef<HTMLAudioElement | null>(null);

  const loadCurrentQA = async () => {
    if (!sessionId) return;

    // Current question id
    const { data: sessionQ } = await supabase
      .from('session_questions')
      .select('question_id')
      .eq('session_id', sessionId)
      .eq('is_current', true)
      .single();

    const qid = sessionQ?.question_id as string | undefined;
    if (!qid) return;

    // Question text
    const { data: q } = await supabase
      .from('questions')
      .select('question_text')
      .eq('id', qid)
      .single();
    setQuestion(q?.question_text ?? '');

    // All answers (operator sees all)
    const { data: a } = await supabase
      .from('answers')
      .select('id, answer_text, points, revealed, "order", question_id')
      .eq('question_id', qid)
      .order('order', { ascending: true });

    setAnswers((a ?? []) as AnswerRow[]);
  };

  // Initial load
  useEffect(() => {
    loadCurrentQA();
  }, [sessionId]);

  useEffect(() => {
  if (!revealDingRef.current && typeof Audio !== 'undefined') {
    revealDingRef.current = new Audio('/sounds/correct.mp3'); // put file in /public/sounds/
  }
  }, []);

  // 🔁 React to round switches (is_current flips)
  useEffect(() => {
    if (!sessionId) return;

    const ch = supabase
      .channel(`middle_pane_current_round_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'session_questions',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new?.is_current) {
            loadCurrentQA();
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [sessionId]);

  // 🔁 Live answer updates (revealed/text/points)
  useEffect(() => {
    if (!sessionId) return;

    const ch = supabase
      .channel(`middle_pane_answers_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'answers' },
        (payload) => {
          const updated = payload.new as AnswerRow;
          setAnswers((prev) =>
            prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [sessionId]);

  // Toggle reveal for one answer
const toggleReveal = async (id: string, next: boolean) => {
  // play sound only on reveal
  if (next) {
    const audio = new Audio('/sounds/correct.mp3');
    audio.currentTime = 0;
    try {
      await audio.play();
    } catch (err) {
      console.warn('Audio play failed', err);
    }
  }

  // optimistic UI
  setAnswers(prev => prev.map(a => (a.id === id ? { ...a, revealed: next } : a)));

  // persist to DB
  await supabase.from('answers').update({ revealed: next }).eq('id', id);
};



  // Reveal/Hide all for this question
  const setAllRevealed = async (next: boolean) => {
    if (answers.length === 0) return;
    const qid = answers[0].question_id;

    await supabase.from('answers').update({ revealed: next }).eq('question_id', qid);
    setAnswers((prev) => prev.map((a) => ({ ...a, revealed: next })));
  };

  // ❌ Wrong answer -> strike
  const handleWrongAnswer = async () => {
    if (!sessionId) return;
    strikeAudio?.play();

    const { data } = await supabase
      .from('game_sessions')
      .select('strikes, strike_limit')
      .eq('id', sessionId)
      .single();

    const current = data?.strikes ?? 0;
    const limit = data?.strike_limit ?? 3;
    if (current < limit) {
      await supabase.from('game_sessions').update({ strikes: current + 1 }).eq('id', sessionId);
    }
  };

  const handleTransferControl = async () => {
    if (!sessionId) return;

    const { data } = await supabase
      .from('game_sessions')
      .select('active_team')
      .eq('id', sessionId)
      .single();

    const next = data?.active_team === 1 ? 2 : 1;
    await supabase.from('game_sessions').update({ active_team: next }).eq('id', sessionId);
  };

    const handleIncorret = async () => {
    strikeAudio?.play();
  };

  return (
    <div className={styles.middlePane}>
      <h2>❓ Question Control</h2>
      <p className={styles.question}>{question}</p>

      {/* Operator always sees answers */}
      <div className={styles.answerList}>
        {answers.map((a, i) => (
          <div key={a.id} className={`${styles.answerRow} ${a.revealed ? styles.on : styles.off}`}>
            <span className={styles.slot}>#{i + 1}</span>
            <span className={styles.text}>{a.answer_text}</span>
            <span className={styles.points}>{a.points} pts</span>
            <button
              className={a.revealed ? styles.hideBtn : styles.revealBtn}
              onClick={() => toggleReveal(a.id, !a.revealed)}
            >
              {a.revealed ? 'Hide' : 'Reveal'}
            </button>
          </div>
        ))}
      </div>

      <div className={styles.bulkActions}>
        <button onClick={() => setAllRevealed(true)}>Reveal All</button>
        <button onClick={() => setAllRevealed(false)}>Hide All</button>
      </div>

      <hr />

       <div className={styles.bottomActions}>
        <button className={styles.strike} onClick={handleWrongAnswer}>
          ❌❌ Wrong Answer (X)
        </button>
                <button className={styles.transfer} onClick={handleIncorret}>
          ❌ Buzzer
        </button>
        <button className={styles.transfer} onClick={handleTransferControl}>
          🔁 Transfer Control
        </button>
      </div>
    </div>
  );
}
