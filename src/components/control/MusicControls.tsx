'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
    audio.volume = volume;
    audio.playbackRate = playbackRate;
    audio.loop = shouldLoop && !!track.loopable;
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : (track.limitSeconds ?? INTRO_SECONDS));
    };

    const handleTimeUpdate = () => {
      const nextLimit = track.limitSeconds ?? audio.duration;
      if (track.limitSeconds && audio.currentTime >= track.limitSeconds) {
        audio.pause();
        audio.currentTime = 0;
        setCurrentTime(0);
        setIsPlaying(false);
        return;
      }
      setCurrentTime(Number.isFinite(nextLimit) ? Math.min(audio.currentTime, nextLimit) : audio.currentTime);
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
  }, [track.limitSeconds, track.loopable, track.src]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.loop = shouldLoop && !!track.loopable;
  }, [shouldLoop, track.loopable]);

  const seekTo = (nextTime: number) => {
    const boundedTime = Math.min(Math.max(nextTime, 0), maxTime);
    setCurrentTime(boundedTime);
    if (audioRef.current) audioRef.current.currentTime = boundedTime;
  };

  const changeSpeed = (nextRate: number) => {
    const roundedRate = Math.round(nextRate * 10) / 10;
    setPlaybackRate(Math.min(MAX_SPEED, Math.max(MIN_SPEED, roundedRate)));
  };

  const play = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (track.limitSeconds && audio.currentTime >= track.limitSeconds) {
      audio.currentTime = 0;
    }
    try {
      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error(`${track.label} playback failed:`, error);
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
            onChange={(e) => setShouldLoop(e.target.checked)}
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
