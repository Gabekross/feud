'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import MusicControls from './MusicControls';
import ScreenConnectionStatus from './ScreenConnectionStatus';
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
  const [showAudioControls, setShowAudioControls] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('id, active_team, team1_score, team2_score, team1_name, team2_name, round')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

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

  const adjustScore = async (team: 1 | 2, delta: number) => {
    if (!sessionId) return;
    const { data, error } = await supabase.rpc('adjust_team_score', {
      p_session_id: sessionId,
      p_team: team,
      p_delta: delta,
    });

    if (error) {
      console.error('Score adjustment failed:', error.message);
      alert('Score adjustment failed. Make sure the operator RPC migration has run.');
      return;
    }

    const nextScore = typeof data === 'number' ? data : 0;
    if (team === 1) setTeam1Score(nextScore);
    else setTeam2Score(nextScore);
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

    const { data, error } = await supabase.rpc('finalize_round_score', {
      p_session_id: sessionId,
      p_multiplier: multiplier,
    });

    if (error) {
      console.error('Finalize round failed:', error.message);
      alert(error.message || 'Failed to finalize round. Make sure the operator RPC migration has run.');
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;
    const roundPoints = result?.round_points ?? 0;
    const awardedPoints = result?.awarded_points ?? 0;
    const awardedTeam = result?.active_team ?? activeTeam;

    showNotice(
      `${awardedTeam === 1 ? team1Name : team2Name} awarded ${awardedPoints} pts${multiplier > 1 ? ` (${roundPoints} x ${multiplier})` : ''}.`
    );
  };

  return (
    <div className={styles.rightPane}>
      <h2>Team Control</h2>
      <ScreenConnectionStatus />
      {notice && <div className={styles.notice}>{notice}</div>}

      <input placeholder="Team 1 name" value={team1Name} onChange={handleTeam1NameChange} />
      <div className={styles.scoreRow}>
        <button onClick={() => adjustScore(1, -1)}>-</button>
        <span>{team1Score} pts</span>
        <button onClick={() => adjustScore(1, 1)}>+</button>
      </div>

      <input placeholder="Team 2 name" value={team2Name} onChange={handleTeam2NameChange} />
      <div className={styles.scoreRow}>
        <button onClick={() => adjustScore(2, -1)}>-</button>
        <span>{team2Score} pts</span>
        <button onClick={() => adjustScore(2, 1)}>+</button>
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

      <button className={styles.audioToggle} onClick={() => setShowAudioControls((value) => !value)}>
        {showAudioControls ? 'Hide Audio Controls' : 'Show Audio Controls'}
      </button>
      {showAudioControls && <MusicControls />}
    </div>
  );
}
