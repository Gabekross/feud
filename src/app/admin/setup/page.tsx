'use client';

import { useEffect, useMemo, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import useAuthProfile from '@/hooks/useAuthProfile';
import { supabase } from '@/lib/supabaseClient';
import { buildSessionLink, createSessionAccessTokens, type SessionAccessTokens } from '@/lib/sessionAccess';
import { ensureSessionAnswerStates } from '@/lib/sessionAnswerStates';
import styles from './GameSetupPage.module.scss';

type QuestionType = 'round1' | 'round2' | 'round3' | 'round4' | 'sudden_death' | 'fast_money';
type Q = { id: string; question_text: string; type: QuestionType };

const ROUND_TYPES: QuestionType[] = ['round1', 'round2', 'round3', 'round4', 'sudden_death'];
const REQUIRED_SELECTIONS = ['round1','round2','round3','round4','sudden_death','fm1','fm2','fm3','fm4','fm5'];

const TYPE_LABELS: Record<QuestionType, string> = {
  round1: 'ROUND 1',
  round2: 'ROUND 2',
  round3: 'ROUND 3',
  round4: 'ROUND 4',
  sudden_death: 'TIE BREAKER',
  fast_money: 'FAST MONEY',
};

const formatType = (type: QuestionType) => TYPE_LABELS[type];

function GameSetupContent() {
  const { user } = useAuthProfile();
  const [pools, setPools] = useState<Record<QuestionType, Q[]>>({
    round1: [], round2: [], round3: [], round4: [],
    sudden_death: [], fast_money: [],
  });

  const [selected, setSelected] = useState<Record<string, string>>({
    round1: '', round2: '', round3: '', round4: '', sudden_death: '',
    fm1: '', fm2: '', fm3: '', fm4: '', fm5: '',
  });

  const [team1, setTeam1] = useState('Team 1');
  const [team2, setTeam2] = useState('Team 2');
  const [eventTitle, setEventTitle] = useState('GABEKROSS FAMILY FEUD');
  const [eventFooterText, setEventFooterText] = useState('Powered by Gabekross');
  const [showEventFooter, setShowEventFooter] = useState(true);
  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null);
  const [createdTokens, setCreatedTokens] = useState<SessionAccessTokens | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('id, question_text, type')
        .order('question_text', { ascending: true });
      if (error) return console.error(error);

      const grouped: Record<QuestionType, Q[]> = {
        round1: [], round2: [], round3: [], round4: [],
        sudden_death: [], fast_money: [],
      };

      (data ?? []).forEach((q) => {
        const type = q.type as QuestionType;
        if (grouped[type]) grouped[type].push(q as Q);
      });

      setPools(grouped);
    };
    fetchQuestions();
  }, []);

  const selectedIds = useMemo(
    () => Object.values(selected).filter(Boolean),
    [selected]
  );
  const hasDuplicateSelections = new Set(selectedIds).size !== selectedIds.length;

  const handleSelect = (key: string, id: string) => {
    setSelected((prev) => ({ ...prev, [key]: id }));
  };

  const handleCreateSession = async () => {
    if (REQUIRED_SELECTIONS.some((k) => !selected[k])) {
      alert('Please select all rounds and all 5 Fast Money questions.');
      return;
    }

    if (hasDuplicateSelections) {
      alert('Please choose a unique question for each slot.');
      return;
    }

    const accessTokens = createSessionAccessTokens();
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .insert({
        ...accessTokens,
        owner_user_id: user?.id ?? null,
        created_by: user?.id ?? null,
        team1_name: team1,
        team2_name: team2,
        status: 'active',
        team1_score: 0,
        team2_score: 0,
        active_team: 1,
        strikes: 0,
        round: 'round1',
        screen_state: 'standby',
        event_title: eventTitle.trim() || 'GABEKROSS FAMILY FEUD',
        event_footer_text: eventFooterText.trim() || 'Powered by Gabekross',
        show_event_footer: showEventFooter,
      })
      .select()
      .single();

    if (!session || sessionError) {
      console.error(sessionError);
      alert('Failed to create session.');
      return;
    }

    const inserts = [
      { round_number: 1, question_id: selected.round1, is_current: true },
      { round_number: 2, question_id: selected.round2, is_current: false },
      { round_number: 3, question_id: selected.round3, is_current: false },
      { round_number: 4, question_id: selected.round4, is_current: false },
      { round_number: 5, question_id: selected.sudden_death, is_current: false },
      { round_number: 6, question_id: selected.fm1, is_current: false, fm_index: 1 },
      { round_number: 6, question_id: selected.fm2, is_current: false, fm_index: 2 },
      { round_number: 6, question_id: selected.fm3, is_current: false, fm_index: 3 },
      { round_number: 6, question_id: selected.fm4, is_current: false, fm_index: 4 },
      { round_number: 6, question_id: selected.fm5, is_current: false, fm_index: 5 },
    ].map((row) => ({ session_id: session.id, ...row }));

    const { error: sqError } = await supabase.from('session_questions').insert(inserts);
    if (sqError) {
      console.error(sqError);
      alert('Failed to link questions.');
    } else {
      const questionIds = inserts.map((row) => row.question_id);
      const { data: answerRows, error: answersError } = await supabase
        .from('answers')
        .select('id')
        .in('question_id', questionIds);

      if (answersError) {
        console.error(answersError);
        alert('Game created, but answer reveal state could not be prepared.');
      } else {
        await ensureSessionAnswerStates(session.id, (answerRows ?? []).map((answer) => answer.id));
      }

      setCreatedSessionId(session.id);
      setCreatedTokens(accessTokens);
      alert('Game session created.');
    }
  };

  return (
    <div className={styles.gameSetup}>
      <h1>Game Setup</h1>

      <div className={styles.teams}>
        <label>Event Title:</label>
        <input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} />
        <label>Footer Text:</label>
        <input value={eventFooterText} onChange={(e) => setEventFooterText(e.target.value)} />
        <label>
          <input
            type="checkbox"
            checked={showEventFooter}
            onChange={(e) => setShowEventFooter(e.target.checked)}
          />
          Show footer on intro screens
        </label>
        <label>Team 1 Name:</label>
        <input value={team1} onChange={(e) => setTeam1(e.target.value)} />
        <label>Team 2 Name:</label>
        <input value={team2} onChange={(e) => setTeam2(e.target.value)} />
      </div>

      {hasDuplicateSelections && (
        <div className={styles.warning}>
          The same question is selected more than once. Pick unique questions before creating the game.
        </div>
      )}

      {createdSessionId && (
        <div className={styles.warning}>
          Session created. Open now:{' '}
          <a href={buildSessionLink('/control', createdSessionId, 'operator', createdTokens?.operator_token)}>Control Panel</a>
          {' | '}
          <a href={buildSessionLink('/main-screen', createdSessionId, 'screen', createdTokens?.screen_token)}>Main Screen</a>
          {' | '}
          <a href={buildSessionLink('/control/audio', createdSessionId, 'audio', createdTokens?.audio_token)}>Audio</a>
          {' | '}
          <a href={buildSessionLink('/cards', createdSessionId, 'cards', createdTokens?.cards_token)}>Question Cards</a>
          {' | '}
          <a href="/sessions">Back to Dashboard</a>
        </div>
      )}

      {ROUND_TYPES.map((type) => (
        <div key={type} className={styles.roundSection}>
          <h3>{formatType(type)} <span>{pools[type].length} available</span></h3>
          <select value={selected[type]} onChange={(e) => handleSelect(type, e.target.value)}>
            <option value="">Select a question...</option>
            {pools[type].map((q) => (
              <option key={q.id} value={q.id}>{q.question_text}</option>
            ))}
          </select>
        </div>
      ))}

      <div className={styles.roundSection}>
        <h3>FAST MONEY - pick 5 <span>{pools.fast_money.length} available</span></h3>
        {[1,2,3,4,5].map((n) => (
          <div key={n} className={styles.fmRow}>
            <label>FM {n}</label>
            <select
              value={selected[`fm${n}`]}
              onChange={(e) => handleSelect(`fm${n}`, e.target.value)}
            >
              <option value="">Select a Fast Money question...</option>
              {pools.fast_money.map((q) => (
                <option key={q.id} value={q.id}>{q.question_text}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <button className={styles.createBtn} onClick={handleCreateSession}>
        Create Game Session
      </button>
    </div>
  );
}

export default function GameSetupPage() {
  return (
    <AuthGate>
      <GameSetupContent />
    </AuthGate>
  );
}
