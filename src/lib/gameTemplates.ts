import { supabase } from '@/lib/supabaseClient';
import { createSessionAccessTokens } from '@/lib/sessionAccess';
import { ensureSessionAnswerStates } from '@/lib/sessionAnswerStates';

type TemplateRow = {
  id: string;
  title: string;
  team1_name: string | null;
  team2_name: string | null;
  event_title: string | null;
  event_footer_text: string | null;
  show_event_footer: boolean | null;
};

type TemplateQuestionRow = {
  round_number: number;
  question_id: string;
  fm_index: number | null;
  sort_order: number | null;
};

type SourceSessionRow = {
  team1_name: string | null;
  team2_name: string | null;
  event_title: string | null;
  event_footer_text: string | null;
  show_event_footer: boolean | null;
};

export const launchTemplateSession = async (templateId: string, userId: string) => {
  const { data: template, error: templateError } = await supabase
    .from('game_templates')
    .select('id, title, team1_name, team2_name, event_title, event_footer_text, show_event_footer')
    .eq('id', templateId)
    .single();

  if (templateError || !template) {
    throw new Error(templateError?.message ?? 'Template not found.');
  }

  const { data: rows, error: rowsError } = await supabase
    .from('game_template_questions')
    .select('round_number, question_id, fm_index, sort_order')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: true });

  if (rowsError || !rows?.length) {
    throw new Error(rowsError?.message ?? 'Template has no questions.');
  }

  const typedTemplate = template as TemplateRow;
  const typedRows = rows as TemplateQuestionRow[];

  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .insert({
      ...createSessionAccessTokens(),
      owner_user_id: userId,
      created_by: userId,
      team1_name: typedTemplate.team1_name ?? 'Team 1',
      team2_name: typedTemplate.team2_name ?? 'Team 2',
      status: 'active',
      team1_score: 0,
      team2_score: 0,
      active_team: 1,
      strikes: 0,
      round: 'round1',
      screen_state: 'standby',
      event_title: typedTemplate.event_title ?? typedTemplate.title,
      event_footer_text: typedTemplate.event_footer_text ?? 'Powered by Gabekross',
      show_event_footer: typedTemplate.show_event_footer ?? true,
    })
    .select('id')
    .single();

  if (sessionError || !session) {
    throw new Error(sessionError?.message ?? 'Could not create game session.');
  }

  const sessionQuestionRows = typedRows.map((row) => ({
    session_id: session.id,
    round_number: row.round_number,
    question_id: row.question_id,
    fm_index: row.fm_index,
    is_current: row.round_number === 1,
  }));

  const { error: sessionQuestionsError } = await supabase
    .from('session_questions')
    .insert(sessionQuestionRows);

  if (sessionQuestionsError) {
    throw new Error(sessionQuestionsError.message);
  }

  const questionIds = typedRows.map((row) => row.question_id);
  const { data: answerRows } = await supabase
    .from('answers')
    .select('id')
    .in('question_id', questionIds);

  await ensureSessionAnswerStates(session.id, (answerRows ?? []).map((answer) => answer.id));

  return session.id as string;
};

export const publishSessionAsTemplate = async (sessionId: string, title: string, userId: string) => {
  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .select('team1_name, team2_name, event_title, event_footer_text, show_event_footer')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    throw new Error(sessionError?.message ?? 'Session not found.');
  }

  const { data: rows, error: rowsError } = await supabase
    .from('session_questions')
    .select('round_number, question_id, fm_index')
    .eq('session_id', sessionId)
    .order('round_number', { ascending: true })
    .order('fm_index', { ascending: true });

  if (rowsError || !rows?.length) {
    throw new Error(rowsError?.message ?? 'Session has no questions.');
  }

  const typedSession = session as SourceSessionRow;
  const { data: template, error: templateError } = await supabase
    .from('game_templates')
    .insert({
      title,
      description: `Published from session ${sessionId}`,
      visibility: 'public',
      status: 'active',
      team1_name: typedSession.team1_name ?? 'Team 1',
      team2_name: typedSession.team2_name ?? 'Team 2',
      event_title: typedSession.event_title ?? title,
      event_footer_text: typedSession.event_footer_text ?? 'Powered by Gabekross',
      show_event_footer: typedSession.show_event_footer ?? true,
      created_by: userId,
    })
    .select('id')
    .single();

  if (templateError || !template) {
    throw new Error(templateError?.message ?? 'Could not create template.');
  }

  const templateRows = (rows as TemplateQuestionRow[]).map((row, index) => ({
    template_id: template.id,
    round_number: row.round_number,
    question_id: row.question_id,
    fm_index: row.fm_index,
    sort_order: index + 1,
  }));

  const { error: insertError } = await supabase
    .from('game_template_questions')
    .insert(templateRows);

  if (insertError) {
    throw new Error(insertError.message);
  }

  return template.id as string;
};

export const duplicateGameSession = async (sessionId: string, userId: string) => {
  const { data: source, error: sourceError } = await supabase
    .from('game_sessions')
    .select('team1_name, team2_name, event_title, event_footer_text, show_event_footer')
    .eq('id', sessionId)
    .single();

  if (sourceError || !source) {
    throw new Error(sourceError?.message ?? 'Session not found.');
  }

  const { data: rows, error: rowsError } = await supabase
    .from('session_questions')
    .select('round_number, question_id, fm_index')
    .eq('session_id', sessionId)
    .order('round_number', { ascending: true })
    .order('fm_index', { ascending: true });

  if (rowsError || !rows?.length) {
    throw new Error(rowsError?.message ?? 'Session has no questions to duplicate.');
  }

  const typedSource = source as SourceSessionRow;
  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .insert({
      ...createSessionAccessTokens(),
      owner_user_id: userId,
      created_by: userId,
      team1_name: typedSource.team1_name ?? 'Team 1',
      team2_name: typedSource.team2_name ?? 'Team 2',
      status: 'active',
      team1_score: 0,
      team2_score: 0,
      active_team: 1,
      strikes: 0,
      round: 'round1',
      screen_state: 'standby',
      event_title: `${typedSource.event_title ?? 'Game Session'} Copy`,
      event_footer_text: typedSource.event_footer_text ?? 'Powered by Gabekross',
      show_event_footer: typedSource.show_event_footer ?? true,
    })
    .select('id')
    .single();

  if (sessionError || !session) {
    throw new Error(sessionError?.message ?? 'Could not duplicate session.');
  }

  const typedRows = rows as TemplateQuestionRow[];
  const sessionQuestionRows = typedRows.map((row) => ({
    session_id: session.id,
    round_number: row.round_number,
    question_id: row.question_id,
    fm_index: row.fm_index,
    is_current: row.round_number === 1,
  }));

  const { error: sessionQuestionsError } = await supabase
    .from('session_questions')
    .insert(sessionQuestionRows);

  if (sessionQuestionsError) {
    throw new Error(sessionQuestionsError.message);
  }

  const questionIds = typedRows.map((row) => row.question_id);
  const { data: answerRows } = await supabase
    .from('answers')
    .select('id')
    .in('question_id', questionIds);

  await ensureSessionAnswerStates(session.id, (answerRows ?? []).map((answer) => answer.id));

  return session.id as string;
};

export const archiveGameSession = async (sessionId: string) => {
  const { error } = await supabase
    .from('game_sessions')
    .update({
      status: 'completed',
      screen_state: 'standby',
      fm_timer_running: false,
      fm_timer_started_at: null,
    })
    .eq('id', sessionId);

  if (error) {
    throw new Error(error.message);
  }
};
