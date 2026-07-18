'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import useActiveSession from '@/hooks/useActiveSession';
import { emitSoundEvent } from '@/lib/soundEvents';
import styles from './MusicControls.module.scss';

type TrackId = 'intro' | 'full' | 'applause' | 'massive';

type Track = {
  id: TrackId;
  label: string;
  src: string;
  limitSeconds?: number;
  loopable?: boolean;
};

const THEME_SRC = '/sounds/family-feud-theme.mp3';
const INTRO_SECONDS = 33;
const MIN_SPEED = 0.5;
const MAX_SPEED = 1;
const SPEED_STEP = 0.1;

const TRACKS: Track[] = [
  { id: 'intro', label: 'Intro 33s', src: THEME_SRC, limitSeconds: INTRO_SECONDS },
  { id: 'full', label: 'Full Theme', src: THEME_SRC },
  { id: 'applause', label: 'Applause', src: '/sounds/applause.mp3', loopable: true },
  { id: 'massive', label: 'Massive Crowd', src: '/sounds/massive-ecstatic-crowd.mp3', loopable: true },
];

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function TrackMixer({ track }: { track: Track }) {
  const sessionId = useActiveSession();
  const progressTimerRef = useRef<number | null>(null);
  const [duration, setDuration] = useState(track.limitSeconds ?? INTRO_SECONDS);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [shouldLoop, setShouldLoop] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const maxTime = useMemo(
    () => track.limitSeconds ?? Math.max(duration, INTRO_SECONDS),
    [duration, track.limitSeconds]
  );

  useEffect(() => {
    const audio = new Audio(track.src);
    audio.preload = 'metadata';
    const handleLoadedMetadata = () =>
      setDuration(Number.isFinite(audio.duration) ? audio.duration : (track.limitSeconds ?? INTRO_SECONDS));

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [track.limitSeconds, track.src]);

  useEffect(() => {
    if (!isPlaying) return;

    progressTimerRef.current = window.setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + (playbackRate * 0.5);
        if (next >= maxTime && !shouldLoop) {
          if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
          setIsPlaying(false);
          return 0;
        }
        return shouldLoop && next >= maxTime ? 0 : Math.min(next, maxTime);
      });
    }, 500);

    return () => {
      if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    };
  }, [isPlaying, maxTime, playbackRate, shouldLoop]);

  const sendMusicCommand = (command: 'play' | 'pause' | 'stop' | 'seek' | 'config', seekTime = currentTime) =>
    emitSoundEvent(sessionId, {
      sound_type: 'music',
      command,
      track_id: track.id,
      src: track.src,
      seek_time: seekTime,
      volume,
      playback_rate: playbackRate,
      loop: shouldLoop && !!track.loopable,
    });

  const seekTo = (nextTime: number) => {
    const boundedTime = Math.min(Math.max(nextTime, 0), maxTime);
    setCurrentTime(boundedTime);
    void sendMusicCommand('seek', boundedTime);
  };

  const changeSpeed = (nextRate: number) => {
    const roundedRate = Math.round(nextRate * 10) / 10;
    const nextPlaybackRate = Math.min(MAX_SPEED, Math.max(MIN_SPEED, roundedRate));
    setPlaybackRate(nextPlaybackRate);
    void emitSoundEvent(sessionId, {
      sound_type: 'music',
      command: 'config',
      track_id: track.id,
      src: track.src,
      seek_time: currentTime,
      volume,
      playback_rate: nextPlaybackRate,
      loop: shouldLoop && !!track.loopable,
    });
  };

  const play = async () => {
    let seekTime = currentTime;
    if (track.limitSeconds && currentTime >= track.limitSeconds) {
      seekTime = 0;
      setCurrentTime(0);
    }
    await sendMusicCommand('play', seekTime);
    setIsPlaying(true);
  };

  const pause = () => {
    void sendMusicCommand('pause');
    setIsPlaying(false);
  };

  const stop = () => {
    void sendMusicCommand('stop', 0);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const changeVolume = (nextVolume: number) => {
    setVolume(nextVolume);
    void emitSoundEvent(sessionId, {
      sound_type: 'music',
      command: 'config',
      track_id: track.id,
      src: track.src,
      seek_time: currentTime,
      volume: nextVolume,
      playback_rate: playbackRate,
      loop: shouldLoop && !!track.loopable,
    });
  };

  const changeLoop = (nextLoop: boolean) => {
    setShouldLoop(nextLoop);
    void emitSoundEvent(sessionId, {
      sound_type: 'music',
      command: 'config',
      track_id: track.id,
      src: track.src,
      seek_time: currentTime,
      volume,
      playback_rate: playbackRate,
      loop: nextLoop && !!track.loopable,
    });
  };

  return (
    <div className={styles.trackCard}>
      <div className={styles.trackHeader}>
        <strong>{track.label}</strong>
        <span className={isPlaying ? styles.playing : ''}>{isPlaying ? 'Playing' : 'Ready'}</span>
      </div>

      {track.loopable && (
        <label className={styles.loopToggle}>
          <input
            type="checkbox"
            checked={shouldLoop}
            onChange={(e) => changeLoop(e.target.checked)}
          />
          Loop
        </label>
      )}

      <label className={styles.sliderLabel}>
        <span>Seek</span>
        <span>{formatTime(currentTime)} / {formatTime(maxTime)}</span>
      </label>
      <input
        className={styles.slider}
        type="range"
        min={0}
        max={Math.max(1, Math.floor(maxTime))}
        step={0.1}
        value={Math.min(currentTime, maxTime)}
        onChange={(e) => seekTo(Number(e.target.value))}
      />

      <div className={styles.transport}>
        <button type="button" onClick={play}>Play</button>
        <button type="button" onClick={pause}>Pause</button>
        <button type="button" onClick={stop}>Stop</button>
      </div>

      <label className={styles.sliderLabel}>
        <span>Volume</span>
        <span>{Math.round(volume * 100)}%</span>
      </label>
      <input
        className={styles.slider}
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => changeVolume(Number(e.target.value))}
      />

      <label className={styles.sliderLabel}>
        <span>Speed</span>
        <span>{Math.round(playbackRate * 100)}%</span>
      </label>
      <div className={styles.speedControls}>
        <button
          type="button"
          onClick={() => changeSpeed(playbackRate - SPEED_STEP)}
          disabled={playbackRate <= MIN_SPEED}
        >
          -10%
        </button>
        <input
          className={styles.slider}
          type="range"
          min={MIN_SPEED}
          max={MAX_SPEED}
          step={SPEED_STEP}
          value={playbackRate}
          onChange={(e) => changeSpeed(Number(e.target.value))}
        />
        <button
          type="button"
          onClick={() => changeSpeed(playbackRate + SPEED_STEP)}
          disabled={playbackRate >= MAX_SPEED}
        >
          +10%
        </button>
      </div>
    </div>
  );
}

export default function MusicControls() {
  return (
    <section className={styles.musicPanel} aria-label="Music controls">
      <div className={styles.header}>
        <span className={styles.kicker}>Music Mixer</span>
        <strong>Layer Tracks</strong>
      </div>

      <div className={styles.trackList}>
        {TRACKS.map((track) => (
          <TrackMixer key={track.id} track={track} />
        ))}
      </div>
    </section>
  );
}
