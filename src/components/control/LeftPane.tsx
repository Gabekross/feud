'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { clampRulesStep, getRulesSlides, type RulesMode } from '@/lib/rulesPresentation';
import styles from './LeftPane.module.scss';

type RestorableScreenState = 'standby' | 'team_intro' | 'fast_money_intro' | 'winner' | 'board';
type ScreenState = RestorableScreenState | 'rules';
type RoundState = 'round1'|'round2'|'round3'|'round4'|'sudden_death'|'fast_money';

const roundNumberMap: Record<RoundState, number> = {
  round1: 1, round2: 2, round3: 3, round4: 4, sudden_death: 5, fast_money: 6,
};

const numberToRound: Record<number, RoundState> = {
  1: 'round1', 2: 'round2', 3: 'round3', 4: 'round4', 5: 'sudden_death', 6: 'fast_money',
};

export default function LeftPane() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [round, setRound] = useState<RoundState>('round1');
  const [fmIndex, setFmIndex] = useState<number>(1);
  const [resetOnSwitch, setResetOnSwitch] = useState(true);
  const [screenState, setScreenState] = useState<ScreenState>('standby');
  const [eventTitle, setEventTitle] = useState('GABEKROSS FAMILY FEUD');
  const [eventFooterText, setEventFooterText] = useState('Powered by Gabekross');
  const [showEventFooter, setShowEventFooter] = useState(true);
  const [rulesMode, setRulesMode] = useState<RulesMode>('full');
  const [rulesStep, setRulesStep] = useState(0);
  const [rulesReturnScreenState, setRulesReturnScreenState] = useState<RestorableScreenState>('standby');
  const [notice, setNotice] = useState('');

  const [strikeLimit, setStrikeLimit] = useState(3);
  const [strikes, setStrikes] = useState(0);

  useEffect(() => {
    const loadSession = async () => {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('id, strikes, strike_limit, screen_state, event_title, event_footer_text, show_event_footer, rules_mode, rules_step, rules_return_screen_state')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (error) { console.error('Failed to load active session:', error.message); return; }
      if (data) {
        setSessionId(data.id);
        setStrikes(data.strikes ?? 0);
        setStrikeLimit(data.strike_limit ?? 3);
        setScreenState((data.screen_state ?? 'standby') as ScreenState);
        setEventTitle(data.event_title ?? 'GABEKROSS FAMILY FEUD');
        setEventFooterText(data.event_footer_text ?? 'Powered by Gabekross');
        setShowEventFooter(data.show_event_footer ?? true);
        const nextRulesMode = (data.rules_mode === 'quick' ? 'quick' : 'full') as RulesMode;
        setRulesMode(nextRulesMode);
        setRulesStep(clampRulesStep(nextRulesMode, data.rules_step ?? 0));
        setRulesReturnScreenState((data.rules_return_screen_state ?? 'standby') as RestorableScreenState);
      }
    };
    loadSession();
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const getCurrent = async () => {
      const { data, error } = await supabase
        .from('session_questions')
        .select('round_number, fm_index')
        .eq('session_id', sessionId)
        .eq('is_current', true)
        .single();
      if (error) { console.error('Failed to fetch current round:', error.message); return; }
      if (data?.round_number) {
        const r = numberToRound[data.round_number];
        setRound(r);
        if (r === 'fast_money' && data.fm_index) setFmIndex(data.fm_index);
      }
    };
    getCurrent();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const ch = supabase
      .channel(`left_pane_stage_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          if (typeof payload.new.screen_state === 'string') {
            setScreenState(payload.new.screen_state as ScreenState);
          }
          if (typeof payload.new.event_title === 'string') {
            setEventTitle(payload.new.event_title);
          }
          if (typeof payload.new.event_footer_text === 'string') {
            setEventFooterText(payload.new.event_footer_text);
          }
          if (typeof payload.new.show_event_footer === 'boolean') {
            setShowEventFooter(payload.new.show_event_footer);
          }
          if (payload.new.rules_mode === 'quick' || payload.new.rules_mode === 'full') {
            const nextMode = payload.new.rules_mode as RulesMode;
            setRulesMode(nextMode);
            setRulesStep(clampRulesStep(nextMode, payload.new.rules_step ?? 0));
          } else if (typeof payload.new.rules_step === 'number') {
            setRulesStep(clampRulesStep(rulesMode, payload.new.rules_step));
          }
          if (typeof payload.new.rules_return_screen_state === 'string') {
            setRulesReturnScreenState(payload.new.rules_return_screen_state as RestorableScreenState);
          }
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(ch); };
  }, [sessionId, rulesMode]);

  const updateScreenState = async (next: ScreenState) => {
    if (!sessionId) return;
    setScreenState(next);
    const { error } = await supabase
      .from('game_sessions')
      .update({ screen_state: next })
      .eq('id', sessionId);
    if (error) {
      console.error('Screen state update failed:', error.message);
      alert('Failed to update audience screen mode. Make sure the screen_state migration has run.');
    }
  };

  const showRules = async (mode: RulesMode) => {
    if (!sessionId) return;
    const returnState = screenState === 'rules' ? rulesReturnScreenState : (screenState as RestorableScreenState);
    setScreenState('rules');
    setRulesMode(mode);
    setRulesStep(0);
    setRulesReturnScreenState(returnState);
    const { error } = await supabase
      .from('game_sessions')
      .update({
        screen_state: 'rules',
        rules_mode: mode,
        rules_step: 0,
        rules_return_screen_state: returnState,
      })
      .eq('id', sessionId);
    if (error) {
      console.error('Show rules failed:', error.message);
      alert('Failed to show rules. Make sure the rules presentation migration has run.');
    }
  };

  const setRulesPresentationStep = async (step: number) => {
    if (!sessionId) return;
    const nextStep = clampRulesStep(rulesMode, step);
    setRulesStep(nextStep);
    const { error } = await supabase
      .from('game_sessions')
      .update({ rules_step: nextStep })
      .eq('id', sessionId);
    if (error) console.error('Rules step update failed:', error.message);
  };

  const exitRules = async (nextScreen: RestorableScreenState = rulesReturnScreenState) => {
    if (!sessionId) return;
    setScreenState(nextScreen);
    const { error } = await supabase
      .from('game_sessions')
      .update({ screen_state: nextScreen })
      .eq('id', sessionId);
    if (error) {
      console.error('Exit rules failed:', error.message);
      alert('Failed to exit rules.');
    }
  };

  const saveEventTitle = async () => {
    if (!sessionId) return;
    const nextTitle = eventTitle.trim() || 'GABEKROSS FAMILY FEUD';
    setEventTitle(nextTitle);
    const { error } = await supabase
      .from('game_sessions')
      .update({ event_title: nextTitle })
      .eq('id', sessionId);
    if (error) {
      console.error('Event title update failed:', error.message);
      alert('Failed to save event title. Make sure the event_title migration has run.');
    }
  };

  const saveEventFooter = async (nextShow = showEventFooter) => {
    if (!sessionId) return;
    const nextText = eventFooterText.trim() || 'Powered by Gabekross';
    setEventFooterText(nextText);
    setShowEventFooter(nextShow);
    const { error } = await supabase
      .from('game_sessions')
      .update({
        event_footer_text: nextText,
        show_event_footer: nextShow,
      })
      .eq('id', sessionId);
    if (error) {
      console.error('Event footer update failed:', error.message);
      alert('Failed to save footer settings. Make sure the footer migration has run.');
    }
  };

  const updateStrikes = async (newCount: number) => {
    if (!sessionId) return;
    const { error } = await supabase.from('game_sessions').update({ strikes: newCount }).eq('id', sessionId);
    if (error) { console.error('Strike update failed:', error.message); return; }
    setStrikes(newCount);
  };

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2800);
  };

  useEffect(() => {
    if (screenState !== 'rules') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        void setRulesPresentationStep(rulesStep + 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        void setRulesPresentationStep(rulesStep - 1);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        void exitRules();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenState, rulesStep, rulesMode, rulesReturnScreenState, sessionId]);

  const handleResetRound = async () => {
    if (!sessionId) return;
    const { error: e1 } = await supabase.from('game_sessions').update({ strikes: 0 }).eq('id', sessionId);
    if (!e1) setStrikes(0);

    const { data: cur } = await supabase
      .from('session_questions')
      .select('question_id')
      .eq('session_id', sessionId)
      .eq('is_current', true)
      .single();
    if (cur?.question_id) {
      const { error: e3 } = await supabase.from('answers').update({ revealed: false }).eq('question_id', cur.question_id);
      if (e3) console.error('Reset answers failed:', e3.message);
    }
    await supabase
      .from('session_questions')
      .update({ score_finalized: false })
      .eq('session_id', sessionId)
      .eq('is_current', true);
    showNotice('Round has been reset.');
  };

  const handleSwitchRound = async () => {
    if (!sessionId) return;

    const targetRound = roundNumberMap[round];
    if (!targetRound) return;

    const { error: eUnset } = await supabase
      .from('session_questions')
      .update({ is_current: false })
      .eq('session_id', sessionId)
      .eq('is_current', true);
    if (eUnset) { console.error('Unset current round failed:', eUnset.message); alert('❌ Failed to switch round (unset).'); return; }

    let targetRowId: string | null = null;

    if (targetRound === 6) {
      const idx = fmIndex || 1;
      const { data: fmRow, error: eFind } = await supabase
        .from('session_questions')
        .select('id')
        .eq('session_id', sessionId)
        .eq('round_number', 6)
        .eq('fm_index', idx)
        .maybeSingle();
      if (eFind) { console.error('Find FM row failed:', eFind.message); alert('❌ Failed to switch round (find FM).'); return; }
      if (!fmRow?.id) { alert(`❌ No Fast Money row for index ${idx}.`); return; }
      targetRowId = fmRow.id;
    } else {
      const { data: row, error: eFind } = await supabase
        .from('session_questions')
        .select('id')
        .eq('session_id', sessionId)
        .eq('round_number', targetRound)
        .maybeSingle();
      if (eFind) { console.error('Find round row failed:', eFind.message); alert('❌ Failed to switch round (find).'); return; }
      if (!row?.id) { alert('❌ No session question for that round.'); return; }
      targetRowId = row.id;
    }

    const { data: updated, error: eSet } = await supabase
      .from('session_questions')
      .update({ is_current: true })
      .eq('id', targetRowId)
      .select('question_id')
      .single();
    if (eSet) { console.error('Set new current round failed:', eSet.message); alert('❌ Failed to switch round (set).'); return; }

    if (targetRound !== 6) {
      const resetPayload = resetOnSwitch
        ? { reveal_question: false, score_finalized: false }
        : { reveal_question: false };
      await supabase.from('session_questions').update(resetPayload).eq('id', targetRowId);
    } else {
      // Fast Money: Q1 stays hidden by default (operator manually clicks
      // "Reveal Question" to start the round). Q2–Q5 are pre-revealed so
      // the running 20-second timer doesn't lose seconds to manual clicks
      // between each question. Apply this to ALL 5 FM rows so the state
      // is consistent regardless of which one is becoming current.
      await supabase
        .from('session_questions')
        .update({ fm_reveal_question: false })
        .eq('session_id', sessionId)
        .eq('round_number', 6)
        .eq('fm_index', 1);
      await supabase
        .from('session_questions')
        .update({ fm_reveal_question: true })
        .eq('session_id', sessionId)
        .eq('round_number', 6)
        .neq('fm_index', 1);
    }

    const roundLabel: Record<number, string> = { 1:'round1',2:'round2',3:'round3',4:'round4',5:'sudden_death',6:'fast_money' };
    await supabase.from('game_sessions').update({ round: roundLabel[targetRound] }).eq('id', sessionId);

    if (resetOnSwitch && updated?.question_id) {
      const { error: eAns } = await supabase.from('answers').update({ revealed: false }).eq('question_id', updated.question_id);
      if (eAns) console.error('Reset answers on switch failed:', eAns.message);
      const { error: eStr } = await supabase.from('game_sessions').update({ strikes: 0 }).eq('id', sessionId);
      if (!eStr) setStrikes(0);
    }

    showNotice(`Switched to ${round.replace('_',' ')}${targetRound===6 ? ` (Q${fmIndex})` : ''}`);
  };

  const resetGameSession = async () => {
    if (!sessionId) return;
    const sure = window.confirm('⚠️ Reset entire game session? This will clear scores, answers, and rounds.');
    if (!sure) return;

    await supabase.from('game_sessions').update({
      team1_score: 0,
      team2_score: 0,
      strikes: 0,
      active_team: 1,
      round: 'round1',
      screen_state: 'standby',
      rules_mode: 'full',
      rules_step: 0,
      rules_return_screen_state: 'standby',
      fm_timer_running: false,
      fm_timer_started_at: null,
      fm_timer_duration: 20,
      fm_show_clock: true
    }).eq('id', sessionId);

    await supabase.from('answers').update({ revealed: false });

    await supabase.from('fast_money_responses').update({
      answer_text: '',
      matched_answer_id: null,
      points_awarded: 0,
      reveal_answer: false,
      reveal_points: false
    }).eq('session_id', sessionId);

    await supabase
      .from('session_questions')
      .update({ is_current: false, fm_reveal_question: false, reveal_question: false, score_finalized: false })
      .eq('session_id', sessionId);

    await supabase
      .from('session_questions')
      .update({ is_current: true, reveal_question: false, score_finalized: false })
      .eq('session_id', sessionId)
      .eq('round_number', 1);

    setRound('round1');
    setFmIndex(1);
    setStrikes(0);
    setScreenState('standby');
    showNotice('Game session reset.');
  };

  const exitGameSession = async () => {
    if (!sessionId) return;
    const sure = window.confirm('End this game and return the audience screen to standby? Scores, reveals, strikes, and Fast Money responses will reset.');
    if (!sure) return;

    const { error: sessionError } = await supabase.from('game_sessions').update({
      team1_score: 0,
      team2_score: 0,
      strikes: 0,
      active_team: 1,
      round: 'round1',
      screen_state: 'standby',
      rules_mode: 'full',
      rules_step: 0,
      rules_return_screen_state: 'standby',
      fm_timer_running: false,
      fm_timer_started_at: null,
      fm_timer_duration: 20,
      fm_show_clock: true,
      fm_hide_p1: false,
      fm_player1_name: 'Player 1',
      fm_player2_name: 'Player 2',
    }).eq('id', sessionId);

    if (sessionError) {
      console.error('End game session failed:', sessionError.message);
      alert('Failed to end game session.');
      return;
    }

    await supabase.from('answers').update({ revealed: false });

    await supabase.from('fast_money_responses').update({
      answer_text: '',
      matched_answer_id: null,
      points_awarded: 0,
      reveal_answer: false,
      reveal_points: false,
    }).eq('session_id', sessionId);

    await supabase
      .from('session_questions')
      .update({ is_current: false, fm_reveal_question: false, reveal_question: false, score_finalized: false })
      .eq('session_id', sessionId);

    await supabase
      .from('session_questions')
      .update({ is_current: true, reveal_question: false, score_finalized: false })
      .eq('session_id', sessionId)
      .eq('round_number', 1);

    setRound('round1');
    setFmIndex(1);
    setStrikes(0);
    setScreenState('standby');
    showNotice('Game ended. Audience screen returned to standby.');
  };

  return (
    <div className={styles.leftPane}>
      <h2>🎛️ Game Controls</h2>
      {notice && <div className={styles.notice}>{notice}</div>}

      <h4>Audience Screen</h4>
      <label>Event Title</label>
      <input
        type="text"
        value={eventTitle}
        onChange={(e) => setEventTitle(e.target.value)}
        onBlur={saveEventTitle}
      />
      <button onClick={saveEventTitle}>Save Event Title</button>

      <label>Footer Text</label>
      <input
        type="text"
        value={eventFooterText}
        onChange={(e) => setEventFooterText(e.target.value)}
        onBlur={() => saveEventFooter()}
      />
      <label>
        <input
          type="checkbox"
          checked={showEventFooter}
          onChange={(e) => saveEventFooter(e.target.checked)}
        />
        Show footer on intro screens
      </label>
      <button onClick={() => saveEventFooter()}>Save Footer</button>

      <div className={styles.screenModes}>
        <button
          className={screenState === 'rules' ? styles.activeMode : ''}
          onClick={() => showRules('full')}
        >
          Show Rules
        </button>
        <button onClick={() => showRules('quick')}>
          Show Quick Rules
        </button>
        <button
          className={screenState === 'standby' ? styles.activeMode : ''}
          onClick={() => updateScreenState('standby')}
        >
          Standby
        </button>
        <button
          className={screenState === 'team_intro' ? styles.activeMode : ''}
          onClick={() => updateScreenState('team_intro')}
        >
          Team Intro
        </button>
        <button
          className={screenState === 'fast_money_intro' ? styles.activeMode : ''}
          onClick={() => updateScreenState('fast_money_intro')}
        >
          Fast Money Intro
        </button>
        <button
          className={screenState === 'winner' ? styles.activeMode : ''}
          onClick={() => updateScreenState('winner')}
        >
          Winner
        </button>
        <button
          className={screenState === 'board' ? styles.activeMode : ''}
          onClick={() => updateScreenState('board')}
        >
          Show Board
        </button>
      </div>

      {screenState === 'rules' && (
        <div className={styles.rulesControls}>
          <div className={styles.rulesStatus}>
            <span>Rules: Step {rulesStep + 1} of {getRulesSlides(rulesMode).length}</span>
            <strong>{getRulesSlides(rulesMode)[rulesStep]?.title}</strong>
          </div>
          <div className={styles.rulesNav}>
            <button onClick={() => setRulesPresentationStep(rulesStep - 1)} disabled={rulesStep <= 0}>Previous</button>
            <button onClick={() => setRulesPresentationStep(rulesStep + 1)}>
              {rulesStep >= getRulesSlides(rulesMode).length - 1 ? 'Stay Ready' : rulesStep === getRulesSlides(rulesMode).length - 2 ? 'Ready Screen' : 'Next'}
            </button>
            <button onClick={() => setRulesPresentationStep(0)}>Restart</button>
            <button onClick={() => setRulesPresentationStep(getRulesSlides(rulesMode).length - 1)}>Skip to Ready</button>
            <button onClick={() => exitRules()}>Exit Rules</button>
            <button onClick={() => exitRules('team_intro')}>Go to Team Intro</button>
            <button onClick={() => exitRules('board')}>Go to Board</button>
          </div>
        </div>
      )}

      <hr />

      <label>Round:</label>
      <select value={round} onChange={(e) => setRound(e.target.value as RoundState)}>
        <option value="round1">Round 1</option>
        <option value="round2">Round 2</option>
        <option value="round3">Round 3</option>
        <option value="round4">Round 4</option>
        <option value="sudden_death">Tie Breaker</option>
        <option value="fast_money">Fast Money</option>
      </select>

      {round === 'fast_money' && (
        <>
          <label>Fast Money Question #</label>
          <select value={fmIndex} onChange={(e) => setFmIndex(Number(e.target.value))}>
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </>
      )}

      <label>
        <input type="checkbox" checked={resetOnSwitch} onChange={() => setResetOnSwitch(!resetOnSwitch)} />
        Reset answers & strikes when switching
      </label>
      <button onClick={handleSwitchRound}>🔀 Switch to Selected Round</button>

      <hr />

      <h4>❌ Strike Controls</h4>
      <p>Strikes: {strikes} / {strikeLimit}</p>
      <button onClick={() => updateStrikes(Math.max(0, strikes - 1))}>➖</button>
      <button onClick={() => updateStrikes(Math.min(strikeLimit, strikes + 1))}>➕</button>

      <label>Strike Limit</label>
      <select value={strikeLimit} onChange={(e) => setStrikeLimit(Number(e.target.value))}>
        <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
      </select>

      <hr />
      <button className={styles.reset} onClick={handleResetRound}>🔁 Reset Round</button>
      <button className={styles.resetGameBtn} onClick={resetGameSession}>🔄 Reset Game Session</button>
      <button className={styles.exitGameBtn} onClick={exitGameSession}>End Game Session</button>
    </div>
  );
}
