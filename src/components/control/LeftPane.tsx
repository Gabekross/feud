'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import styles from './LeftPane.module.scss';

type ScreenState = 'standby' | 'team_intro' | 'fast_money_intro' | 'winner' | 'board';

export default function LeftPane() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [round, setRound] = useState<'round1'|'round2'|'round3'|'round4'|'sudden_death'|'fast_money'>('round1');
  const [fmIndex, setFmIndex] = useState<number>(1);
  const [resetOnSwitch, setResetOnSwitch] = useState(true);
  const [screenState, setScreenState] = useState<ScreenState>('standby');
  const [eventTitle, setEventTitle] = useState('GABEKROSS FAMILY FEUD');
  const [eventFooterText, setEventFooterText] = useState('Powered by Gabekross');
  const [showEventFooter, setShowEventFooter] = useState(true);

  const [strikeLimit, setStrikeLimit] = useState(3);
  const [strikes, setStrikes] = useState(0);

  const roundNumberMap: Record<typeof round, number> = {
    round1: 1, round2: 2, round3: 3, round4: 4, sudden_death: 5, fast_money: 6,
  };
  const numberToRound: Record<number, typeof round> = {
    1: 'round1', 2: 'round2', 3: 'round3', 4: 'round4', 5: 'sudden_death', 6: 'fast_money',
  };

  useEffect(() => {
    const loadSession = async () => {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('id, strikes, strike_limit, screen_state, event_title, event_footer_text, show_event_footer')
        .eq('status', 'active')
        .single();
      if (error) { console.error('Failed to load active session:', error.message); return; }
      if (data) {
        setSessionId(data.id);
        setStrikes(data.strikes ?? 0);
        setStrikeLimit(data.strike_limit ?? 3);
        setScreenState((data.screen_state ?? 'standby') as ScreenState);
        setEventTitle(data.event_title ?? 'GABEKROSS FAMILY FEUD');
        setEventFooterText(data.event_footer_text ?? 'Powered by Gabekross');
        setShowEventFooter(data.show_event_footer ?? true);
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
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(ch); };
  }, [sessionId]);

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
    alert('🔁 Round has been reset.');
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
      await supabase.from('session_questions').update({ reveal_question: false }).eq('id', targetRowId);
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

    alert(`✅ Switched to ${round.replace('_',' ')}${targetRound===6 ? ` (Q${fmIndex})` : ''}`);
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
      fm_timer_running: false,
      fm_timer_started_at: null,
      fm_timer_duration: 20
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
      .update({ is_current: false, fm_reveal_question: false, reveal_question: false })
      .eq('session_id', sessionId);

    await supabase
      .from('session_questions')
      .update({ is_current: true, reveal_question: false })
      .eq('session_id', sessionId)
      .eq('round_number', 1);

    setRound('round1');
    setFmIndex(1);
    setStrikes(0);
    setScreenState('standby');
    alert('✅ Game session reset!');
  };

  return (
    <div className={styles.leftPane}>
      <h2>🎛️ Game Controls</h2>

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

      <hr />

      <label>Round:</label>
      <select value={round} onChange={(e) => setRound(e.target.value as any)}>
        <option value="round1">Round 1</option>
        <option value="round2">Round 2</option>
        <option value="round3">Round 3</option>
        <option value="round4">Round 4</option>
        <option value="sudden_death">Sudden Death</option>
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
    </div>
  );
}
