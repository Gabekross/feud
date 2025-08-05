'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import styles from './LeftPane.module.scss';

export default function LeftPane() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [round, setRound] = useState<'round1'|'round2'|'round3'|'round4'|'sudden_death'|'fast_money'>('round1');
  const [fmIndex, setFmIndex] = useState<number>(1); // 1..5 for Fast Money
  const [resetOnSwitch, setResetOnSwitch] = useState(true);

  const [countdownEnabled, setCountdownEnabled] = useState(true);
  const [normalTime, setNormalTime] = useState(30);
  const [fastMoneyTime, setFastMoneyTime] = useState(20);

  const [strikeLimit, setStrikeLimit] = useState(3);
  const [strikes, setStrikes] = useState(0);
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);

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
        .select('*')
        .eq('status', 'active')
        .single();
      if (error) { console.error('Failed to load active session:', error.message); return; }
      if (data) {
        setSessionId(data.id);
        setStrikes(data.strikes ?? 0);
        setStrikeLimit(data.strike_limit ?? 3);
        setTeam1Score(data.team1_score ?? 0);
        setTeam2Score(data.team2_score ?? 0);
      }
    };
    loadSession();
  }, []);

  // read current round
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

  const updateTeamScore = async (team: 'team1' | 'team2', delta: number) => {
    if (!sessionId) return;
    const field = team === 'team1' ? 'team1_score' : 'team2_score';
    const current = team === 'team1' ? team1Score : team2Score;
    const newScore = Math.max(0, current + delta);
    const { error } = await supabase.from('game_sessions').update({ [field]: newScore }).eq('id', sessionId);
    if (error) { console.error('Score update failed:', error.message); return; }
    team === 'team1' ? setTeam1Score(newScore) : setTeam2Score(newScore);
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

    // find current question_id
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

  // ✅ SWITCH ROUND (handles Fast Money fmIndex)
  const handleSwitchRound = async () => {
    if (!sessionId) return;

    const targetRound = roundNumberMap[round];
    if (!targetRound) return;

    // 1) clear current
    const { error: eUnset } = await supabase
      .from('session_questions')
      .update({ is_current: false })
      .eq('session_id', sessionId)
      .eq('is_current', true);
    if (eUnset) { console.error('Unset current round failed:', eUnset.message); alert('❌ Failed to switch round (unset).'); return; }

    // 2) find the single target row id
    let targetRowId: string | null = null;

    if (targetRound === 6) {
      // Fast Money: choose by fm_index (default to 1 if not set)
      const idx = fmIndex || 1;
      const { data: fmRow, error: eFind } = await supabase
        .from('session_questions')
        .select('id, question_id')
        .eq('session_id', sessionId)
        .eq('round_number', 6)
        .eq('fm_index', idx)
        .maybeSingle();
      if (eFind) { console.error('Find FM row failed:', eFind.message); alert('❌ Failed to switch round (find FM).'); return; }
      if (!fmRow?.id) { alert(`❌ No Fast Money row for index ${idx}.`); return; }
      targetRowId = fmRow.id;
    } else {
      // Normal round: one row per round_number
      const { data: row, error: eFind } = await supabase
        .from('session_questions')
        .select('id, question_id')
        .eq('session_id', sessionId)
        .eq('round_number', targetRound)
        .maybeSingle(); // use maybeSingle in case of data quirks
      if (eFind) { console.error('Find round row failed:', eFind.message); alert('❌ Failed to switch round (find).'); return; }
      if (!row?.id) { alert('❌ No session question for that round.'); return; }
      targetRowId = row.id;
    }

    // 3) set that one row current
    const { data: updated, error: eSet } = await supabase
      .from('session_questions')
      .update({ is_current: true })
      .eq('id', targetRowId)
      .select('question_id')
      .single();
    if (eSet) { console.error('Set new current round failed:', eSet.message); alert('❌ Failed to switch round (set).'); return; }

    // 4) update session.round label (useful for UI) + optionally reset
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

  return (
    <div className={styles.leftPane}>
      <h2>🎛️ Game Controls</h2>

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

      <h4>⏱️ Timer Settings</h4>
      <label><input type="checkbox" checked={countdownEnabled} onChange={() => setCountdownEnabled(!countdownEnabled)} /> Enable Countdown</label>
      <label>Normal Time (sec):</label>
      <input type="number" value={normalTime} onChange={(e) => setNormalTime(Number(e.target.value))} />
      <label>Fast Money Time (sec):</label>
      <input type="number" value={fastMoneyTime} onChange={(e) => setFastMoneyTime(Number(e.target.value))} />

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

      <h4>📈 Team Scores</h4>
      <p>Team 1: {team1Score} pts</p>
      <button onClick={() => updateTeamScore('team1', -5)}>-5</button>
      <button onClick={() => updateTeamScore('team1', +5)}>+5</button>

      <p>Team 2: {team2Score} pts</p>
      <button onClick={() => updateTeamScore('team2', -5)}>-5</button>
      <button onClick={() => updateTeamScore('team2', +5)}>+5</button>

      <hr />
      <button className={styles.reset} onClick={handleResetRound}>🔁 Reset Round</button>
    </div>
  );
}
