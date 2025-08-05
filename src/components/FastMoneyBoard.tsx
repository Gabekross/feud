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
  const [qText, setQText] = useState<string>(''); // current question text
  const [showQuestion, setShowQuestion] = useState(false);

  // ✅ right
type FMRow = Resp | null;

const [p1Rows, setP1Rows] = useState<FMRow[]>(Array(6).fill(null)); // indices 0..5 (ignore 0)
const [p2Rows, setP2Rows] = useState<FMRow[]>(Array(6).fill(null));




  // Load current FM info + all 5 responses
  const loadAll = async () => {
    if (!sessionId) return;

    // current FM row for header/question text
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

    // all responses for both players
    const { data: all } = await supabase
      .from('fast_money_responses')
      .select('*')
      .eq('session_id', sessionId);

    // build 1..5 arrays
    const p1: FMRow[] = [null, null, null, null, null, null];
    const p2: FMRow[] = [null, null, null, null, null, null];
    (all ?? []).forEach((r) => {
      const qi = (r as Resp).question_index;
      const pn = (r as Resp).player_number;
      if (qi >= 1 && qi <= 5) {
        if (pn === 1) p1[qi] = r as Resp;
        else if (pn === 2) p2[qi] = r as Resp;
      }
    });
    setP1Rows(p1);
    setP2Rows(p2);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Realtime subscriptions
useEffect(() => {
  if (!sessionId) return;

  const ch = supabase
    .channel(`fm_board_${sessionId}`)

    // When current FM row flips or reveal_question toggles
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'session_questions',
        filter: `session_id=eq.${sessionId}`,
      },
      async (payload) => {
        if (payload.new.round_number === 6 && payload.new.is_current) {
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
      {
        event: '*', // INSERT/UPDATE/DELETE
        schema: 'public',
        table: 'fast_money_responses',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        if (payload.eventType === 'DELETE') return; // ignore deletes

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
        <div className={styles.question}>
          {showQuestion ? qText : '••••••••••••••••••'}
        </div>
        <div className={styles.qIndex}>Q{fmIndex}/5</div>
      </div>

      <div className={styles.grid}>
        <div className={styles.col}>
          <div className={styles.colTitle}>Player 1</div>
          {[1,2,3,4,5].map((i) => (
            <div
              key={`p1-${i}`}
              className={`${styles.answerRow} ${fmIndex === i ? styles.activeRow : ''}`}
            >
              <div className={styles.slot}>#{i}</div>
              <div className={styles.answerText}>
                {p1Rows[i]?.reveal_answer ? (p1Rows[i]?.answer_text ?? '') : ''}
              </div>
              <div className={styles.points}>
                {p1Rows[i]?.reveal_points ? (p1Rows[i]?.points_awarded ?? 0) : ''}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.col}>
          <div className={styles.colTitle}>Player 2</div>
          {[1,2,3,4,5].map((i) => (
            <div
              key={`p2-${i}`}
              className={`${styles.answerRow} ${fmIndex === i ? styles.activeRow : ''}`}
            >
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
