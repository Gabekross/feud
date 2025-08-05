// src/components/control/FastMoneyPane.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import useActiveSession from '@/hooks/useActiveSession';
import styles from './FastMoneyPane.module.scss';

type FMResp = {
  id?: string;
  session_id: string;
  question_index: number;    // 1..5
  player_number: 1 | 2;
  answer_text: string | null;
  matched_answer_id: string | null;
  points_awarded: number;
  reveal_answer: boolean;
  reveal_points: boolean;
};

type FMQuestion = {
  id: string;
  question_text: string;
  answers: { id: string; answer_text: string; points: number; order: number }[];
};

export default function FastMoneyPane() {
  const sessionId = useActiveSession();
  const [player, setPlayer] = useState<1 | 2>(1);
  const [fmIndex, setFmIndex] = useState<number>(1); // 1..5
  const [question, setQuestion] = useState<FMQuestion | null>(null);
  const [revealQuestion, setRevealQuestion] = useState<boolean>(false);
  const [resp, setResp] = useState<FMResp | null>(null);
  const [typing, setTyping] = useState<string>(''); // local input mirror
  const strikeAudio = typeof Audio !== 'undefined' ? new Audio('/sounds/correct.mp3') : null;
   const strikeAudio2 = typeof Audio !== 'undefined' ? new Audio('/sounds/buzzer.mp3') : null;

  // Load current FM index from is_current row & fetch question+answers
  const loadCurrentFM = async () => {
    if (!sessionId) return;

    // Which FM row is current?
    const { data: sq } = await supabase
      .from('session_questions')
      .select('question_id, fm_index, fm_reveal_question')
      .eq('session_id', sessionId)
      .eq('round_number', 6)
      .eq('is_current', true)
      .maybeSingle();

    const idx = sq?.fm_index ?? 1;
    setFmIndex(idx);
    setRevealQuestion(!!sq?.fm_reveal_question);

    if (!sq?.question_id) {
      setQuestion(null);
      return;
    }

    const { data: q } = await supabase
      .from('questions')
      .select('id, question_text')
      .eq('id', sq.question_id)
      .single();

    const { data: a } = await supabase
      .from('answers')
      .select('id, answer_text, points, "order"')
      .eq('question_id', sq.question_id)
      .order('order', { ascending: true });

    setQuestion({
      id: q?.id as string,
      question_text: q?.question_text ?? '',
      answers: (a ?? []) as any,
    });

    // Ensure a response row exists for current (session, idx, player)
    await ensureResponse(sessionId, idx, player);
    await loadResponse(sessionId, idx, player);
  };

  const ensureResponse = async (sid: string, idx: number, p: 1 | 2) => {
    const { data: existing } = await supabase
      .from('fast_money_responses')
      .select('id')
      .eq('session_id', sid)
      .eq('question_index', idx)
      .eq('player_number', p)
      .maybeSingle();

    if (!existing) {
      await supabase.from('fast_money_responses').insert({
        session_id: sid,
        question_index: idx,
        player_number: p,
        answer_text: '',
        matched_answer_id: null,
        points_awarded: 0,
        reveal_answer: false,
        reveal_points: false,
      });
    }
  };

  const loadResponse = async (sid: string, idx: number, p: 1 | 2) => {
    const { data } = await supabase
      .from('fast_money_responses')
      .select('*')
      .eq('session_id', sid)
      .eq('question_index', idx)
      .eq('player_number', p)
      .single();

    setResp(data as FMResp);
    setTyping((data?.answer_text as string) ?? '');
  };

  useEffect(() => {
    loadCurrentFM();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // React to changes: player or fmIndex (via buttons) => loadResp, leave is_current row intact
  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      await ensureResponse(sessionId, fmIndex, player);
      await loadResponse(sessionId, fmIndex, player);
    })();
  }, [sessionId, fmIndex, player]);

  // Realtime: if someone flips is_current fm row or updates reveal flags/response
  useEffect(() => {
    if (!sessionId) return;

    const ch = supabase
      .channel(`fm_pane_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'session_questions', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (payload.new.round_number === 6 && payload.new.is_current) {
            setFmIndex(payload.new.fm_index ?? 1);
            setRevealQuestion(!!payload.new.fm_reveal_question);
            loadCurrentFM();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fast_money_responses', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') return;
          const row = payload.new as FMResp;
          if (row.question_index === fmIndex && row.player_number === player) {
            setResp(row);
            setTyping(row.answer_text ?? '');
          }
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, fmIndex, player]);

  // ===== UI actions =====

  // Switch active FM (Prev/Next): we flip is_current to the desired fm_index row
  const goToFM = async (nextIdx: number) => {
    if (!sessionId) return;
    const idx = Math.min(5, Math.max(1, nextIdx));
    // unset current
    await supabase
      .from('session_questions')
      .update({ is_current: false })
      .eq('session_id', sessionId)
      .eq('round_number', 6)
      .eq('is_current', true);
    // set target
    const { data: row } = await supabase
      .from('session_questions')
      .select('id')
      .eq('session_id', sessionId)
      .eq('round_number', 6)
      .eq('fm_index', idx)
      .maybeSingle();
    if (row?.id) {
      await supabase.from('session_questions').update({ is_current: true }).eq('id', row.id);
    }
  };

  const revealQuestionNow = async () => {
    if (!sessionId) return;
    await supabase
      .from('session_questions')
      .update({ fm_reveal_question: true })
      .eq('session_id', sessionId)
      .eq('round_number', 6)
      .eq('is_current', true);
    setRevealQuestion(true);
  };

  // Type entry (immediate live update so Main Screen shows it)
  const handleTyping = async (val: string) => {
    setTyping(val);
    if (!sessionId || !resp) return;
    await supabase
      .from('fast_money_responses')
      .update({ answer_text: val })
      .eq('session_id', sessionId)
      .eq('question_index', fmIndex)
      .eq('player_number', player);
  };

  // Helper: try to match typed answer to bank (case-insensitive contains)
  const bestMatch = useMemo(() => {
    if (!question || !typing.trim()) return null;
    const t = typing.trim().toLowerCase();
    const exact = question.answers.find(a => a.answer_text.toLowerCase() === t);
    if (exact) return exact;
    const contains = question.answers.find(a => t.includes(a.answer_text.toLowerCase()));
    return contains ?? null;
  }, [question, typing]);

  // Reveal answer (shows the text on main screen)
  const revealAnswer = async () => {
    if (!sessionId || !resp) return;
    await supabase
      .from('fast_money_responses')
      .update({
        reveal_answer: true,
        matched_answer_id: bestMatch ? bestMatch.id : null,
      })
      .eq('session_id', sessionId)
      .eq('question_index', fmIndex)
      .eq('player_number', player);
  };

  // Reveal points (if matched => that points; else 0)
  const revealPoints = async () => {
    if (!sessionId || !resp) return;
    strikeAudio?.play();
    const pts = bestMatch ? bestMatch.points : 0;
    await supabase
      .from('fast_money_responses')
      .update({ reveal_points: true, points_awarded: pts })
      .eq('session_id', sessionId)
      .eq('question_index', fmIndex)
      .eq('player_number', player);
  };


  // Force 0 (no correct answer)
  const revealZero = async () => {
    if (!sessionId || !resp) return;
    strikeAudio2?.play();
    await supabase
      .from('fast_money_responses')
      .update({
        matched_answer_id: null,
        reveal_answer: true,
        reveal_points: true,
        points_awarded: 0
      })
      .eq('session_id', sessionId)
      .eq('question_index', fmIndex)
      .eq('player_number', player);
  };

  // 🆕 RESET FAST MONEY (both players, 5 questions, question hidden, go to FM #1)
  const resetFastMoney = async () => {
    if (!sessionId) return;
    const sure = window.confirm('Reset Fast Money? This clears all answers and points for both players.');
    if (!sure) return;

    // 1) Clear all FM responses for this session
    await supabase
      .from('fast_money_responses')
      .update({
        answer_text: '',
        matched_answer_id: null,
        points_awarded: 0,
        reveal_answer: false,
        reveal_points: false
      })
      .eq('session_id', sessionId);

    // 2) Hide all FM questions, unset current, then set FM #1 current & hidden
    await supabase
      .from('session_questions')
      .update({ is_current: false, fm_reveal_question: false })
      .eq('session_id', sessionId)
      .eq('round_number', 6);

    const { data: firstFm } = await supabase
      .from('session_questions')
      .select('id')
      .eq('session_id', sessionId)
      .eq('round_number', 6)
      .eq('fm_index', 1)
      .maybeSingle();

    if (firstFm?.id) {
      await supabase
        .from('session_questions')
        .update({ is_current: true, fm_reveal_question: false })
        .eq('id', firstFm.id);
    }

    // 3) Local UI reset (optimistic)
    setPlayer(1);
    setFmIndex(1);
    setRevealQuestion(false);
    setTyping('');
    setResp({
      session_id: sessionId,
      question_index: 1,
      player_number: 1,
      answer_text: '',
      matched_answer_id: null,
      points_awarded: 0,
      reveal_answer: false,
      reveal_points: false,
    });

    // Ensure the row exists for fresh state
    await ensureResponse(sessionId, 1, 1);

    // Pull fresh question text for FM #1
    await loadCurrentFM();
  };

  return (
    <div className={styles.fastMoneyPane}>
      <h2>⚡ Fast Money (Player {player})</h2>

      <div className={styles.toolbar}>
        <div className={styles.fmNav}>
          <button onClick={() => goToFM(fmIndex - 1)} disabled={fmIndex <= 1}>⬅ Prev</button>
          <span>FM Q{fmIndex}/5</span>
          <button onClick={() => goToFM(fmIndex + 1)} disabled={fmIndex >= 5}>Next ➡</button>
        </div>

        <div className={styles.playerToggle}>
          <button className={player === 1 ? styles.active : ''} onClick={() => setPlayer(1)}>Player 1</button>
          <button className={player === 2 ? styles.active : ''} onClick={() => setPlayer(2)}>Player 2</button>
        </div>

        {/* 🆕 Reset FM */}
        <div className={styles.resetGroup}>
          <button className={styles.resetBtn} onClick={resetFastMoney}>🔄 Reset Fast Money</button>
        </div>
      </div>

      <div className={styles.questionCard}>
        <div className={styles.qTop}>
          <strong>Question:</strong>
          <button onClick={revealQuestionNow} disabled={revealQuestion}>Reveal Question</button>
        </div>
        <div className={styles.qText}>
          {revealQuestion ? (question?.question_text ?? '—') : '•••••••••••••••'}
        </div>
      </div>

      <div className={styles.answerRow}>
        <input
          className={styles.answerInput}
          placeholder="Type player's answer…"
          value={typing}
          onChange={(e) => handleTyping(e.target.value)}
        />
        <button className={styles.revealBtn} onClick={revealAnswer}>Reveal Answer</button>
        <button className={styles.pointsBtn} onClick={revealPoints}>
          Reveal Points{bestMatch ? ` (+${bestMatch.points})` : ' (0)'}
        </button>
        <button className={styles.zeroBtn} onClick={revealZero}>No Correct (0)</button>
      </div>

      <div className={styles.bank}>
        <div className={styles.bankTitle}>Answer Bank</div>
        <ul>
          {question?.answers.map(a => (
            <li key={a.id}>
              <span className={styles.bankText}>{a.answer_text}</span>
              <span className={styles.bankPts}>{a.points} pts</span>
            </li>
          )) ?? <li>—</li>}
        </ul>
      </div>
    </div>
  );
}
