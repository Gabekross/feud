'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import useActiveSession from '@/hooks/useActiveSession';
import HiddenQuestionPlaceholder from './HiddenQuestionPlaceholder';
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

type Props = {
  timerRemain?: number;
  timerDuration?: number;
  timerColor?: string;
};

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const start = displayValue;
    const change = value - start;
    const duration = 650;
    const startedAt = performance.now();
    let frame = 0;

    if (change === 0) return;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(start + change * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <strong className={className}>{displayValue}</strong>;
}

export default function FastMoneyBoard({ timerRemain = 20, timerDuration = 20, timerColor = '#4caf50' }: Props) {
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

  const sumPoints = (arr: FMRow[]) =>
    arr.reduce((acc, r) => acc + (r && r.reveal_points ? (r.points_awarded ?? 0) : 0), 0);

  const p1Total = useMemo(() => sumPoints(p1Rows), [p1Rows]);
  const p2Total = useMemo(() => sumPoints(p2Rows), [p2Rows]);
  const grandTotal = p1Total + p2Total;
  const timerCircumference = 2 * Math.PI * 45;

  return (
    <div className={styles.fmBoard}>
      {/* Header is just the question now — the redundant FAST MONEY pill
          was removed since the top-of-screen Round Badge already conveys
          which round is active. */}
      <div className={styles.header}>
        <div className={styles.questionStage}>
          <div className={styles.question}>
            {showQuestion ? qText : <HiddenQuestionPlaceholder />}
          </div>
        </div>
        <div
          className={`${styles.timerPod} ${timerRemain <= 5 ? styles.timerDanger : timerRemain <= 10 ? styles.timerWarning : ''}`}
        >
          <div className={styles.timerLabel}>Clock</div>
          <svg viewBox="0 0 100 100" className={styles.timerSvg}>
            <circle className={styles.bg} cx="50" cy="50" r="45" />
            <circle
              className={styles.progress}
              cx="50"
              cy="50"
              r="45"
              style={{
                strokeDasharray: timerCircumference,
                strokeDashoffset: (timerRemain / Math.max(1, timerDuration)) * timerCircumference,
                stroke: timerColor,
              }}
            />
            <text x="50" y="54" textAnchor="middle" className={styles.time}>
              {timerRemain}
            </text>
          </svg>
          <div className={styles.timerCaption}>seconds</div>
        </div>
      </div>

      {/* Layout switches between single-column (P1's solo turn) and two-column
          (P2's turn onward) based on fm_hide_p1.
          During P2's turn we KEEP P1's revealed content visible so the audience
          can track the running total — Player 2 doesn't look at the audience
          screen during their turn (they're staged facing away / wearing
          headphones), so showing P1's column doesn't reveal anything to them. */}
      <div className={`${styles.grid} ${hideP1 ? styles.gridBoth : styles.gridP1Only}`}>
        <div className={styles.col}>
          <div className={styles.colTitle}>Player 1</div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={`p1-${i}`}
              className={`${styles.answerRow} ${fmIndex === i ? styles.activeRow : ''} ${p1Rows[i]?.reveal_answer ? styles.hasAnswer : ''} ${p1Rows[i]?.reveal_points ? styles.hasPoints : ''}`}
            >
              <div className={styles.answerText}>
                <span className={styles.slot}>{i}</span>
                <span className={styles.answerValue}>
                  {p1Rows[i]?.reveal_answer ? (p1Rows[i]?.answer_text ?? '') : ''}
                </span>
              </div>
              <div className={styles.points}>
                {p1Rows[i]?.reveal_points ? (
                  <AnimatedNumber value={p1Rows[i]?.points_awarded ?? 0} />
                ) : ''}
              </div>
            </div>
          ))}
          {/* Per-column subtotal — only during P2 phase to mirror Family Feud */}
          {hideP1 && (
            <div className={styles.subtotal}>
              SUBTOTAL <AnimatedNumber value={p1Total} />
            </div>
          )}
        </div>

        {hideP1 && (
          <div className={styles.col}>
            <div className={styles.colTitle}>Player 2</div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={`p2-${i}`}
                className={`${styles.answerRow} ${fmIndex === i ? styles.activeRow : ''} ${p2Rows[i]?.reveal_answer ? styles.hasAnswer : ''} ${p2Rows[i]?.reveal_points ? styles.hasPoints : ''}`}
              >
                <div className={styles.answerText}>
                  <span className={styles.slot}>{i}</span>
                  <span className={styles.answerValue}>
                    {p2Rows[i]?.reveal_answer ? (p2Rows[i]?.answer_text ?? '') : ''}
                  </span>
                </div>
                <div className={styles.points}>
                  {p2Rows[i]?.reveal_points ? (
                    <AnimatedNumber value={p2Rows[i]?.points_awarded ?? 0} />
                  ) : ''}
                </div>
              </div>
            ))}
            <div className={styles.subtotal}>
              SUBTOTAL <AnimatedNumber value={p2Total} />
            </div>
          </div>
        )}
      </div>

      {/* Context-aware bottom label:
          • P1 phase   → "PLAYER 1: 95"     (running solo total)
          • P2 phase   → "GRAND TOTAL: 285" (combined climax) */}
      <div className={`${styles.total} ${grandTotal >= 200 ? styles.targetMet : ''}`}>
        {hideP1 ? (
          <>GRAND&nbsp;TOTAL: <AnimatedNumber value={grandTotal} /></>
        ) : (
          <>PLAYER&nbsp;1: <AnimatedNumber value={p1Total} /></>
        )}
        <span className={styles.target}>Target 200</span>
      </div>
    </div>
  );
}
