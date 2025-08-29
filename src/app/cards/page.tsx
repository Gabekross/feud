'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import styles from './Cards.module.scss';

type SQ = {
  id: string;
  session_id: string;
  round_number: number;
  question_id: string;
  fm_index: number | null;
  is_current: boolean;
};

type Answer = {
  id: string;
  answer_text: string;
  points: number;
  order: number;
};

type Question = {
  id: string;
  question_text: string;
  type: string;
};

type CardData = {
  roundNumber: number;
  fmIndex?: number | null;
  question: Question;
  answers: Answer[];
};

const ROUND_LABEL: Record<number, string> = {
  1: 'Round 1',
  2: 'Round 2',
  3: 'Round 3',
  4: 'Round 4',
  5: 'Sudden Death',
  6: 'Fast Money',
};

export default function CardsPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cards, setCards] = useState<CardData[]>([]);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [cardSize, setCardSize] = useState<'fit' | '3x5' | '4x6'>('fit');

  // load active session id
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('game_sessions')
        .select('id')
        .eq('status', 'active')
        .single();
      if (data?.id) setSessionId(data.id);
    })();
  }, []);

  // load session questions + Q/A
  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      const { data: sqRows } = await supabase
        .from('session_questions')
        .select('id, session_id, round_number, question_id, fm_index, is_current')
        .eq('session_id', sessionId)
        .order('round_number', { ascending: true })
        .order('fm_index', { ascending: true });

      if (!sqRows?.length) {
        setCards([]);
        return;
      }

      const qids = [...new Set(sqRows.map(r => r.question_id))];
      const { data: qRows } = await supabase
        .from('questions')
        .select('id, question_text, type')
        .in('id', qids);

      const qMap = new Map<string, Question>();
      (qRows ?? []).forEach(q => qMap.set(q.id, q));

      const { data: aRows } = await supabase
        .from('answers')
        .select('id, answer_text, points, "order", question_id')
        .in('question_id', qids)
        .order('order', { ascending: true });

      const aMap = new Map<string, Answer[]>();
      (aRows ?? []).forEach(a => {
        const list = aMap.get(a.question_id) ?? [];
        list.push({ id: a.id, answer_text: a.answer_text, points: a.points, order: a.order });
        aMap.set(a.question_id, list);
      });

      const assembled: CardData[] = sqRows
        .map((row: SQ) => {
          const q = qMap.get(row.question_id);
          if (!q) return null;
          return {
            roundNumber: row.round_number,
            fmIndex: row.round_number === 6 ? row.fm_index ?? null : null,
            question: q,
            answers: aMap.get(row.question_id) ?? [],
          } as CardData;
        })
        .filter(Boolean) as CardData[];

      setCards(assembled);
    })();
  }, [sessionId]);

  const grouped = useMemo(() => {
    const g = new Map<number, CardData[]>();
    for (const c of cards) {
      const arr = g.get(c.roundNumber) ?? [];
      arr.push(c);
      g.set(c.roundNumber, arr);
    }
    return g;
  }, [cards]);

  const cardKey = (c: CardData) =>
    c.roundNumber === 6 ? `${c.question.id}-fm${c.fmIndex}` : c.question.id;

  const toggleFlip = (c: CardData) => {
    const key = cardKey(c);
    setFlipped(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePrint = () => window.print();

  return (
    <div className={`${styles.page} ${styles[`size_${cardSize}`]}`}>
      <div className={styles.header}>
        <h1>📇 Question Cards</h1>
        <p>Click a card to flip between the question (front) and answers (back).</p>

        <div className={styles.toolbar} aria-label="Print options">
          <label>
            Card size:{' '}
            <select
              value={cardSize}
              onChange={(e) => setCardSize(e.target.value as any)}
            >
              <option value="fit">Fit to page</option>
              <option value="3x5">3×5 in</option>
              <option value="4x6">4×6 in</option>
            </select>
          </label>
          <button className={styles.printBtn} onClick={handlePrint}>🖨 Print</button>
        </div>
      </div>

      {[1,2,3,4,5,6].map(rn => {
        const list = grouped.get(rn) ?? [];
        if (!list.length) return null;
        return (
          <section key={`round-${rn}`} className={styles.roundSection}>
            <h2 className={styles.roundTitle}>
              {ROUND_LABEL[rn]} {rn === 6 ? '(All 5 Fast Money questions)' : ''}
            </h2>

            <div className={styles.grid}>
              {list.map(c => (
                <div
                  key={cardKey(c)}
                  className={`${styles.card} ${flipped[cardKey(c)] ? styles.isFlipped : ''}`}
                  onClick={() => toggleFlip(c)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleFlip(c)}
                >
                  <div className={styles.cardInner}>
                    {/* FRONT */}
                    <div className={`${styles.cardFace} ${styles.cardFront}`}>
                      <div className={styles.cardBadge}>
                        {rn === 6 && typeof c.fmIndex === 'number' ? `Fast Money Q${c.fmIndex}` : ROUND_LABEL[rn]}
                      </div>
                      <div className={styles.questionText}>{c.question.question_text}</div>
                      <div className={styles.hint}>Click to see answers</div>
                    </div>
                    {/* BACK */}
                    <div className={`${styles.cardFace} ${styles.cardBack}`}>
                      <div className={styles.cardBadgeSecondary}>Answers</div>
                      <ol className={styles.answerList}>
                        {c.answers.map(a => (
                          <li key={a.id} className={styles.answerRow}>
                            <span className={styles.answerText}>{a.answer_text}</span>
                            <span className={styles.answerPts}>{a.points}</span>
                          </li>
                        ))}
                      </ol>
                      <div className={styles.hint}>Click to flip back</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
