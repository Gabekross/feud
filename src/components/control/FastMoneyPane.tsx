// src/components/control/FastMoneyPane.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

type FMAnswer = { id: string; answer_text: string; points: number; order: number };
type FMQuestion = { id: string; question_text: string; answers: FMAnswer[] };

export default function FastMoneyPane() {
  const sessionId = useActiveSession();

  // ===== FM navigation / player =====
  const [player, setPlayer] = useState<1 | 2>(1);
  const [fmIndex, setFmIndex] = useState<number>(1); // 1..5

  // ===== Current question & reveal flag =====
  const [question, setQuestion] = useState<FMQuestion | null>(null);
  const [revealQuestion, setRevealQuestion] = useState<boolean>(false);

  // ===== Current player's response for current fmIndex =====
  const [resp, setResp] = useState<FMResp | null>(null);
  const [typing, setTyping] = useState<string>(''); // local text input

  // ===== Timer controls (synced with game_sessions) =====
  const [running, setRunning] = useState<boolean>(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(20); // seconds
  const [defaultSeconds, setDefaultSeconds] = useState<number>(20);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 🔊 sounds
  const revealSound = typeof Audio !== 'undefined' ? new Audio('/sounds/correct.mp3') : null;
  const zeroSound   = typeof Audio !== 'undefined' ? new Audio('/sounds/buzzer.mp3')  : null;

  // === Helpers ===
  const nowIso = () => new Date().toISOString();

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

    if (sq?.question_id) {
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
        answers: (a ?? []) as FMAnswer[],
      });
    } else {
      setQuestion(null);
    }

    // Ensure and load current response row (for selected player)
    await ensureResponse(sessionId, idx, player);
    await loadResponse(sessionId, idx, player);

    // Load timer snapshot from session
    const { data: sess } = await supabase
      .from('game_sessions')
      .select('fm_timer_running, fm_timer_started_at, fm_timer_duration, fast_money_seconds')
      .eq('id', sessionId)
      .single();

    setRunning(!!sess?.fm_timer_running);
    setStartedAt(sess?.fm_timer_started_at ?? null);
    setDuration(sess?.fm_timer_duration ?? (sess?.fast_money_seconds ?? 20));
    setDefaultSeconds(sess?.fast_money_seconds ?? 20);
  };

  // ====== NEW: Hide Player 1 on Main Screen (auto + manual) ======
  const setHideP1 = async (hide: boolean) => {
    if (!sessionId) return;
    await supabase.from('game_sessions').update({ fm_hide_p1: hide }).eq('id', sessionId);
  };

  // switch player & auto-hide P1 when on Player 2
  const switchPlayer = async (p: 1 | 2) => {
    setPlayer(p);
    await setHideP1(p === 2);
  };

  const toggleHideP1 = async () => {
    if (!sessionId) return;
    const { data } = await supabase
      .from('game_sessions')
      .select('fm_hide_p1')
      .eq('id', sessionId)
      .single();
    await setHideP1(!data?.fm_hide_p1);
  };

  // ===== effects =====
  useEffect(() => {
    loadCurrentFM();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // When player or fmIndex changes, ensure & load response for that slot
  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      await ensureResponse(sessionId, fmIndex, player);
      await loadResponse(sessionId, fmIndex, player);
    })();
  }, [sessionId, fmIndex, player]);

  // Realtime: session_questions (FM row changes) + responses + timer fields
  useEffect(() => {
    if (!sessionId) return;

    const ch = supabase
      .channel(`fm_pane_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'session_questions', filter: `session_id=eq.${sessionId}` },
        (payload: any) => {
          if (payload.new?.round_number === 6 && payload.new?.is_current) {
            setFmIndex(payload.new.fm_index ?? 1);
            setRevealQuestion(!!payload.new.fm_reveal_question);
            loadCurrentFM(); // refresh Q/A + resp
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fast_money_responses', filter: `session_id=eq.${sessionId}` },
        (payload: any) => {
          if (payload.eventType === 'DELETE') return;
          const row = payload.new as FMResp;
          if (row.player_number === player && row.question_index === fmIndex) {
            setResp(row);
            setTyping(row.answer_text ?? '');
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` },
        (payload: any) => {
          setRunning(!!payload.new.fm_timer_running);
          setStartedAt(payload.new.fm_timer_started_at ?? null);
          setDuration(payload.new.fm_timer_duration ?? (payload.new.fast_money_seconds ?? 20));
          setDefaultSeconds(payload.new.fast_money_seconds ?? 20);
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(ch); };
  }, [sessionId, fmIndex, player]);

  // ===== Timer actions =====
  const onDurationChange = (seconds: number) => {
    setDuration(seconds);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!sessionId) return;
      await supabase
        .from('game_sessions')
        .update({ fm_timer_duration: seconds, fast_money_seconds: seconds })
        .eq('id', sessionId);
    }, 400);
  };

  const startTimer = async () => {
    if (!sessionId) return;
    const starts = nowIso();
    await supabase
      .from('game_sessions')
      .update({
        fm_timer_running: true,
        fm_timer_started_at: starts,
      })
      .eq('id', sessionId);
  };

  const pauseTimer = async () => {
    if (!sessionId) return;

    let remaining = duration;
    if (running && startedAt) {
      const start = new Date(startedAt).getTime();
      const elapsed = Math.floor((Date.now() - start) / 1000);
      remaining = Math.max(0, duration - elapsed);
    }

    await supabase
      .from('game_sessions')
      .update({
        fm_timer_running: false,
        fm_timer_started_at: null,
        fm_timer_duration: remaining,
      })
      .eq('id', sessionId);
  };

  const resetTimer = async () => {
    if (!sessionId) return;
    await supabase
      .from('game_sessions')
      .update({
        fm_timer_running: false,
        fm_timer_started_at: null,
        fm_timer_duration: defaultSeconds,
      })
      .eq('id', sessionId);
  };

  // ===== Navigate FM (Prev / Next) =====
  const goToFM = async (nextIdx: number) => {
    if (!sessionId) return;
    const idx = Math.min(5, Math.max(1, nextIdx));
    await supabase
      .from('session_questions')
      .update({ is_current: false })
      .eq('session_id', sessionId)
      .eq('round_number', 6)
      .eq('is_current', true);

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

  // ===== Typing + (optional) auto-match hint =====
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

  const bestMatch = useMemo(() => {
    if (!question || !typing.trim()) return null;
    const t = typing.trim().toLowerCase();
    const exact = question.answers.find(a => a.answer_text.toLowerCase() === t);
    if (exact) return exact;
    const contains = question.answers.find(a => t.includes(a.answer_text.toLowerCase()));
    return contains ?? null;
  }, [question, typing]);

  // ===== Reveal flows =====
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

  const revealPoints = async () => {
    if (!sessionId || !resp) return;
    const pts = bestMatch ? bestMatch.points : 0;
    revealSound?.play();
    await supabase
      .from('fast_money_responses')
      .update({ reveal_points: true, points_awarded: pts })
      .eq('session_id', sessionId)
      .eq('question_index', fmIndex)
      .eq('player_number', player);
  };

  const revealZero = async () => {
    if (!sessionId || !resp) return;
    zeroSound?.play();
    await supabase
      .from('fast_money_responses')
      .update({ matched_answer_id: null, reveal_answer: true, reveal_points: true, points_awarded: 0 })
      .eq('session_id', sessionId)
      .eq('question_index', fmIndex)
      .eq('player_number', player);
  };

  return (
    <div className={styles.fastMoneyPane}>
      <h2>⚡ Fast Money (Player {player})</h2>

      {/* TIMER PANEL */}
      <div className={styles.timerPanel}>
        <div className={styles.timerLeft}>
          <label>Duration (sec)</label>
          <input
            type="number"
            min={5}
            max={120}
            value={duration}
            onChange={(e) => onDurationChange(Math.max(5, Math.min(120, Number(e.target.value) || 0)))}
          />
          <span className={styles.defaultInfo}>Default: {defaultSeconds}s</span>
        </div>
        <div className={styles.timerButtons}>
          <button onClick={startTimer} disabled={running}>▶ Start</button>
          <button onClick={pauseTimer} disabled={!running}>⏸ Pause</button>
          <button onClick={resetTimer}>↺ Reset</button>
        </div>
      </div>

      {/* FM NAV + Player toggle + Hide P1 toggle */}
      <div className={styles.toolbar}>
        <div className={styles.fmNav}>
          <button onClick={() => goToFM(fmIndex - 1)} disabled={fmIndex <= 1}>⬅ Prev</button>
          <span>FM Q{fmIndex}/5</span>
          <button onClick={() => goToFM(fmIndex + 1)} disabled={fmIndex >= 5}>Next ➡</button>
        </div>

        <div className={styles.playerToggle}>
          <button className={player === 1 ? styles.active : ''} onClick={() => switchPlayer(1)}>Player 1</button>
          <button className={player === 2 ? styles.active : ''} onClick={() => switchPlayer(2)}>Player 2</button>
        </div>

        <div className={styles.hideGroup}>
          <button className={styles.hideToggle} onClick={toggleHideP1}>
            Toggle Hide P1 on Main
          </button>
        </div>
      </div>

      {/* Question card */}
      <div className={styles.questionCard}>
        <div className={styles.qTop}>
          <strong>Question:</strong>
          <button onClick={revealQuestionNow} disabled={revealQuestion}>Reveal Question</button>
        </div>
        <div className={styles.qText}>
          {revealQuestion ? (question?.question_text ?? '—') : '•••••••••••••••'}
        </div>
      </div>

      {/* Answer entry + actions */}
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

      {/* Answer bank */}
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
