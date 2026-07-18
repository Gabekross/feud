'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import styles from './QuestionAdmin.module.scss';

type QuestionType = 'round1' | 'round2' | 'round3' | 'round4' | 'sudden_death' | 'fast_money';

type QuestionRow = {
  id: string;
  question_text: string;
  type: QuestionType;
};

type AnswerDraft = {
  answer_text: string;
  points: string;
};

type AnswerRow = {
  answer_text: string;
  points: number;
  order: number;
};

type ParsedCsvRow = {
  type: QuestionType;
  question_text: string;
  answer_order: number;
  answer_text: string;
  points: number;
};

type CsvGroup = {
  key: string;
  type: QuestionType;
  question_text: string;
  answers: ParsedCsvRow[];
};

type AnswerCountRow = {
  question_id: string;
};

const QUESTION_TYPES: QuestionType[] = ['round1', 'round2', 'round3', 'round4', 'sudden_death', 'fast_money'];
const CSV_TEMPLATE = `type,question_text,answer_order,answer_text,points
round1,Name something people forget to bring to a wedding.,1,Gift,32
round1,Name something people forget to bring to a wedding.,2,Invitation,21
round1,Name something people forget to bring to a wedding.,3,Camera,18
fast_money,Name something you do before going to sleep.,1,Brush teeth,35
fast_money,Name something you do before going to sleep.,2,Set alarm,24`;

const blankAnswers = (): AnswerDraft[] =>
  Array.from({ length: 6 }, () => ({ answer_text: '', points: '' }));

const TYPE_LABELS: Record<QuestionType, string> = {
  round1: 'ROUND 1',
  round2: 'ROUND 2',
  round3: 'ROUND 3',
  round4: 'ROUND 4',
  sudden_death: 'TIE BREAKER',
  fast_money: 'FAST MONEY',
};

const formatType = (type: QuestionType) => TYPE_LABELS[type];

const parseCsvLine = (line: string) => {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
};

const parseCsv = (text: string): { rows: ParsedCsvRow[]; errors: string[] } => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return { rows: [], errors: ['Paste a header row plus at least one answer row.'] };

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const required = ['type', 'question_text', 'answer_order', 'answer_text', 'points'];
  const missing = required.filter((h) => !headers.includes(h));
  if (missing.length) return { rows: [], errors: [`Missing columns: ${missing.join(', ')}`] };

  const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
  const rows: ParsedCsvRow[] = [];
  const errors: string[] = [];

  lines.slice(1).forEach((line, lineIndex) => {
    const lineNumber = lineIndex + 2;
    const cells = parseCsvLine(line);
    const type = cells[idx.type] as QuestionType;
    const questionText = cells[idx.question_text];
    const answerText = cells[idx.answer_text];
    const order = Number(cells[idx.answer_order]);
    const points = Number(cells[idx.points]);

    if (!QUESTION_TYPES.includes(type)) errors.push(`Line ${lineNumber}: invalid type "${type}".`);
    if (!questionText) errors.push(`Line ${lineNumber}: question_text is required.`);
    if (!answerText) errors.push(`Line ${lineNumber}: answer_text is required.`);
    if (!Number.isInteger(order) || order < 1) errors.push(`Line ${lineNumber}: answer_order must be a positive integer.`);
    if (!Number.isFinite(points) || points < 0) errors.push(`Line ${lineNumber}: points must be zero or greater.`);

    if (QUESTION_TYPES.includes(type) && questionText && answerText && Number.isInteger(order) && Number.isFinite(points)) {
      rows.push({
        type,
        question_text: questionText,
        answer_order: order,
        answer_text: answerText,
        points,
      });
    }
  });

  return { rows, errors };
};

const groupCsvRows = (rows: ParsedCsvRow[]): CsvGroup[] => {
  const groups = new Map<string, CsvGroup>();

  rows.forEach((row) => {
    const key = `${row.type}::${row.question_text}`;
    const group = groups.get(key) ?? {
      key,
      type: row.type,
      question_text: row.question_text,
      answers: [],
    };
    group.answers.push(row);
    groups.set(key, group);
  });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    answers: [...group.answers].sort((a, b) => a.answer_order - b.answer_order),
  }));
};

export default function QuestionAdminPage() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [answerCounts, setAnswerCounts] = useState<Record<string, number>>({});
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>('round1');
  const [answers, setAnswers] = useState<AnswerDraft[]>(blankAnswers);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [csvText, setCsvText] = useState(CSV_TEMPLATE);
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const csvResult = useMemo(() => parseCsv(csvText), [csvText]);
  const csvGroups = useMemo(() => groupCsvRows(csvResult.rows), [csvResult.rows]);

  const loadQuestions = async () => {
    const { data: qRows, error: qError } = await supabase
      .from('questions')
      .select('id, question_text, type')
      .order('type', { ascending: true })
      .order('question_text', { ascending: true });

    if (qError) {
      console.error(qError);
      setStatus('Could not load questions.');
      return;
    }

    const questionRows = (qRows ?? []) as QuestionRow[];
    setQuestions(questionRows);

    if (!questionRows.length) {
      setAnswerCounts({});
      return;
    }

    const { data: aRows, error: aError } = await supabase
      .from('answers')
      .select('question_id')
      .in('question_id', questionRows.map((q) => q.id));

    if (aError) {
      console.error(aError);
      return;
    }

    const counts: Record<string, number> = {};
    ((aRows ?? []) as AnswerCountRow[]).forEach((row) => {
      counts[row.question_id] = (counts[row.question_id] ?? 0) + 1;
    });
    setAnswerCounts(counts);
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const updateAnswer = (index: number, field: keyof AnswerDraft, value: string) => {
    setAnswers((prev) => prev.map((answer, i) => (i === index ? { ...answer, [field]: value } : answer)));
  };

  const addAnswerRow = () => {
    setAnswers((prev) => [...prev, { answer_text: '', points: '' }]);
  };

  const removeAnswerRow = (index: number) => {
    setAnswers((prev) => prev.filter((_, i) => i !== index));
  };

  const resetManualForm = () => {
    setQuestionText('');
    setQuestionType('round1');
    setAnswers(blankAnswers());
    setEditingQuestionId(null);
  };

  const saveManualQuestion = async () => {
    const validAnswers = answers
      .map((answer, index) => ({
        answer_text: answer.answer_text.trim(),
        points: Number(answer.points),
        order: index + 1,
      }))
      .filter((answer) => answer.answer_text);

    if (!questionText.trim()) {
      setStatus('Question text is required.');
      return;
    }

    if (!validAnswers.length) {
      setStatus('Add at least one answer.');
      return;
    }

    if (validAnswers.some((answer) => !Number.isFinite(answer.points) || answer.points < 0)) {
      setStatus('Each answer needs points of zero or greater.');
      return;
    }

    setIsSaving(true);
    setStatus(editingQuestionId ? 'Updating question...' : 'Saving question...');

    if (editingQuestionId) {
      const { error: questionError } = await supabase
        .from('questions')
        .update({ question_text: questionText.trim(), type: questionType })
        .eq('id', editingQuestionId);

      if (questionError) {
        console.error(questionError);
        setStatus('Could not update question. Make sure the questions update policy migration has run.');
        setIsSaving(false);
        return;
      }

      const { error: deleteError } = await supabase
        .from('answers')
        .delete()
        .eq('question_id', editingQuestionId);

      if (deleteError) {
        console.error(deleteError);
        setStatus('Question updated, but old answers could not be replaced.');
        setIsSaving(false);
        return;
      }

      const { error: answerError } = await supabase.from('answers').insert(
        validAnswers.map((answer) => ({
          question_id: editingQuestionId,
          answer_text: answer.answer_text,
          points: answer.points,
          order: answer.order,
          revealed: false,
        }))
      );

      if (answerError) {
        console.error(answerError);
        setStatus('Question updated, but answers failed to save. Run the answers RLS migration if this persists.');
        setIsSaving(false);
        return;
      }

      resetManualForm();
      await loadQuestions();
      setStatus('Question updated.');
      setIsSaving(false);
      return;
    }

    const { data: question, error: questionError } = await supabase
      .from('questions')
      .insert({ question_text: questionText.trim(), type: questionType })
      .select('id')
      .single();

    if (!question || questionError) {
      console.error(questionError);
      setStatus('Could not save question.');
      setIsSaving(false);
      return;
    }

    const { error: answerError } = await supabase.from('answers').insert(
      validAnswers.map((answer) => ({
        question_id: question.id,
        answer_text: answer.answer_text,
        points: answer.points,
        order: answer.order,
        revealed: false,
      }))
    );

    if (answerError) {
      console.error(answerError);
      await supabase.from('questions').delete().eq('id', question.id);
      setStatus('Answers failed to save, so the question was not added. Run the answers RLS migration if this persists.');
      setIsSaving(false);
      return;
    }

    resetManualForm();
    await loadQuestions();
    setStatus('Question added to the pool.');
    setIsSaving(false);
  };

  const importCsv = async () => {
    if (csvResult.errors.length) {
      setStatus('Fix CSV errors before importing.');
      return;
    }

    if (!csvGroups.length) {
      setStatus('No CSV rows to import.');
      return;
    }

    const confirmed = window.confirm(`Import ${csvGroups.length} questions into Supabase?`);
    if (!confirmed) return;

    setIsSaving(true);
    setStatus('Importing CSV...');

    for (const group of csvGroups) {
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert({ question_text: group.question_text, type: group.type })
        .select('id')
        .single();

      if (!question || questionError) {
        console.error(questionError);
        setStatus(`Import stopped at: ${group.question_text}`);
        setIsSaving(false);
        return;
      }

      const { error: answerError } = await supabase.from('answers').insert(
        group.answers.map((answer) => ({
          question_id: question.id,
          answer_text: answer.answer_text,
          points: answer.points,
          order: answer.answer_order,
          revealed: false,
        }))
      );

      if (answerError) {
        console.error(answerError);
        await supabase.from('questions').delete().eq('id', question.id);
        setStatus(`Import stopped because answers failed for: ${group.question_text}`);
        setIsSaving(false);
        return;
      }
    }

    await loadQuestions();
    setStatus(`Imported ${csvGroups.length} questions.`);
    setIsSaving(false);
  };

  const editQuestion = async (question: QuestionRow) => {
    setIsSaving(true);
    setStatus('Loading question for editing...');

    const { data: answerRows, error } = await supabase
      .from('answers')
      .select('answer_text, points, "order"')
      .eq('question_id', question.id)
      .order('order', { ascending: true });

    if (error) {
      console.error(error);
      setStatus('Could not load answers for this question.');
      setIsSaving(false);
      return;
    }

    setEditingQuestionId(question.id);
    setQuestionText(question.question_text);
    setQuestionType(question.type);
    setAnswers(
      ((answerRows ?? []) as AnswerRow[]).length
        ? ((answerRows ?? []) as AnswerRow[]).map((answer) => ({
            answer_text: answer.answer_text,
            points: String(answer.points),
          }))
        : blankAnswers()
    );
    setStatus('Editing question. Make your changes, then click Update Question.');
    setIsSaving(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteQuestion = async (question: QuestionRow) => {
    const confirmed = window.confirm(`Delete this question and all its answers?\n\n${question.question_text}`);
    if (!confirmed) return;

    setIsSaving(true);
    setStatus('Deleting question...');

    const { error: answerError } = await supabase
      .from('answers')
      .delete()
      .eq('question_id', question.id);

    if (answerError) {
      console.error(answerError);
      setStatus('Could not delete answers for this question. Make sure the answers delete policy migration has run.');
      setIsSaving(false);
      return;
    }

    const { error: questionError } = await supabase
      .from('questions')
      .delete()
      .eq('id', question.id);

    if (questionError) {
      console.error(questionError);
      setStatus('Could not delete question. It may be used by an active or previous game session.');
      setIsSaving(false);
      return;
    }

    await loadQuestions();
    setStatus('Question deleted.');
    setIsSaving(false);
  };

  const countsByType = useMemo(() => {
    return QUESTION_TYPES.reduce<Record<QuestionType, number>>((acc, type) => {
      acc[type] = questions.filter((question) => question.type === type).length;
      return acc;
    }, {
      round1: 0,
      round2: 0,
      round3: 0,
      round4: 0,
      sudden_death: 0,
      fast_money: 0,
    });
  }, [questions]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link href="/" className={styles.backLink}>Back to hub</Link>
          <h1>Question Admin</h1>
          <p>Add questions and answer boards directly to the Supabase pool.</p>
        </div>
        <div className={styles.summary}>
          {QUESTION_TYPES.map((type) => (
            <div key={type}>
              <span>{formatType(type)}</span>
              <strong>{countsByType[type]}</strong>
            </div>
          ))}
        </div>
      </header>

      {status && <div className={styles.status}>{status}</div>}

      <section className={styles.layout}>
        <form className={styles.panel} onSubmit={(event) => { event.preventDefault(); saveManualQuestion(); }}>
          <div className={styles.panelHeader}>
            <h2>{editingQuestionId ? 'Edit Question' : 'Add One Question'}</h2>
            <p>
              {editingQuestionId
                ? 'Update the question text, round type, and answer board.'
                : 'Use this for curated entry while building a clean game bank.'}
            </p>
          </div>

          <label>
            Round type
            <select value={questionType} onChange={(event) => setQuestionType(event.target.value as QuestionType)}>
              {QUESTION_TYPES.map((type) => (
                <option key={type} value={type}>{formatType(type)}</option>
              ))}
            </select>
          </label>

          <label>
            Question
            <textarea
              value={questionText}
              onChange={(event) => setQuestionText(event.target.value)}
              placeholder="Name something people do when they are nervous."
              rows={3}
            />
          </label>

          <div className={styles.answerEditor}>
            <div className={styles.answerHeader}>
              <span>Answers</span>
              <button type="button" onClick={addAnswerRow}>Add answer</button>
            </div>

            {answers.map((answer, index) => (
              <div key={index} className={styles.answerRow}>
                <span className={styles.order}>{index + 1}</span>
                <input
                  value={answer.answer_text}
                  onChange={(event) => updateAnswer(index, 'answer_text', event.target.value)}
                  placeholder="Answer"
                />
                <input
                  value={answer.points}
                  onChange={(event) => updateAnswer(index, 'points', event.target.value)}
                  placeholder="Pts"
                  inputMode="numeric"
                />
                <button type="button" onClick={() => removeAnswerRow(index)} disabled={answers.length <= 1}>
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className={styles.actions}>
            <button type="submit" disabled={isSaving}>
              {editingQuestionId ? 'Update Question' : 'Save Question'}
            </button>
            <button type="button" onClick={resetManualForm}>
              {editingQuestionId ? 'Cancel Edit' : 'Reset'}
            </button>
          </div>
        </form>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Bulk Import CSV</h2>
            <p>Paste rows, preview grouped questions, then import them into Supabase.</p>
          </div>

          <textarea
            className={styles.csvBox}
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
            spellCheck={false}
            rows={12}
          />

          <div className={styles.csvMeta}>
            <span>{csvGroups.length} questions parsed</span>
            <span>{csvResult.rows.length} answer rows parsed</span>
          </div>

          {csvResult.errors.length > 0 && (
            <ul className={styles.errors}>
              {csvResult.errors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          )}

          <div className={styles.previewList}>
            {csvGroups.slice(0, 5).map((group) => (
              <article key={group.key} className={styles.previewCard}>
                <strong>{group.question_text}</strong>
                <span>{formatType(group.type)} - {group.answers.length} answers</span>
              </article>
            ))}
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={importCsv} disabled={isSaving || csvResult.errors.length > 0}>
              Import CSV
            </button>
            <button type="button" onClick={() => setCsvText(CSV_TEMPLATE)}>Reset Template</button>
          </div>
        </section>
      </section>

      <section className={styles.pool}>
        <div className={styles.panelHeader}>
          <h2>Current Question Pool</h2>
          <p>{questions.length} questions loaded from Supabase.</p>
        </div>

        <div className={styles.table}>
          {questions.map((question) => (
            <div key={question.id} className={styles.tableRow}>
              <span>{formatType(question.type)}</span>
              <strong>{question.question_text}</strong>
              <em>{answerCounts[question.id] ?? 0} answers</em>
              <button
                type="button"
                className={styles.editQuestion}
                onClick={() => editQuestion(question)}
                disabled={isSaving}
              >
                Edit
              </button>
              <button
                type="button"
                className={styles.deleteQuestion}
                onClick={() => deleteQuestion(question)}
                disabled={isSaving}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
