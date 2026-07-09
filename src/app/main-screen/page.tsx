'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import useActiveSession from '@/hooks/useActiveSession';
import QuestionDisplay from '@/components/QuestionDisplay';
import AnswerBoxes from '@/components/AnswerBoxes';
import TeamScore from '@/components/TeamScore';
import StrikeDisplay from '@/components/StrikeDisplay';
import FastMoneyBoard from '@/components/FastMoneyBoard';
import FullscreenToggle from '@/components/FullscreenToggle';
import PresentationModeToggle, { type PresentationMode } from '@/components/PresentationModeToggle';
import RoundBadge, { type Round } from '@/components/RoundBadge';
import EdgeCalibrationPanel, { type EdgeMargins } from '@/components/EdgeCalibrationPanel';
import styles from './MainScreen.module.scss';

type ScreenState = 'standby' | 'team_intro' | 'fast_money_intro' | 'winner' | 'board';

export default function MainScreenPage() {
  const sessionId = useActiveSession();

  const [team1Name, setTeam1Name] = useState('Team 1');
  const [team2Name, setTeam2Name] = useState('Team 2');
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState<{ text: string; revealed: boolean; points: number }[]>([]);
  const [teamScores, setTeamScores] = useState({ team1: 0, team2: 0 });
  const [activeTeam, setActiveTeam] = useState<number | null>(null);
  const [strikes, setStrikes] = useState(0);
  const [strikeLimit, setStrikeLimit] = useState(3);
  const [showStrikeModal, setShowStrikeModal] = useState(false);
  const [isFastMoney, setIsFastMoney] = useState(false);
  const [screenState, setScreenState] = useState<ScreenState>('standby');
  const [eventTitle, setEventTitle] = useState('GABEKROSS FAMILY FEUD');
  const [eventFooterText, setEventFooterText] = useState('Powered by Gabekross');
  const [showEventFooter, setShowEventFooter] = useState(true);
  const [revealQ, setRevealQ] = useState(false);
  const [presentationMode, setPresentationMode] = useState<PresentationMode>('cozy');
  const [currentRound, setCurrentRound] = useState<Round>(null);
  const [showFmTitle, setShowFmTitle] = useState(false);
  const [edgeMargins, setEdgeMargins] = useState<EdgeMargins>({ top: 3, right: 3, bottom: 3, left: 3 });
  const [calibrating, setCalibrating] = useState(false);

  const [fmRunning, setFmRunning] = useState(false);
  const [fmStartedAt, setFmStartedAt] = useState<string | null>(null);
  const [fmDuration, setFmDuration] = useState(20);
  const [fmRemain, setFmRemain] = useState(20);

  const rafRef = useRef<number | null>(null);
  const prevStrikesRef = useRef(0);
  const wasFastMoneyRef = useRef(false);

  const getTimerColor = () => {
    const ratio = fmRemain / Math.max(1, fmDuration);
    if (ratio > 0.5) return '#4caf50';
    if (ratio > 0.2) return '#ffeb3b';
    return '#f44336';
  };

  const computeRemain = () => {
    if (fmRunning && fmStartedAt) {
      const start = new Date(fmStartedAt).getTime();
      const elapsed = Math.floor((Date.now() - start) / 1000);
      return Math.max(0, fmDuration - elapsed);
    }
    return Math.max(0, fmDuration);
  };

  const leadingTeamName =
    teamScores.team1 === teamScores.team2
      ? 'Great Game'
      : teamScores.team1 > teamScores.team2
        ? team1Name
        : team2Name;

  const leadingScore = Math.max(teamScores.team1, teamScores.team2);

  const loadQAByQuestionId = async (qid: string) => {
    const { data: q } = await supabase
      .from('questions')
      .select('question_text')
      .eq('id', qid)
      .single();
    setQuestion(q?.question_text ?? '');

    const { data: a } = await supabase
      .from('answers')
      .select('answer_text, points, revealed, "order"')
      .eq('question_id', qid)
      .order('order', { ascending: true });

    setAnswers(
      (a ?? []).map((x) => ({ text: x.answer_text, points: x.points, revealed: x.revealed }))
    );
  };

  const applySession = (session: any) => {
    setTeam1Name(session.team1_name ?? 'Team 1');
    setTeam2Name(session.team2_name ?? 'Team 2');
    setTeamScores({ team1: session.team1_score ?? 0, team2: session.team2_score ?? 0 });
    setActiveTeam(session.active_team ?? 1);
    setIsFastMoney(session.round === 'fast_money');
    setCurrentRound((session.round ?? null) as Round);
    setScreenState((session.screen_state ?? 'standby') as ScreenState);
    setEventTitle(session.event_title ?? 'GABEKROSS FAMILY FEUD');
    setEventFooterText(session.event_footer_text ?? 'Powered by Gabekross');
    setShowEventFooter(session.show_event_footer ?? true);

    const newStrikes = session.strikes ?? 0;
    if (newStrikes > prevStrikesRef.current) {
      setShowStrikeModal(true);
      setTimeout(() => setShowStrikeModal(false), 1200);
    }
    prevStrikesRef.current = newStrikes;
    setStrikes(newStrikes);
    setStrikeLimit(session.strike_limit ?? 3);

    setFmRunning(!!session.fm_timer_running);
    setFmStartedAt(session.fm_timer_started_at ?? null);
    setFmDuration(session.fm_timer_duration ?? (session.fast_money_seconds ?? 20));
    setFmRemain(() => {
      if (session.fm_timer_running && session.fm_timer_started_at) {
        const start = new Date(session.fm_timer_started_at).getTime();
        const elapsed = Math.floor((Date.now() - start) / 1000);
        return Math.max(0, (session.fm_timer_duration ?? 0) - elapsed);
      }
      return Math.max(0, session.fm_timer_duration ?? (session.fast_money_seconds ?? 20));
    });
  };

  const loadInitial = async () => {
    if (!sessionId) return;

    const { data: session } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (session) {
      prevStrikesRef.current = session.strikes ?? 0;
      applySession(session);
    }

    if (!session?.round || session.round !== 'fast_money') {
      const { data: sessionQ } = await supabase
        .from('session_questions')
        .select('question_id, reveal_question')
        .eq('session_id', sessionId)
        .eq('is_current', true)
        .single();

      setRevealQ(!!sessionQ?.reveal_question);
      if (sessionQ?.question_id) await loadQAByQuestionId(sessionQ.question_id);
    }
  };

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (isFastMoney && !wasFastMoneyRef.current && screenState === 'board') {
      setShowFmTitle(true);
      const t = setTimeout(() => setShowFmTitle(false), 2200);
      wasFastMoneyRef.current = true;
      return () => clearTimeout(t);
    }
    if (!isFastMoney) {
      wasFastMoneyRef.current = false;
    }
  }, [isFastMoney, screenState]);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const loop = () => {
      setFmRemain(computeRemain());
      if (fmRunning) rafRef.current = requestAnimationFrame(loop);
    };
    if (fmRunning) {
      rafRef.current = requestAnimationFrame(loop);
    } else {
      setFmRemain(computeRemain());
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fmRunning, fmStartedAt, fmDuration]);

  useEffect(() => {
    if (!sessionId) return;

    const sub = supabase
      .channel(`main_screen_live_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` },
        (payload: any) => {
          applySession(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'answers' },
        (payload: any) => {
          const updated = payload.new;
          setAnswers((prev) =>
            prev.map((a) =>
              a.text === updated.answer_text ? { ...a, revealed: updated.revealed } : a
            )
          );
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(sub); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`main_screen_current_round_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'session_questions', filter: `session_id=eq.${sessionId}` },
        async (payload: any) => {
          if (payload.new?.is_current) {
            setRevealQ(!!payload.new.reveal_question);
            await loadQAByQuestionId(payload.new.question_id as string);
          }
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [sessionId]);

  useEffect(() => {
    const tryFs = async () => {
      if (!document.fullscreenElement) {
        try { await document.documentElement.requestFullscreen(); } catch {}
      }
      window.removeEventListener('click', tryFs);
      window.removeEventListener('keydown', tryFs);
      window.removeEventListener('touchstart', tryFs);
    };
    window.addEventListener('click', tryFs, { once: true });
    window.addEventListener('keydown', tryFs, { once: true });
    window.addEventListener('touchstart', tryFs, { once: true });
    return () => {
      window.removeEventListener('click', tryFs);
      window.removeEventListener('keydown', tryFs);
      window.removeEventListener('touchstart', tryFs);
    };
  }, []);

  return (
    <div
      className={`${styles.mainScreen} ${presentationMode === 'venue' ? styles.venueMode : ''} ${calibrating ? styles.calibrating : ''}`}
      style={{
        ['--pad-top' as string]: `${edgeMargins.top}vh`,
        ['--pad-right' as string]: `${edgeMargins.right}vw`,
        ['--pad-bottom' as string]: `${edgeMargins.bottom}vh`,
        ['--pad-left' as string]: `${edgeMargins.left}vw`,
      }}
    >
      <FullscreenToggle />
      <PresentationModeToggle onChange={setPresentationMode} />
      <EdgeCalibrationPanel onChange={setEdgeMargins} onCalibratingChange={setCalibrating} />

      <div className={styles.stage}>
        {screenState !== 'board' ? (
          <section className={`${styles.introScreen} ${styles[screenState]}`}>
            <div className={styles.introGlow} />
            <div className={styles.introEyebrow}>
              {screenState === 'team_intro' && "Tonight's Matchup"}
              {screenState === 'fast_money_intro' && 'Final Round'}
              {screenState === 'winner' && 'Final Score'}
              {screenState === 'standby' && 'Live Family Game Experience'}
            </div>
            <h1>
              {screenState === 'fast_money_intro'
                ? 'Fast Money'
                : screenState === 'winner'
                  ? 'Winner'
                  : eventTitle}
            </h1>
            {screenState === 'team_intro' ? (
              <div className={styles.matchup}>
                <div className={styles.teamCard}>
                  <span>Team 1</span>
                  <strong>{team1Name}</strong>
                </div>
                <div className={styles.versus}>VS</div>
                <div className={styles.teamCard}>
                  <span>Team 2</span>
                  <strong>{team2Name}</strong>
                </div>
              </div>
            ) : screenState === 'fast_money_intro' ? (
              <div className={styles.standbyCopy}>
                <span>{eventTitle}</span>
                <strong>20 seconds on the clock</strong>
              </div>
            ) : screenState === 'winner' ? (
              <div className={styles.winnerCard}>
                <span>{teamScores.team1 === teamScores.team2 ? 'Final Result' : 'Congratulations'}</span>
                <strong>{leadingTeamName}</strong>
                <em>{teamScores.team1} - {teamScores.team2}</em>
                {teamScores.team1 !== teamScores.team2 && <small>{leadingScore} points</small>}
              </div>
            ) : (
              <div className={styles.standbyCopy}>
                <span>Teams are getting ready</span>
                <strong>The show begins shortly</strong>
              </div>
            )}
            {showEventFooter && (
              <div className={styles.introFooter}>
                {eventFooterText}
              </div>
            )}
          </section>
        ) : (
          <div className={`${styles.boardScene} ${isFastMoney ? styles.fastMoneyScene : ''}`}>
            <RoundBadge round={currentRound} />
            {!isFastMoney && (
              <TeamScore
                team1Name={team1Name}
                team2Name={team2Name}
                team1={teamScores.team1}
                team2={teamScores.team2}
                activeTeam={activeTeam ?? 1}
              />
            )}

            {isFastMoney ? (
              <FastMoneyBoard
                timerRemain={fmRemain}
                timerDuration={fmDuration}
                timerColor={getTimerColor()}
              />
            ) : (
              <>
                <QuestionDisplay question={question} revealed={revealQ} />
                <AnswerBoxes answers={answers} />
                <StrikeDisplay count={strikes} limit={strikeLimit} />
              </>
            )}
          </div>
        )}
      </div>

      {showStrikeModal && <div className={styles.strikeModal} />}

      {showFmTitle && (
        <div className={styles.fmTitleCard}>
          <div className={styles.fmTitleInner}>
            <div className={styles.fmTitleSubtitle}>FINAL ROUND</div>
            <div className={styles.fmTitleMain}>FAST MONEY</div>
          </div>
        </div>
      )}
    </div>
  );
}
