'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import useActiveSession from '@/hooks/useActiveSession';
import styles from './FastMoneyBoard.module.scss';

type Resp = {
  session_id: string;
  question_index: number; // 1..5
  player_number: 1 | 2;
  answer_text: string | null;
  reveal_answer: boolean;
  reveal_points: boolean;
  points_awarded: number;
};

type FMRow = Resp | null;

export default function FastMoneyBoard() {
  const sessionId = useActiveSession();
  const [fmIndex, setFmIndex] = useState<number>(1);
  const [qText, setQText] = useState<string>('');     // current FM question text
  const [showQuestion, setShowQuestion] = useState(false);

  // hide P1 column content (triggered by operator’s toggle on FastMoneyPane)
  const [hideP1, setHideP1] = useState<boolean>(false);

  // keep 1..5 (index 0 unused)
  const [p1Rows, setP1Rows] = useState<FMRow[]>([null, null, null, null, null, null]);
  const [p2Rows, setP2Rows] = useState<FMRow[]>([null, null, null, null, null, null]);

  const loadAll = async () => {
    if (!sessionId) return;

    // which FM row is current?
    const { data: cur } = await supabase
      .from('session_questions')
      .select('question_id, fm_index, fm_reveal_question')
      .eq('session_id', sessionId)
      .eq('round_number', 6)
      .eq('is_current', true)
      .maybeSingle();

    const idx = cur?.fm_index ?? 1;
    setFmIndex(idx);
    setShowQuestion(!!cur?.fm_reveal_question);

    if (cur?.question_id) {
      const { data: q } = await supabase
        .from('questions')
        .select('question_text')
        .eq('id', cur.question_id)
        .single();
      setQText(q?.question_text ?? '');
    } else {
      setQText('');
    }

    // initial hide flag + (optional) other fm fields
    const { data: sess } = await supabase
      .from('game_sessions')
      .select('fm_hide_p1')
      .eq('id', sessionId)
      .single();
    setHideP1(!!sess?.fm_hide_p1);

    // all FM responses for both players in this session
    const { data: all } = await supabase
      .from('fast_money_responses')
      .select('*')
      .eq('session_id', sessionId);

    const p1: FMRow[] = [null, null, null, null, null, null];
    const p2: FMRow[] = [null, null, null, null, null, null];

    (all ?? []).forEach((r) => {
      const row = r as Resp;
      if (row.question_index >= 1 && row.question_index <= 5) {
        if (row.player_number === 1) p1[row.question_index] = row;
        if (row.player_number === 2) p2[row.question_index] = row;
      }
    });

    setP1Rows(p1);
    setP2Rows(p2);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // realtime: fm row switches + response updates + hideP1 flag
  useEffect(() => {
    if (!sessionId) return;

    const ch = supabase
      .channel(`fm_board_${sessionId}`)
      // When current FM row flips or reveal_question toggles
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'session_questions', filter: `session_id=eq.${sessionId}` },
        async (payload: any) => {
          if (payload.new?.round_number === 6 && payload.new?.is_current) {
            const idx = payload.new.fm_index ?? 1;
            setFmIndex(idx);
            setShowQuestion(!!payload.new.fm_reveal_question);

            if (payload.new.question_id) {
              const { data: q } = await supabase
                .from('questions')
                .select('question_text')
                .eq('id', payload.new.question_id)
                .single();
              setQText(q?.question_text ?? '');
            } else {
              setQText('');
            }
          }
        }
      )
      // Any INSERT/UPDATE for FM responses in this session
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fast_money_responses', filter: `session_id=eq.${sessionId}` },
        (payload: any) => {
          if (payload.eventType === 'DELETE') return;
          const row = payload.new as Resp | undefined;
          if (!row || row.question_index < 1 || row.question_index > 5) return;

          if (row.player_number === 1) {
            setP1Rows((prev) => {
              const next = [...prev];
              next[row.question_index] = row;
              return next;
            });
          } else if (row.player_number === 2) {
            setP2Rows((prev) => {
              const next = [...prev];
              next[row.question_index] = row;
              return next;
            });
          }
        }
      )
      // Hide P1 toggle
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` },
        (payload: any) => {
          if ('fm_hide_p1' in payload.new) setHideP1(!!payload.new.fm_hide_p1);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [sessionId]);

  const total = useMemo(() => {
    const sum = (arr: FMRow[]) =>
      arr.reduce((acc, r) => acc + (r && r.reveal_points ? (r.points_awarded ?? 0) : 0), 0);
    return sum(p1Rows) + sum(p2Rows);
  }, [p1Rows, p2Rows]);

  return (
    <div className={styles.fmBoard}>
      <div className={styles.header}>
        <div className={styles.badge}>FAST MONEY</div>
        <div className={styles.question}>{showQuestion ? qText : '••••••••••••••••••'}</div>
        <div className={styles.qIndex}>Q{fmIndex}/5</div>
      </div>

      <div className={styles.grid}>
        <div className={styles.col}>
          <div className={styles.colTitle}>Player 1</div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={`p1-${i}`} className={`${styles.answerRow} ${fmIndex === i ? styles.activeRow : ''}`}>
              <div className={styles.slot}>#{i}</div>
              <div className={styles.answerText}>
                {/* Hide Player 1 content if fm_hide_p1 is true */}
                {hideP1 ? '' : (p1Rows[i]?.reveal_answer ? (p1Rows[i]?.answer_text ?? '') : '')}
              </div>
              <div className={styles.points}>
                {hideP1 ? '' : (p1Rows[i]?.reveal_points ? (p1Rows[i]?.points_awarded ?? 0) : '')}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.col}>
          <div className={styles.colTitle}>Player 2</div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={`p2-${i}`} className={`${styles.answerRow} ${fmIndex === i ? styles.activeRow : ''}`}>
              <div className={styles.slot}>#{i}</div>
              <div className={styles.answerText}>
                {p2Rows[i]?.reveal_answer ? (p2Rows[i]?.answer_text ?? '') : ''}
              </div>
              <div className={styles.points}>
                {p2Rows[i]?.reveal_points ? (p2Rows[i]?.points_awarded ?? 0) : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.total}>
        Total: <strong>{total}</strong>
      </div>
    </div>
  );
}
