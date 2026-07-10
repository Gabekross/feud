'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import useActiveSession from '@/hooks/useActiveSession';
import styles from './Slideshow.module.scss';

type Item = {
  question_id: string;
  round_number: number;
  fm_index: number | null;
};

type QA = {
  question_text: string;
  answers: { answer_text: string; points: number; order: number }[];
};

export default function SlideshowPage() {
  const sessionId = useActiveSession();
  const [items, setItems] = useState<Item[]>([]);
  const [idx, setIdx] = useState(0);
  const [qa, setQa] = useState<QA | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    const loadList = async () => {
      if (!sessionId) {
        setItems([]);
        setIdx(0);
        return;
      }

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

  const loadQa = useCallback(async (it: Item | undefined) => {
    if (!it) {
      setQa(null);
      return;
    }

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
      answers: (a ?? []) as QA['answers'],
    });
  }, []);

  useEffect(() => {
    setShowAnswers(false);
    loadQa(items[idx]);
  }, [idx, items, loadQa]);

  const next = useCallback(() => {
    setIdx((i) => Math.min(i + 1, Math.max(0, items.length - 1)));
  }, [items.length]);

  const prev = useCallback(() => {
    setIdx((i) => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key.toLowerCase() === 'f' && qa) setShowAnswers((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, qa]);

  const currentItem = items[idx];
  const hasItems = items.length > 0;
  const tag =
    currentItem?.round_number === 6
      ? `FAST MONEY Q${currentItem.fm_index ?? ''}`
      : currentItem
        ? `ROUND ${currentItem.round_number}`
        : sessionId
          ? 'NO QUESTIONS'
          : 'NO SESSION';

  return (
    <div className={styles.slideRoot}>
      <button className={`${styles.navBtn} ${styles.prev}`} onClick={prev} disabled={!hasItems || idx === 0} aria-label="Previous">
        ‹
      </button>
      <button
        className={`${styles.navBtn} ${styles.next}`}
        onClick={next}
        disabled={!hasItems || idx >= items.length - 1}
        aria-label="Next"
      >
        ›
      </button>

      <div className={styles.topBar}>
        <div className={styles.badge}>{tag}</div>
        <div className={styles.progress}>{hasItems ? idx + 1 : 0} / {items.length}</div>
        <div className={styles.actions}>
          <button className={styles.flipBtn} onClick={() => setShowAnswers((v) => !v)} disabled={!qa}>
            {showAnswers ? 'Show Question' : 'Show Answers'}
          </button>
        </div>
      </div>

      <div className={styles.card}>
        {!showAnswers ? (
          <div className={styles.questionSide}>
            <div className={styles.qText}>
              {qa?.question_text ?? (sessionId ? 'No questions in this session yet.' : 'Open an active game session to review questions.')}
            </div>
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
              {(qa?.answers?.length ?? 0) === 0 && <li className={styles.answerItem}>No answers found.</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
