'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import MusicControls from './MusicControls';
import styles from './RightPane.module.scss';

let debounceTimer: ReturnType<typeof setTimeout>;

export default function RightPane() {
  const [team1Name, setTeam1Name] = useState('Team 1');
  const [team2Name, setTeam2Name] = useState('Team 2');
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [activeTeam, setActiveTeam] = useState<number>(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [round, setRound] = useState<string>('round1');
  const [notice, setNotice] = useState('');

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

    return () => {
      void supabase.removeChannel(ch);
    };
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

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2800);
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

  const finalizeRound = async (multiplier: 1 | 2 | 3 = 1) => {
    if (!sessionId || !activeTeam) return;

    const { data: current, error: e1 } = await supabase
      .from('session_questions')
      .select('id, question_id, score_finalized')
      .eq('session_id', sessionId)
      .eq('is_current', true)
      .single();

    if (e1 || !current?.question_id) {
      alert('No current question to finalize.');
      return;
    }

    if (current.score_finalized) {
      alert('This round score has already been finalized. Reset the round or switch rounds before finalizing again.');
      return;
    }

    const { data: revealed, error: e2 } = await supabase
      .from('answers')
      .select('points')
      .eq('question_id', current.question_id)
      .eq('revealed', true);

    if (e2) {
      console.error('Could not fetch revealed answers:', e2.message);
      alert('Could not calculate round points.');
      return;
    }

    const roundPoints = (revealed ?? []).reduce((sum, r) => sum + (r?.points ?? 0), 0);
    const awardedPoints = roundPoints * multiplier;
    const column = activeTeam === 1 ? 'team1_score' : 'team2_score';

    const { data: sRow, error: e3 } = await supabase
      .from('game_sessions')
      .select(column)
      .eq('id', sessionId)
      .single();

    if (e3) {
      console.error('Could not read current score:', e3.message);
      return;
    }

    const currentScore = (sRow as any)?.[column] ?? 0;
    const newScore = currentScore + awardedPoints;

    const { error: e4 } = await supabase
      .from('game_sessions')
      .update({ [column]: newScore })
      .eq('id', sessionId);

    if (e4) {
      console.error('Score update failed:', e4.message);
      alert('Failed to finalize round.');
      return;
    }

    const { error: e5 } = await supabase
      .from('session_questions')
      .update({ score_finalized: true })
      .eq('id', current.id);

    if (e5) {
      console.error('Score finalized flag update failed:', e5.message);
      alert('Score was awarded, but the board-points display could not be locked. Make sure the score_finalized migration has run.');
    }

    showNotice(
      `${activeTeam === 1 ? team1Name : team2Name} awarded ${awardedPoints} pts${multiplier > 1 ? ` (${roundPoints} x ${multiplier})` : ''}.`
    );
  };

  return (
    <div className={styles.rightPane}>
      <h2>Team Control</h2>
      {notice && <div className={styles.notice}>{notice}</div>}

      <input placeholder="Team 1 name" value={team1Name} onChange={handleTeam1NameChange} />
      <div className={styles.scoreRow}>
        <button onClick={() => updateScore(1, Math.max(0, team1Score - 1))}>-</button>
        <span>{team1Score} pts</span>
        <button onClick={() => updateScore(1, team1Score + 1)}>+</button>
      </div>

      <input placeholder="Team 2 name" value={team2Name} onChange={handleTeam2NameChange} />
      <div className={styles.scoreRow}>
        <button onClick={() => updateScore(2, Math.max(0, team2Score - 1))}>-</button>
        <span>{team2Score} pts</span>
        <button onClick={() => updateScore(2, team2Score + 1)}>+</button>
      </div>

      <hr />

      <h4>Active Team</h4>
      <div className={styles.teamToggle}>
        <button className={activeTeam === 1 ? styles.active : ''} onClick={() => updateActiveTeam(1)}>
          {team1Name}
        </button>
        <button className={activeTeam === 2 ? styles.active : ''} onClick={() => updateActiveTeam(2)}>
          {team2Name}
        </button>
      </div>

      <hr />

      <h4>Finalize Score</h4>
      <div className={styles.finalizeGroup}>
        <button className={styles.finalize} onClick={() => finalizeRound(1)}>
          Finalize 1x
        </button>
        <button className={styles.finalize} onClick={() => finalizeRound(2)}>
          Double 2x
        </button>
        <button className={styles.finalize} onClick={() => finalizeRound(3)}>
          Triple 3x
        </button>
      </div>

      <hr />

      <MusicControls />
    </div>
  );
}
