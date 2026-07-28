import { supabase } from '@/lib/supabaseClient';

export type SessionAnswerState = {
  session_id: string;
  answer_id: string;
  revealed: boolean;
};

export const ensureSessionAnswerStates = async (sessionId: string, answerIds: string[]) => {
  const uniqueAnswerIds = [...new Set(answerIds)].filter(Boolean);
  if (uniqueAnswerIds.length === 0) return;

  const rows = uniqueAnswerIds.map((answerId) => ({
    session_id: sessionId,
    answer_id: answerId,
    revealed: false,
  }));

  const { error } = await supabase
    .from('session_answer_states')
    .upsert(rows, { onConflict: 'session_id,answer_id', ignoreDuplicates: true });

  if (error) {
    console.error('Ensure session answer states failed:', error.message);
  }
};

export const loadSessionAnswerStateMap = async (sessionId: string, answerIds: string[]) => {
  const uniqueAnswerIds = [...new Set(answerIds)].filter(Boolean);
  if (uniqueAnswerIds.length === 0) return new Map<string, boolean>();

  await ensureSessionAnswerStates(sessionId, uniqueAnswerIds);

  const { data, error } = await supabase
    .from('session_answer_states')
    .select('answer_id, revealed')
    .eq('session_id', sessionId)
    .in('answer_id', uniqueAnswerIds);

  if (error) {
    console.error('Load session answer states failed:', error.message);
    return new Map<string, boolean>();
  }

  return new Map((data ?? []).map((row) => [row.answer_id as string, !!row.revealed]));
};

export const setSessionAnswerRevealed = async (
  sessionId: string,
  answerIds: string[],
  revealed: boolean
) => {
  const uniqueAnswerIds = [...new Set(answerIds)].filter(Boolean);
  if (uniqueAnswerIds.length === 0) return;

  const rows = uniqueAnswerIds.map((answerId) => ({
    session_id: sessionId,
    answer_id: answerId,
    revealed,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('session_answer_states')
    .upsert(rows, { onConflict: 'session_id,answer_id' });

  if (error) {
    console.error('Set session answer states failed:', error.message);
  }
};
