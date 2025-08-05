'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import styles from './GameSetupPage.module.scss';

type Q = { id: string; question_text: string; type: string };

export default function GameSetupPage() {
  const [pools, setPools] = useState<Record<string, Q[]>>({
    round1: [], round2: [], round3: [], round4: [],
    sudden_death: [], fast_money: [],
  });

  const [selected, setSelected] = useState<Record<string, string>>({
    round1: '', round2: '', round3: '', round4: '', sudden_death: '',
    fm1: '', fm2: '', fm3: '', fm4: '', fm5: '',
  });

  const [team1, setTeam1] = useState('Team 1');
  const [team2, setTeam2] = useState('Team 2');

  useEffect(() => {
    const fetchQuestions = async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('id, question_text, type');
      if (error) return console.error(error);

      const grouped: Record<string, Q[]> = {
        round1: [], round2: [], round3: [], round4: [],
        sudden_death: [], fast_money: [],
      };

      (data ?? []).forEach((q) => {
        if (grouped[q.type]) grouped[q.type].push(q as Q);
      });

      setPools(grouped);
    };
    fetchQuestions();
  }, []);

  const handleSelect = (key: string, id: string) => {
    setSelected((prev) => ({ ...prev, [key]: id }));
  };

  const handleCreateSession = async () => {
    // Validate
    const need = ['round1','round2','round3','round4','sudden_death','fm1','fm2','fm3','fm4','fm5'];
    if (need.some((k) => !selected[k])) {
      alert('❗ Please select all rounds and all 5 Fast Money questions.');
      return;
    }

    // (Optional) Clean up old sessions (dev only)
    await supabase.from('game_sessions').delete().neq('status', 'completed');

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .insert({
        team1_name: team1,
        team2_name: team2,
        status: 'active',
        team1_score: 0,
        team2_score: 0,
        active_team: 1,
        strikes: 0,
        round: 'round1', // start here; switch via LeftPane
      })
      .select()
      .single();

    if (!session || sessionError) {
      console.error(sessionError);
      alert('❌ Failed to create session');
      return;
    }

    const inserts = [
      { round_number: 1, question_id: selected.round1, is_current: true }, // start with round1 current
      { round_number: 2, question_id: selected.round2, is_current: false },
      { round_number: 3, question_id: selected.round3, is_current: false },
      { round_number: 4, question_id: selected.round4, is_current: false },
      { round_number: 5, question_id: selected.sudden_death, is_current: false },
      // fast money — five records with fm_index 1..5
      { round_number: 6, question_id: selected.fm1, is_current: false, fm_index: 1 },
      { round_number: 6, question_id: selected.fm2, is_current: false, fm_index: 2 },
      { round_number: 6, question_id: selected.fm3, is_current: false, fm_index: 3 },
      { round_number: 6, question_id: selected.fm4, is_current: false, fm_index: 4 },
      { round_number: 6, question_id: selected.fm5, is_current: false, fm_index: 5 },
    ].map((row) => ({ session_id: session.id, ...row }));

    const { error: sqError } = await supabase.from('session_questions').insert(inserts);
    if (sqError) {
      console.error(sqError);
      alert('❌ Failed to link questions.');
    } else {
      alert('✅ Game session created!');
    }
  };

  return (
    <div className={styles.gameSetup}>
      <h1>🛠️ Game Setup</h1>

      <div className={styles.teams}>
        <label>Team 1 Name:</label>
        <input value={team1} onChange={(e) => setTeam1(e.target.value)} />
        <label>Team 2 Name:</label>
        <input value={team2} onChange={(e) => setTeam2(e.target.value)} />
      </div>

      {(['round1','round2','round3','round4','sudden_death'] as const).map((type) => (
        <div key={type} className={styles.roundSection}>
          <h3>🔹 {type.replace('_',' ').toUpperCase()}</h3>
          <select value={(selected as any)[type]} onChange={(e) => handleSelect(type, e.target.value)}>
            <option value="">Select a question…</option>
            {pools[type].map((q) => (
              <option key={q.id} value={q.id}>{q.question_text}</option>
            ))}
          </select>
        </div>
      ))}

      <div className={styles.roundSection}>
        <h3>⚡ FAST MONEY — pick 5</h3>
        {[1,2,3,4,5].map((n) => (
          <div key={n} className={styles.fmRow}>
            <label>FM {n}</label>
            <select
              value={(selected as any)[`fm${n}`]}
              onChange={(e) => handleSelect(`fm${n}`, e.target.value)}
            >
              <option value="">Select a Fast Money question…</option>
              {pools.fast_money.map((q) => (
                <option key={q.id} value={q.id}>{q.question_text}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <button className={styles.createBtn} onClick={handleCreateSession}>
        🎮 Create Game Session
      </button>
    </div>
  );
}
