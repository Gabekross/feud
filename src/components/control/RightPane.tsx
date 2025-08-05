'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import styles from './RightPane.module.scss';

let debounceTimer: ReturnType<typeof setTimeout>;

export default function RightPane() {
  const [team1Name, setTeam1Name] = useState('Team 1');
  const [team2Name, setTeam2Name] = useState('Team 2');

  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [activeTeam, setActiveTeam] = useState<number>(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [round, setRound] = useState<string>('round1'); // track round to guard FM

  useEffect(() => {
    const fetchSession = async () => {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('id, active_team, team1_score, team2_score, team1_name, team2_name, round')
        .eq('status', 'active')
        .single();

      if (error) {
        console.error('Load session failed:', error.message);
        return;
      }

      if (data) {
        setSessionId(data.id);
        setActiveTeam(data.active_team ?? 1);
        setTeam1Score(data.team1_score ?? 0);
        setTeam2Score(data.team2_score ?? 0);
        setTeam1Name(data.team1_name ?? 'Team 1');
        setTeam2Name(data.team2_name ?? 'Team 2');
        setRound(data.round ?? 'round1');
      }
    };

    fetchSession();
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const ch = supabase
      .channel(`right_pane_game_sessions_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          setActiveTeam(payload.new.active_team ?? 1);
          setTeam1Score(payload.new.team1_score ?? 0);
          setTeam2Score(payload.new.team2_score ?? 0);
          setTeam1Name(payload.new.team1_name ?? 'Team 1');
          setTeam2Name(payload.new.team2_name ?? 'Team 2');
          setRound(payload.new.round ?? 'round1');
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(ch); };
  }, [sessionId]);

  const updateScore = async (team: 1 | 2, newScore: number) => {
    if (!sessionId) return;
    const column = team === 1 ? 'team1_score' : 'team2_score';
    const { error } = await supabase.from('game_sessions').update({ [column]: newScore }).eq('id', sessionId);
    if (error) console.error('Score update failed:', error.message);
    else (team === 1 ? setTeam1Score(newScore) : setTeam2Score(newScore));
  };

  const updateActiveTeam = async (team: number) => {
    if (!sessionId) return;
    const { error } = await supabase.from('game_sessions').update({ active_team: team }).eq('id', sessionId);
    if (error) console.error('Active team update failed:', error.message);
    setActiveTeam(team);
  };

  const updateTeamNames = (name1: string, name2: string) => {
    if (!sessionId) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const { error } = await supabase
        .from('game_sessions')
        .update({ team1_name: name1, team2_name: name2 })
        .eq('id', sessionId);
      if (error) console.error('Team names update failed:', error.message);
    }, 500);
  };

  const handleTeam1NameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setTeam1Name(name);
    updateTeamNames(name, team2Name);
  };
  const handleTeam2NameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setTeam2Name(name);
    updateTeamNames(team1Name, name);
  };

  // Award revealed answer points to active team (non-FM only), and auto-advance round
  const finalizeRound = async () => {
    if (!sessionId) return;

    if (round === 'fast_money') {
      alert('⚠️ Finalize Round is disabled in Fast Money.');
      return;
    }

    const { data: current, error: e1 } = await supabase
      .from('session_questions')
      .select('id, question_id, round_number')
      .eq('session_id', sessionId)
      .eq('is_current', true)
      .single();

    if (e1 || !current?.question_id) {
      alert('No current question to finalize.');
      return;
    }

    // sum revealed
    const { data: revealed, error: e2 } = await supabase
      .from('answers')
      .select('points')
      .eq('question_id', current.question_id)
      .eq('revealed', true);

    if (e2) {
      console.error('Fetch revealed answers failed:', e2.message);
      alert('Could not calculate round points.');
      return;
    }
    const roundPoints = (revealed ?? []).reduce((s, r) => s + (r.points ?? 0), 0);

    // add to active team
    const scoreCol = activeTeam === 1 ? 'team1_score' : 'team2_score';
    const { data: sRow } = await supabase
      .from('game_sessions')
      .select(scoreCol)
      .eq('id', sessionId)
      .single();

    const newScore = (sRow as any)?.[scoreCol] + roundPoints;

    const { error: e3 } = await supabase
      .from('game_sessions')
      .update({ [scoreCol]: newScore })
      .eq('id', sessionId);
    if (e3) { console.error(e3.message); return; }

    alert(`🏁 ${activeTeam === 1 ? team1Name : team2Name} awarded ${roundPoints} pts.`);

    // (Optional) auto-advance to the next round
    const nextRound = current.round_number + 1;
    const { data: nextRow } = await supabase
      .from('session_questions')
      .select('id')
      .eq('session_id', sessionId)
      .eq('round_number', nextRound)
      .single();

    if (nextRow?.id) {
      await supabase.from('session_questions').update({ is_current: false }).eq('id', current.id);
      await supabase.from('session_questions').update({ is_current: true }).eq('id', nextRow.id);

      // update session.round label for UI
      const roundLabel: Record<number, string> = {
        1: 'round1', 2: 'round2', 3: 'round3', 4: 'round4', 5: 'sudden_death', 6: 'fast_money',
      };
      await supabase.from('game_sessions')
        .update({ round: roundLabel[nextRound] ?? 'round1', strikes: 0 })
        .eq('id', sessionId);
    }
  };

  return (
    <div className={styles.rightPane}>
      <h2>🏆 Team Control</h2>

      <label>{team1Name}</label>
      <input value={team1Name} onChange={handleTeam1NameChange} />
      <div className={styles.scoreRow}>
        <button onClick={() => updateScore(1, Math.max(0, team1Score - 5))}>-</button>
        <span>{team1Score} pts</span>
        <button onClick={() => updateScore(1, team1Score + 5)}>+</button>
      </div>

      <label>{team2Name}</label>
      <input value={team2Name} onChange={handleTeam2NameChange} />
      <div className={styles.scoreRow}>
        <button onClick={() => updateScore(2, Math.max(0, team2Score - 5))}>-</button>
        <span>{team2Score} pts</span>
        <button onClick={() => updateScore(2, team2Score + 5)}>+</button>
      </div>

      <hr />

      <h4>Active Team</h4>
      <div className={styles.teamToggle}>
        <button
          className={activeTeam === 1 ? styles.active : ''}
          onClick={() => updateActiveTeam(1)}
        >
          {team1Name}
        </button>
        <button
          className={activeTeam === 2 ? styles.active : ''}
          onClick={() => updateActiveTeam(2)}
        >
          {team2Name}
        </button>
      </div>

      <hr />
      <button className={styles.finalize} onClick={finalizeRound}>
        🏁 Finalize Round
      </button>
    </div>
  );
}
