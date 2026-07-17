'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './MusicControls.module.scss';

type TrackMode = 'intro' | 'full';

const TRACK_SRC = '/sounds/family-feud-theme.mp3';
const INTRO_SECONDS = 33;
const MIN_SPEED = 0.5;
const MAX_SPEED = 1;
const SPEED_STEP = 0.1;

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function MusicControls() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [mode, setMode] = useState<TrackMode>('intro');
  const [duration, setDuration] = useState(INTRO_SECONDS);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const maxTime = useMemo(
    () => (mode === 'intro' ? INTRO_SECONDS : Math.max(duration, INTRO_SECONDS)),
    [duration, mode]
  );

  useEffect(() => {
    const audio = new Audio(TRACK_SRC);
    audio.preload = 'metadata';
    audio.volume = volume;
    audio.playbackRate = playbackRate;
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : INTRO_SECONDS);
    };
    const handleTimeUpdate = () => {
      const nextLimit = mode === 'intro' ? INTRO_SECONDS : audio.duration;
      if (mode === 'intro' && audio.currentTime >= INTRO_SECONDS) {
        audio.pause();
        audio.currentTime = 0;
        setCurrentTime(0);
        setIsPlaying(false);
        return;
      }
      if (Number.isFinite(nextLimit)) {
        setCurrentTime(Math.min(audio.currentTime, nextLimit));
      } else {
        setCurrentTime(audio.currentTime);
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audioRef.current = null;
    };
  }, [mode]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  const changeSpeed = (nextRate: number) => {
    const roundedRate = Math.round(nextRate * 10) / 10;
    setPlaybackRate(Math.min(MAX_SPEED, Math.max(MIN_SPEED, roundedRate)));
  };

  const seekTo = (nextTime: number) => {
    const audio = audioRef.current;
    const boundedTime = Math.min(Math.max(nextTime, 0), maxTime);
    setCurrentTime(boundedTime);
    if (audio) audio.currentTime = boundedTime;
  };

  const play = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (mode === 'intro' && audio.currentTime >= INTRO_SECONDS) {
      audio.currentTime = 0;
    }
    try {
      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Music playback failed:', error);
    }
  };

  const pause = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
  };

  const stop = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const changeMode = (nextMode: TrackMode) => {
    stop();
    setMode(nextMode);
  };

  return (
    <section className={styles.musicPanel} aria-label="Music controls">
      <div className={styles.header}>
        <span className={styles.kicker}>Music</span>
        <strong>{isPlaying ? 'Playing' : 'Ready'}</strong>
      </div>

      <div className={styles.modeButtons}>
        <button
          type="button"
          className={mode === 'intro' ? styles.active : ''}
          onClick={() => changeMode('intro')}
        >
          Intro 33s
        </button>
        <button
          type="button"
          className={mode === 'full' ? styles.active : ''}
          onClick={() => changeMode('full')}
        >
          Full Theme
        </button>
      </div>

      <label className={styles.sliderLabel}>
        <span>Start / seek</span>
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
        onChange={(e) => setVolume(Number(e.target.value))}
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
    </section>
  );
}
