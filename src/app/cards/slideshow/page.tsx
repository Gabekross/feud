'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import useActiveSession from '@/hooks/useActiveSession';
import styles from './Slideshow.module.scss';

type Item = {
  question_id: string;
  round_number: number;      // 1..6 (6 = fast money)
  fm_index: number | null;   // 1..5 for fast money, else null
};

type QA = {
  question_text: string;
  answers: { answer_text: string; points: number; order: number }[];
};

export default function SlideshowPage() {
  const sessionId = useActiveSession();

  // ordered list of questions for the session
  const [items, setItems] = useState<Item[]>([]);
  const [idx, setIdx] = useState(0); // current slide index
  const [qa, setQa] = useState<QA | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);

  // load ordered list of session questions (rounds 1..5 then fast money fm_index 1..5)
  useEffect(() => {
    const loadList = async () => {
      if (!sessionId) return;

      const { data, error } = await supabase
        .from('session_questions')
        .select('question_id, round_number, fm_index')
        .eq('session_id', sessionId)
        .order('round_number', { ascending: true })
        .order('fm_index', { ascending: true, nullsFirst: true });

      if (error) {
        console.error('loadList', error.message);
        return;
      }

      setItems((data ?? []) as Item[]);
      setIdx(0);
    };

    loadList();
  }, [sessionId]);

  // load the QA for the current slide
  const loadQa = useCallback(async (it: Item | undefined) => {
    if (!it) { setQa(null); return; }

    const { data: q, error: eq } = await supabase
      .from('questions')
      .select('question_text')
      .eq('id', it.question_id)
      .single();

    if (eq) {
      console.error('loadQa question', eq.message);
      setQa(null);
      return;
    }

    const { data: a, error: ea } = await supabase
      .from('answers')
      .select('answer_text, points, "order"')
      .eq('question_id', it.question_id)
      .order('order', { ascending: true });

    if (ea) {
      console.error('loadQa answers', ea.message);
    }

    setQa({
      question_text: q?.question_text ?? '',
      answers: (a ?? []) as any[],
    });
  }, []);

  useEffect(() => {
    setShowAnswers(false); // default to question side on slide change
    loadQa(items[idx]);
  }, [idx, items, loadQa]);

  // navigation
  const next = () => setIdx((i) => Math.min(i + 1, Math.max(0, items.length - 1)));
  const prev = () => setIdx((i) => Math.max(0, i - 1));

  // keyboard arrows
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key.toLowerCase() === 'f') setShowAnswers((v) => !v); // quick flip
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items.length]);

  const tag =
    items[idx]?.round_number === 6
      ? `FAST MONEY Q${items[idx]?.fm_index ?? ''}`
      : `ROUND ${items[idx]?.round_number}`;

  return (
    <div className={styles.slideRoot}>
      {/* Nav buttons */}
      <button className={`${styles.navBtn} ${styles.prev}`} onClick={prev} disabled={idx === 0} aria-label="Previous">‹</button>
      <button
        className={`${styles.navBtn} ${styles.next}`}
        onClick={next}
        disabled={idx >= items.length - 1}
        aria-label="Next"
      >›</button>

      {/* Progress / controls bar */}
      <div className={styles.topBar}>
        <div className={styles.badge}>{tag}</div>
        <div className={styles.progress}>{idx + 1} / {items.length || 0}</div>
        <div className={styles.actions}>
          <button className={styles.flipBtn} onClick={() => setShowAnswers((v) => !v)}>
            {showAnswers ? 'Show Question' : 'Show Answers'}
          </button>
        </div>
      </div>

      {/* Fullscreen card */}
      <div className={styles.card}>
        {!showAnswers ? (
          <div className={styles.questionSide}>
            <div className={styles.qText}>{qa?.question_text ?? '—'}</div>
          </div>
        ) : (
          <div className={styles.answerSide}>
            <ul className={styles.answerList}>
              {(qa?.answers ?? []).map((a, i) => (
                <li key={i} className={styles.answerItem}>
                  <span className={styles.answerText}>{a.answer_text}</span>
                  <span className={styles.points}>{a.points}</span>
                </li>
              ))}
              {(qa?.answers?.length ?? 0) === 0 && <li className={styles.answerItem}>—</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
